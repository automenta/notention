import { Note } from '../types';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { systemLog } from './systemLog';
import { NoteImpl } from './note';
import { z } from "zod";
import * as fs from 'fs'; // Import the fs module
import { executeTool } from './executor'; // Import the executeTool function
import { SerpAPI } from "langchain/tools";
import path from 'path';

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

    // Run a specific note
    runNote = async (noteId: string) => {
        const note = this.getNote(noteId);
        if (note) {
            const noteImpl = new NoteImpl(note);
            await noteImpl.run();
        } else {
            systemLog.error(`🔥 Note with ID ${noteId} not found, cannot run.`, 'SystemNote');
        }
    };

    // System Loop - Dequeue and Run Notes
    runSystemLoop = async () => {
        const loop = async () => {
            while (this.canRun()) {
                const nextNoteId = this.dequeueNote();
                if (nextNoteId) {
                    this.incrementRunning();
                    await this.runNote(nextNoteId);
                    this.decrementRunning();
                } else {
                    break; // No more notes in queue
                }
            }
            setTimeout(loop, 1000); // Run loop every 1 second
        };
        loop(); // Start the loop
        systemLog.info('System Loop Started 🔄', 'SystemNote');
    };

    registerTool(toolNote: Note, toolImplementation?: Function) {
        this.data.content.tools.set(toolNote.id, toolNote);
        if (toolImplementation) {
            this.data.content.toolImplementations.set(toolNote.id, toolImplementation);
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

        if (!toolImplementation) {
            systemLog.warn(`No implementation found for tool ${toolId}, using default executor.`, 'SystemNote');
        }

        try {
            return await executeTool(tool, input, toolImplementation);
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

// Ensure the safe directory exists
if (!fs.existsSync(SAFE_DIRECTORY)) {
    fs.mkdirSync(SAFE_DIRECTORY);
}

const registerInitialTools = () => {
    const systemNote = getSystemNote();

    // 1. Echo Tool Note Definition (JSON - in memory)
    const echoToolNoteData: Note = {
        id: 'echo-tool',
        type: 'Tool',
        title: 'Echo Tool',
        content: 'A simple tool that echoes back the input.',
        logic: JSON.stringify({
            "steps": [
                {
                    "id": "echo",
                    "type": "passthrough", // Use RunnablePassthrough for simple echo
                    "runnable": {
                        "constructor": "RunnablePassthrough",
                        "kwargs": {}
                    },
                    "input": "{input}" // Pass input through
                }
            ],
        }),
        status: 'active',
        priority: 50,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        references: [],
        inputSchema: JSON.stringify({ //Basic input schema for the tool
            type: 'object',
            properties: {
                input: {
                    type: 'string',
                    description: 'Text to echo',
                    inputType: 'textarea' // Specify inputType as textarea
                }
            },
            required: ['input']
        }),
        outputSchema: JSON.stringify({  //Basic output schema for the tool
            type: 'object',
            properties: {
                output: { type: 'string', description: 'Echoed text' }
            },
            required: ['output']
        }),
    };
    const echoToolImplementation = async (input: any) => {
        return { output: input.input };
    };
    systemNote.registerTool(echoToolNoteData, echoToolImplementation); // Register Echo Tool

    // 2. Web Search Tool (SerpAPI)
    const webSearchToolData: Note = {
        id: 'web-search-tool',
        type: 'Tool',
        title: 'Web Search Tool',
        content: 'A tool to search the web using SerpAPI.',
        logic: JSON.stringify({
            "steps": [
                {
                    "id": "search",
                    "type": "serpapi",
                    "input": "{query}"
                }
            ],
        }),
        status: 'active',
        priority: 50,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        references: [],
        inputSchema: JSON.stringify({
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' }
            },
            required: ['query']
        }),
        outputSchema: JSON.stringify({
            type: 'object',
            properties: {
                results: { type: 'array', description: 'Search results' }
            }
        }),
    };

    const webSearchToolImplementation = async (input: any) => {
        const serpAPI = new SerpAPI(process.env.SERPAPI_API_KEY);
        const results = await serpAPI.call(input);
        return { results: results };
    };
    systemNote.registerTool(webSearchToolData, webSearchToolImplementation);

    // 3. File Operations Tool (Basic - READ/WRITE - SECURITY WARNING)
    const fileOperationsToolData: Note = {
        id: 'file-operations-tool',
        type: 'Tool',
        title: 'File Operations Tool',
        content: `A tool to read and write local files within the safe directory: ${SAFE_DIRECTORY} (SECURITY WARNING).`,
        logic: JSON.stringify({
            "steps": [
                {
                    "id": "read-file",
                    "type": "passthrough",
                    "input": "{filename}"
                },
                {
                    "id": "write-file",
                    "type": "passthrough",
                    "input": "{filename, content}"
                }
            ],
        }),
        status: 'active',
        priority: 50,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        references: [],
        inputSchema: JSON.stringify({
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['read', 'write'],
                    description: 'Action to perform',
                    inputType: 'select', // Specify inputType as select
                    options: ['read', 'write'] // Add options for the select input
                },
                filename: { type: 'string', description: 'Filename' },
                content: { type: 'string', description: 'Content to write (for write action)' }
            },
            required: ['action', 'filename']
        }),
        outputSchema: JSON.stringify({
            type: 'object',
            properties: {
                result: { type: 'string', description: 'Result of the operation' }
            }
        }),
    };

    const fileOperationsToolImplementation = async (input: any) => {
        try {
            const filename = path.resolve(SAFE_DIRECTORY, input.filename);

            // Check if the resolved path is within the safe directory
            if (!filename.startsWith(SAFE_DIRECTORY)) {
                throw new Error('Access denied: Filename is outside the safe directory.');
            }

            if (input.action === 'read') {
                const content = fs.readFileSync(filename, 'utf-8');
                return { result: content };
            } else if (input.action === 'write') {
                fs.writeFileSync(filename, input.content, 'utf-8');
                return { result: 'File written successfully' };
            } else {
                throw new Error('Invalid action');
            }
        } catch (error: any) {
            systemLog.error(`File operation failed: ${error.message}`, 'FileOperationsTool');
            return { result: `Error: ${error.message}` };
        }
    };
    systemNote.registerTool(fileOperationsToolData, fileOperationsToolImplementation);

    systemLog.info('Initial tools registered.', 'SystemNote');
};
