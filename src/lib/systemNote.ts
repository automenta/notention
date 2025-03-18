import { Note } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { systemLog } from './systemLog';
import { NoteImpl } from './note';
import * as z from 'zod';
import * as fs from 'fs';
import { executeTool } from './executor';
import path from 'path';
import planningRules, { PlanningRule } from './planningRules';
import { initializeInitialTools } from './initialTools';
import idService from './idService';
import { NoteStorage, InMemoryNoteStorage, GraphDBNoteStorage } from './noteStorage';
import { migrateDataToGraphDB } from './dataMigration';
import { SettingsService } from './settingsService';
import React from 'react';

type Listener = () => void;
const listeners: Listener[] = [];
let systemNoteData: Note | undefined = undefined;
let noteStorage: NoteStorage = new InMemoryNoteStorage();
let hasMigratedData: boolean = false;

class ToolRegistry {
    private tools: Map<string, Note>;
    private toolImplementations: Map<string, Function>;

    constructor() {
        this.tools = new Map<string, Note>();
        this.toolImplementations = new Map<string, Function>();
    }

    registerTool(toolDefinition: Note & { type: 'custom' | 'langchain' | 'api', implementation?: Function | any }) {
        const toolNote = toolDefinition as Note;
        this.tools.set(toolNote.id, toolNote);
        if (toolDefinition.type === 'custom' && toolDefinition.implementation) {
            this.toolImplementations.set(toolDefinition.id, toolDefinition.implementation);
        }
        systemLog.info(`🔨 Registered Tool ${toolNote.id}: ${toolNote.title}`, 'SystemNote');
    }

    getTool(id: string): Note | undefined {
        return this.tools.get(id);
    }

    getToolImplementation(id: string): Function | undefined {
        return this.toolImplementations.get(id);
    }

    getAllTools(): Note[] {
        return Array.from(this.tools.values());
    }
}

class Executor {
    async executeTool(tool: Note, input: any, toolImplementation?: Function): Promise<any> {
        systemLog.info(`Executing tool ${tool.id}: ${tool.title}`, 'Executor');

        if (toolImplementation) {
            try {
                systemLog.debug(`Executing tool ${tool.id} with custom implementation.`, 'Executor');
                return await toolImplementation(input);
            } catch (error: any) {
                systemLog.error(`Error executing custom implementation for tool ${tool.id}: ${error.message}`, 'Executor');
                throw new Error(`Error executing custom implementation for tool ${tool.id}: ${error.message}`);
            }
        } else {
            systemLog.warn(`No implementation found for tool ${tool.id}, using default executor.`, 'Executor');
            return { result: `Tool ${tool.id} executed successfully (default executor).` };
        }
    }
}

// Centralized system note initialization
export const useSystemNote = () => {
    const [systemNote, setSystemNote] = React.useState<SystemNote | null>(null);

    React.useEffect(() => {
        let defaultLLM: ChatOpenAI | any;
        try {
            const settings = SettingsService.getSettings();
            defaultLLM = new ChatOpenAI({
                apiKey: settings.apiKey,
                modelName: settings.modelName,
                temperature: settings.temperature,
            });
            systemLog.info(`LLM Initialized with model ${settings.modelName}`, 'SystemNote');
        } catch (error: any) {
            systemLog.error(`Error initializing LLM: ${error.message}.  Ensure you have an OPENAI_API_KEY set.`, 'SystemNote');
            defaultLLM = null;
        }

        if (!systemNoteData) {
            systemNoteData = {
                id: 'system',
                type: 'System',
                title: 'Netention System',
                content: {
                    notes: new Map<string, Note>(),
                    activeQueue: [],
                    runningCount: 0,
                    concurrencyLimit: 5,
                    llm: defaultLLM,
                    toolRegistry: new ToolRegistry(),
                    executor: new Executor(),
                },
                status: 'active',
                priority: 100,
                createdAt: new Date().toISOString(),
                updatedAt: null,
                references: [],
                description: 'The root note for the system.',
                inputSchema: undefined,
                outputSchema: undefined,
                config: undefined,
                logic: undefined
            };
            systemLog.info('System Note Initialized 🚀', 'SystemNote');
            initializeInitialTools();
        }

        if (localStorage.getItem('usePersistence') === 'true' && !hasMigratedData) {
            migrateDataToGraphDB();
            hasMigratedData = true;
        }

        const newSystemNote = new SystemNote(systemNoteData!, noteStorage);
        setSystemNote(newSystemNote);

        const unsubscribe = onSystemNoteChange(() => {
            setSystemNote(new SystemNote(systemNoteData!, noteStorage));
        });

        return () => unsubscribe();
    }, []);

    return systemNote;
};

