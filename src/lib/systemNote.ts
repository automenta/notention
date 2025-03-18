import { Note } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { systemLog } from './systemLog';
import { NoteImpl } from './note';
import * as z from 'zod';
import * as fs from 'fs';
import path from 'path';
import planningRules, { PlanningRule } from './planningRules';
import { initializeInitialTools } from './initialTools';
import idService from './idService';
import { NoteStorage, InMemoryNoteStorage, GraphDBNoteStorage } from './noteStorage';
import { migrateDataToGraphDB } from './dataMigration';
import { SettingsService } from './settingsService';
import React, { useCallback, useEffect, useState } from 'react';
import { ToolRegistry } from './toolRegistry';
import { executeTool } from './executor';
import { SAFE_DIRECTORY, ALLOWED_EXTENSIONS, ensureSafeDirectoryExists } from './fileUtils';

type Listener = () => void;
const listeners: Listener[] = [];
let systemNoteData: Note | undefined = undefined;
let noteStorage: NoteStorage = new InMemoryNoteStorage();
let hasMigratedData: boolean = false;
let llm: ChatOpenAI | null = null; // Cache the LLM instance

const initializeSystemNoteData = (): Note => {
    const newSystemNoteData: Note = {
        id: 'system',
        type: 'System',
        title: 'Netention System',
        content: {
            notes: new Map<string, Note>(),
            activeQueue: [],
            runningCount: 0,
            concurrencyLimit: 5,
            llm: null,
            toolRegistry: new ToolRegistry(),
            // executor: new Executor(), //Executor is now a function
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
    return newSystemNoteData;
};

const initialize = () => {
    if (localStorage.getItem('usePersistence') === 'true' && !hasMigratedData) {
        migrateDataToGraphDB();
        hasMigratedData = true;
    }

    // Initialize or update the LLM instance based on settings changes
    updateLLM();
};

const updateLLM = () => {
    const settings = SettingsService.getSettings();
    llm = new ChatOpenAI({
        apiKey: settings.apiKey,
        modelName: settings.modelName,
        temperature: settings.temperature,
    });
    systemLog.info(`LLM updated with model ${settings.modelName}`, 'SystemNote');
};

const ensureSystemNote = () => {
    if (!systemNoteData) {
        systemLog.warn('System Note was not initialized, bootstrapping with default.');
        systemNoteData = initializeSystemNoteData();
        initialize();
    }
};

// Centralized system note initialization
export const useSystemNote = () => {
    const [systemNote, setSystemNote] = useState<SystemNote | null>(null);

    const memoizedUpdateLLM = useCallback(() => {
        updateLLM();
    }, []);

    useEffect(() => {
        ensureSystemNote();

        const newSystemNote = new SystemNote(systemNoteData!, noteStorage);
        setSystemNote(newSystemNote);

        const unsubscribe = onSystemNoteChange(() => {
            setSystemNote(newSystemNote(systemNoteData!, noteStorage));
        });

        // Subscribe to settings changes to update the LLM
        const settingsSubscription = SettingsService.subscribe(memoizedUpdateLLM);

        return () => {
            unsubscribe();
            settingsSubscription(); // Unsubscribe from settings changes
        };
    }, [memoizedUpdateLLM]);

    return systemNote;
};

export const getSystemNote = () => {
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

    getLLM = () => {
        if (!llm) {
            updateLLM(); // Initialize LLM if it's not already initialized
        }
        return llm;
    }

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
        const llm = this.getLLM();

        if (!tool) {
            systemLog.error(`Tool with id ${toolId} not found.`, 'SystemNote');
            throw new Error(`Tool with id ${toolId} not found.`);
        }

        try {
            return await executeTool(tool, input, llm, toolImplementation);
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

ensureSafeDirectoryExists();
