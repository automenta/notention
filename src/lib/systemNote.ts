import { Note } from '../types';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { systemLog } from './systemLog';
import { NoteImpl } from './note';
import { z } from "zod";
import * as fs from 'fs'; // Import the fs module
import { executeTool } from './executor'; // Import the executeTool function
import { SerpAPI } from "langchain/tools";
import path from 'path';
import planningRules, { PlanningRule } from './planningRules';
import { initializeInitialTools } from './initialTools';
import idService from './idService'; // Import the IdService

type Listener = () => void;
const listeners: Listener[] = [];
let systemNoteData: Note | undefined = undefined;

// Initialize System Note - singleton pattern
export const initializeSystemNote = (llm: ChatOpenAI | any) => {
    if (systemNoteData) throw new Error('System Note already initialized');
    systemNoteData = {
        id: 'system',
        type: 'System',
        title: 'Netention System',
        content: {
            notes: new Map<string, Note>(),
            activeQueue: [],
            runningCount: 0,
            concurrencyLimit: 5,
            llm,
            tools: new Map<string, Note>(), // Initialize tools Map
            toolImplementations: new Map<string, Function>(), // Initialize tool implementations Map
        },
        status: 'active',
        priority: 100,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        references: [],
        description: 'The root note for the system.',
    };
    systemLog.info('System Note Initialized 🚀', 'SystemNote');
    // Start the system loop after initialization
    getSystemNote().runSystemLoop();

    // Register initial tools here (after SystemNote is created)
    registerInitialTools();
};

// Accessor for the System Note instance
export const getSystemNote = () => {
    if (!systemNoteData) {
        systemLog.warn('System Note was not initialized, bootstrapping with default. Ensure initializeSystemNote is called.', 'SystemNote');
        initializeSystemNote({} as ChatOpenAI); // Bootstrap if not initialized
    }
    return new SystemNote(systemNoteData!);
};

// SystemNote class - encapsulates system-level operations and state
class SystemNote {
    constructor(public data: Note) {
    }

    // CRUD operations for Notes
    addNote = (note: Note) => {
        this.data.content.notes.set(note.id, note);
        this.notify();
        systemLog.info(`📝 Added Note ${note.id}: ${note.title}`, 'SystemNote');
    };
    getNote = (id: string) => this.data.content.notes.get(id);
    getAllNotes = () => [...this.data.content.notes.values()];
    updateNote = (note: Note) => {
        this.data.content.notes.set(note.id, note);
        this.notify();
        systemLog.info(`🔄 Updated Note ${note.id}: ${note.title}`, 'SystemNote');
    };
    deleteNote = (id: string) => {
        this.data.content.notes.delete(id);
        this.data.content.activeQueue = this.data.content.activeQueue.filter(n => n !== id);
        this.notify();
        systemLog.info(`🗑️ Deleted Note ${id}`, 'SystemNote');
    };

    // Task queue management
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

    // LLM access
    getLLM = () => this.data.content.llm as ChatOpenAI;

    // Concurrency management
    incrementRunning = () => {
        this.data.content.runningCount++;
        this.notify();
    };

    decrementRunning = () => {
        this.data.content.runningCount--;
        this.notify();
    };
    canRun = () => this.data.content.runningCount < this.data.content.concurrencyLimit;

    // Apply planning rules
    private async applyPlanningRules(note: Note, order: 'before' | 'after') {
        for (const rule of planningRules) {
            if (rule.order === order) {
                try {
                    if (rule.condition(note, this)) {
                        systemLog.info(`Applying planning rule (${order}): ${rule.name} to note ${note.title}`, 'SystemNote');
                        await rule.action(note, this);
                    }
                } catch (error: any) {
                    systemLog.error(`Error applying planning rule ${rule.name} to note ${note.title}: ${error.message}`, 'SystemNote');
                }
            }
        }
    }

    // Run a specific note
    runNote = async (noteId: string) => {
        const note = this.getNote(noteId);
        if (note) {
            // Apply 'before' planning rules
            await this.applyPlanningRules(note, 'before');

            const noteImpl = new NoteImpl(note);
            await noteImpl.run();

            // Apply 'after' planning rules
            await this.applyPlanningRules(note, 'after');
        } else {
            systemLog.error(`🔥 Note with ID ${noteId} not found, cannot run.`, 'SystemNote');
        }
    };

    registerTool(toolNote: Note, toolImplementation?: Function) {
        // Deprecated: old way of registering tools
        systemLog.warn('Deprecated: registerTool with toolImplementation.  Use registerTool with a tool definition instead.', 'SystemNote');
        this.registerToolDefinition({ ...toolNote, type: 'custom', implementation: toolImplementation });
    }

    registerToolDefinition(toolDefinition: Note & { type: 'custom' | 'langchain' | 'api', implementation?: Function | any }) {
        const toolNote = toolDefinition as Note;
        this.data.content.tools.set(toolNote.id, toolNote);
        if (toolDefinition.type === 'custom' && toolDefinition.implementation) {
            this.data.content.toolImplementations.set(toolNote.id, toolDefinition.implementation);
        }
        this.notify();
        systemLog.info(`🔨 Registered Tool ${toolNote.id}: ${toolNote.title}`, 'SystemNote');

    }

    getTool(id: string): Note | undefined {
        return this.data.content.tools.get(id);
    }

    getAllTools(): Note[] {
        return Array.from(this.data.content.tools.values());
    }

    getToolImplementation(id: string): Function | undefined {
        return this.data.content.toolImplementations.get(id);
    }

    // Execute a tool
    async executeTool(toolId: string, input: any): Promise<any> {
        const tool = this.getTool(toolId);
        const toolImplementation = this.getToolImplementation(toolId);

        if (!tool) {
            systemLog.error(`Tool with id ${toolId} not found.`, 'SystemNote');
            throw new Error(`Tool with id ${toolId} not found.`);
        }

        try {
            switch (tool.type) {
                case 'custom':
                    if (!toolImplementation) {
                        systemLog.warn(`No implementation found for tool ${toolId}, using default executor.`, 'SystemNote');
                    }
                    return await executeTool(tool, input, toolImplementation);
                case 'langchain':
                    // Assuming the 'implementation' field holds the LangChain tool instance
                    if (!tool.implementation) {
                        throw new Error(`LangChain tool implementation missing for tool ${toolId}`);
                    }
                    return await tool.implementation.call(input); // Or however you call the LangChain tool
                case 'api':
                    // Implement API call logic here (e.g., using fetch)
                    systemLog.warn(`API Tool not yet implemented ${toolId}`, 'SystemNote');
                    throw new Error(`API Tool not yet implemented ${toolId}`);
                default:
                    throw new Error(`Unknown tool type: ${tool.type}`);
            }
        } catch (error: any) {
            systemLog.error(`Error executing tool ${toolId}: ${error.message}`, 'SystemNote');
            throw error;
        }
    }



    // Notification system for UI updates
    private notify = () => listeners.forEach(l => l());
}

// Hook for subscribing to SystemNote changes
export const onSystemNoteChange = (listener: Listener) => {
    listeners.push(listener);
    return () => listeners.splice(listeners.indexOf(listener), 1);
};

// Define the safe directory
const SAFE_DIRECTORY = path.resolve('./safe_files');

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.json', '.js'];

// Ensure the safe directory exists
if (!fs.existsSync(SAFE_DIRECTORY)) {
    fs.mkdirSync(SAFE_DIRECTORY);
}