export const initializeSystemNote = (llm: ChatOpenAI | any, usePersistence: boolean = false) => {
    if (systemNoteData) throw new Error('System Note already initialized');

    if (usePersistence) {
        noteStorage = new GraphDBNoteStorage();
        systemLog.info('Using GraphDBNoteStorage for persistence.', 'SystemNote');
    } else {
        noteStorage = new InMemoryNoteStorage();
        systemLog.info('Using InMemoryNoteStorage (default).', 'SystemNote');
    }

    let defaultLLM: ChatOpenAI | any;
    try {
        const settings = SettingsService.getSettings();
        defaultLLM = new ChatOpenAI({
            apiKey: settings.apiKey,
            modelName: settings.modelName,
            temperature: settings.temperature,
        });
        systemLog.info(`LLM Initialized with model ${settings.modelName}`, 'SystemNote');
    } catch (error: any) {
        systemLog.error(`Error initializing LLM: ${error.message}.  Ensure you have an OPENAI_API_KEY set.`, 'SystemNote');
        defaultLLM = null;
    }

    systemNoteData = {
        id: 'system',
        type: 'System',
        title: 'Netention System',
        content: {
            notes: new Map<string, Note>(),
            activeQueue: [],
            runningCount: 0,
            concurrencyLimit: 5,
            llm: llm || defaultLLM,
        },
        status: 'active',
        priority: 100,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        references: [],
        description: 'The root note for the system.',
        inputSchema: undefined,
        outputSchema: undefined,
        config: undefined,
        logic: undefined
    };
    systemLog.info('System Note Initialized 🚀', 'SystemNote');

    const toolRegistry = new ToolRegistry();
    const executor = new Executor();

    systemNoteData.content.toolRegistry = toolRegistry;
    systemNoteData.content.executor = executor;

    initializeInitialTools();
};

export const getSystemNote = () => {
    if (!systemNoteData) {
        systemLog.warn('System Note was not initialized, bootstrapping with default. Ensure initializeSystemNote is called.', 'SystemNote');
        initializeSystemNote({} as ChatOpenAI);
    }

    if (localStorage.getItem('usePersistence') === 'true' && !hasMigratedData) {
        migrateDataToGraphDB();
        hasMigratedData = true;
    }

    return new SystemNote(systemNoteData!, noteStorage);
};

class SystemNote {
    constructor(public data: Note, private noteStorage: NoteStorage) {
    }

    addNote = async (note: Note) => {
        await this.noteStorage.addNote(note);
        this.data.content.notes.set(note.id, note);
        this.notify();
        systemLog.info(`📝 Added Note ${note.id}: ${note.title}`, 'SystemNote');
    };
    getNote = async (id: string) => {
        const note = await this.noteStorage.getNote(id);
        return note;
    }
    getAllNotes = async () => {
        return await this.noteStorage.getAllNotes();
    }
    updateNote = async (note: Note) => {
        await this.noteStorage.updateNote(note);
        this.data.content.notes.set(note.id, note);
        this.notify();
        systemLog.info(`🔄 Updated Note ${note.id}: ${note.title}`, 'SystemNote');
    };
    deleteNote = async (id: string) => {
        await this.noteStorage.deleteNote(id);
        this.data.content.notes.delete(id);
        this.data.content.activeQueue = this.data.content.activeQueue.filter(n => n !== id);
        this.notify();
        systemLog.info(`🗑️ Deleted Note ${id}`, 'SystemNote');
    };

    enqueueNote = (id: string) => {
        if (!this.data.content.activeQueue.includes(id)) {
            this.data.content.activeQueue.push(id);
            this.notify();
            const note = this.getNote(id);
            systemLog.info(`➡️ Enqueued Note ${note.id}: ${note?.title}`, 'SystemNote');
        }
    };
    dequeueNote = () => {
        if (!this.data.content.activeQueue.length) return;
        this.data.content.activeQueue.sort((a, b) => (this.getNote(b)?.priority ?? 0) - (this.getNote(a)?.priority ?? 0));
        const noteId = this.data.content.activeQueue.shift();
        if (noteId) {
            const note = this.getNote(noteId);
            systemLog.info(`⬅️ Dequeued Note ${noteId}: ${note?.title}`, 'SystemNote');
        }
        return noteId;
    };

    getLLM = () => this.data.content.llm as ChatOpenAI;

    incrementRunning = () => {
        this.data.content.runningCount++;
        this.notify();
    };

    decrementRunning = () => {
        this.data.content.runningCount--;
        this.notify();
    };
    canRun = () => this.data.content.runningCount < this.data.content.concurrencyLimit;

    private async applyPlanningRules(note: Note, order: 'before' | 'after') {
        for (const rule of planningRules) {
            if (rule.order === order) {
                try {
                    let conditionMet = false;
                    if (rule.condition) {
                        conditionMet = rule.condition(note, this);
                    }

                    if (conditionMet) {
                        systemLog.info(`Applying planning rule (${order}): ${rule.name} to note ${note.title}`, 'SystemNote');
                        if (rule.action) {
                            await rule.action(note, this);
                        }
                    }
                } catch (error: any) {
                    systemLog.error(`Error applying planning rule ${rule.name} to note ${note.title}: ${error.message}`, 'SystemNote');
                }
            }
        }
    }

    runNote = async (noteId: string) => {
        const note = await this.getNote(noteId);
        if (note) {
            await this.applyPlanningRules(note, 'before');

            const noteImpl = new NoteImpl(note);
            await noteImpl.run();

            await this.applyPlanningRules(note, 'after');
        } else {
            systemLog.error(`🔥 Note with ID ${noteId} not found, cannot run.`, 'SystemNote');
        }
    };

    registerTool(toolNote: Note, toolImplementation?: Function) {
        systemLog.warn('Deprecated: registerTool with toolImplementation.  Use registerTool with a tool definition instead.', 'SystemNote');
        this.registerToolDefinition({ ...toolNote, type: 'custom', implementation: toolImplementation });
    }

    registerToolDefinition(toolDefinition: Note & { type: 'custom' | 'langchain' | 'api', implementation?: Function | any }) {
        const toolRegistry = this.data.content.toolRegistry as ToolRegistry;
        toolRegistry.registerTool(toolDefinition);
        this.notify();
    }

    getTool(id: string): Note | undefined {
         const toolRegistry = this.data.content.toolRegistry as ToolRegistry;
         return toolRegistry.getTool(id);
    }

    getAllTools(): Note[] {
        const toolRegistry = this.data.content.toolRegistry as ToolRegistry;
        return toolRegistry.getAllTools();
    }

    getToolImplementation(id: string): Function | undefined {
        const toolRegistry = this.data.content.toolRegistry as ToolRegistry;
        return toolRegistry.getToolImplementation(id);
    }

    async executeTool(toolId: string, input: any): Promise<any> {
        const tool = this.getTool(toolId);
        const toolImplementation = this.getToolImplementation(toolId);
        const executor = this.data.content.executor as Executor;

        if (!tool) {
            systemLog.error(`Tool with id ${toolId} not found.`, 'SystemNote');
            throw new Error(`Tool with id ${toolId} not found.`);
        }

        try {
            return await executor.executeTool(tool, input, toolImplementation);
        } catch (error: any) {
            systemLog.error(`Error executing tool ${toolId}: ${error.message}`, 'SystemNote');
            throw error;
        }
    }

    private notify = () => listeners.forEach(l => l());
}

export const onSystemNoteChange = (listener: Listener) => {
    listeners.push(listener);
    return () => listeners.splice(listeners.indexOf(listener), 1);
};

const SAFE_DIRECTORY = path.resolve('./safe_files');

const ALLOWED_EXTENSIONS = ['.txt', '.md', '.json', '.js'];

if (!fs.existsSync(SAFE_DIRECTORY)) {
    fs.mkdirSync(SAFE_DIRECTORY);
}
