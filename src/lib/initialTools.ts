import { Note } from '../types';
import { SerpAPI } from "langchain/tools";
import idService from './idService';
import { getSystemNote } from './systemNote';
import { RunnablePassthrough } from "@langchain/core/runnables";
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { systemLog } from './systemLog';
import * as fs from 'fs'; // Import the fs module
import path from 'path';

// Define the safe directory
const SAFE_DIRECTORY = path.resolve('./safe_files');

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.json', '.js'];

// Ensure the safe directory exists
if (!fs.existsSync(SAFE_DIRECTORY)) {
    fs.mkdirSync(SAFE_DIRECTORY);
}

// Function to sanitize filenames to prevent path traversal attacks
const sanitizeFilename = (filename: string): string => {
    const sanitized = path.basename(filename); // Get the base filename
    return sanitized.replace(/[^a-zA-Z0-9._-]/g, ''); // Remove any characters that are not alphanumeric, '.', '_', or '-'
};

export const initializeInitialTools = () => {
    const systemNote = getSystemNote();

    // 1. Echo Tool Note Definition (JSON - in memory)
    const echoToolNoteData: Note = {
        id: idService.generateId(),
        type: 'Tool',
        title: 'Echo Tool',
        content: 'A simple tool that echoes back the input.',
        logic: {
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
        },
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
        description: 'Echoes the input text.',
    };
    const echoToolImplementation = async (input: any) => {
        return { output: input.input };
    };
    systemNote.registerToolDefinition({ ...echoToolNoteData, implementation: echoToolImplementation, type: 'custom' }); // Register Echo Tool

    // 2. Web Search Tool (SerpAPI)
    const webSearchToolData: Note = {
        id: idService.generateId(),
        type: 'Tool',
        title: 'Web Search Tool',
        content: 'A tool to search the web using SerpAPI.',
        logic: {
            "steps": [
                {
                    "id": "search",
                    "type": "serpapi",
                    "input": "{query}"
                }
            ],
        },
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
        description: 'Searches the web using SerpAPI.',
    };

    const webSearchToolImplementation = async (input: any) => {
        const serpApiKey = localStorage.getItem('serpApiKey');

        if (!serpApiKey) {
            systemLog.error('SerpAPI key not found in settings.', 'WebSearchTool');
            return { results: 'SerpAPI key not found. Please configure it in the <a href="/settings">settings</a>.' };
        }

        const serpAPI = new SerpAPI(serpApiKey);
        const results = await serpAPI.call(input.query);
        return { results: results };
    };
    systemNote.registerToolDefinition({ ...webSearchToolData, implementation: webSearchToolImplementation, type: 'custom' });

    // 3. File Operations Tool (Basic - READ/WRITE - SECURITY WARNING)
    const fileOperationsToolData: Note = {
        id: idService.generateId(),
        type: 'Tool',
        title: 'File Operations Tool',
        content: `A tool to read and write local files within the safe directory: ${SAFE_DIRECTORY} (SECURITY WARNING).`,
        logic: {
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
        },
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
                    enum: ['read', 'write', 'createDirectory', 'deleteFile'],
                    description: 'Action to perform',
                    inputType: 'select', // Specify inputType as select
                    options: ['read', 'write', 'createDirectory', 'deleteFile'] // Add options for the select input
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
        description: 'Reads and writes local files within a safe directory (SECURITY WARNING).',
    };

    const fileOperationsToolImplementation = async (input: any) => {
        try {
            if (!input || !input.filename || !input.action) {
                throw new Error('Invalid input: Action and filename are required.');
            }

            const action = input.action;
            let filename = sanitizeFilename(input.filename); // Sanitize the filename
            filename = path.resolve(SAFE_DIRECTORY, filename); // Resolve the full path

            // More robust check to ensure the resolved path is within the safe directory
            if (!filename.startsWith(SAFE_DIRECTORY + path.sep)) {
                throw new Error('Access denied: Filename is outside the safe directory.');
            }

            // Validate file extension
            const ext = path.extname(filename).toLowerCase();
            if (action !== 'createDirectory' && !ALLOWED_EXTENSIONS.includes(ext)) {
                throw new Error(`Access denied: Invalid file extension. Allowed extensions are: ${ALLOWED_EXTENSIONS.join(', ')}`);
            }

            if (action === 'read') {
                const content = fs.readFileSync(filename, 'utf-8');
                return { result: content };
            } else if (action === 'write') {
                if (!input.content) {
                    throw new Error('Invalid input: Content is required for write action.');
                }
                fs.writeFileSync(filename, input.content, 'utf-8');
                return { result: 'File written successfully' };
            } else if (action === 'createDirectory') {
                fs.mkdirSync(filename, { recursive: true });
                return { result: 'Directory created successfully' };
            } else if (action === 'deleteFile') {
                fs.unlinkSync(filename);
                return { result: 'File deleted successfully' };
            } else {
                throw new Error('Invalid action');
            }
        } catch (error: any) {
            systemLog.error(`File operation failed: ${error.message}`, 'FileOperationsTool');
            return { result: `Error: ${error.message}` };
        }
    };
    systemNote.registerToolDefinition({ ...fileOperationsToolData, implementation: fileOperationsToolImplementation, type: 'custom' });

    // 4. Generate Task Logic Tool
    const generateTaskLogicToolData: Note = {
        id: idService.generateId(),
        type: 'Tool',
        title: 'Generate Task Logic Tool',
        content: 'A tool to generate task logic (JSON) using the LLM, based on a task description.',
        logic: {
            "steps": [
                {
                    "id": "generate",
                    "type": "llm",
                    "input": "{taskDescription}"
                }
            ],
        },
        status: 'active',
        priority: 50,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        references: [],
        inputSchema: JSON.stringify({
            type: 'object',
            properties: {
                taskDescription: {
                    type: 'string',
                    description: 'Description of the task for which to generate logic.',
                    inputType: 'textarea'
                }
            },
            required: ['taskDescription']
        }),
        outputSchema: JSON.stringify({
            type: 'object',
            properties: {
                taskLogic: {
                    type: 'string',
                    description: 'Generated task logic in JSON format.'
                }
            },
            required: ['taskLogic']
        }),
        description: 'Generates task logic (JSON) using the LLM, based on a task description.',
    };

    const generateTaskLogicToolImplementation = async (input: any) => {
        const llm = systemNote.getLLM();
        if (!llm) {
            systemLog.warn('LLM not initialized, cannot generate logic.', 'GenerateTaskLogicTool');
            throw new Error('LLM not initialized.');
        }

        const prompt = `Generate a LangChain Runnable steps array (JSON format) for the following task: ${input.taskDescription}. Include a step to use the "web-search-tool" if appropriate.`;
        try {
            const taskLogic = await llm.invoke(prompt);
            return { taskLogic: taskLogic };
        } catch (error: any) {
            systemLog.error(`Error generating task logic: ${error.message}`, 'GenerateTaskLogicTool');
            throw error;
        }
    };
    systemNote.registerToolDefinition({ ...generateTaskLogicToolData, implementation: generateTaskLogicToolImplementation, type: 'langchain' });

    // 5. Example API Tool (Simple GET Request)
    const apiToolData: Note = {
        id: idService.generateId(),
        type: 'Tool',
        title: 'Joke API Tool',
        content: 'Fetches a random joke from an API.',
        logic: 'https://official-joke-api.appspot.com/random_joke', // API endpoint
        status: 'active',
        priority: 50,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        references: [],
        inputSchema: JSON.stringify({}), // No input required
        outputSchema: JSON.stringify({
            type: 'object',
            properties: {
                setup: { type: 'string', description: 'Joke setup' },
                punchline: { type: 'string', description: 'Joke punchline' }
            },
            required: ['setup', 'punchline']
        }),
        description: 'Fetches a random joke from the Joke API.',
    };
    systemNote.registerToolDefinition({ ...apiToolData, type: 'api' });

    // 6. Summarization Tool
    const summarizationToolData: Note = {
        id: idService.generateId(),
        type: 'Tool',
        title: 'Summarization Tool',
        content: 'A tool to summarize text using the LLM.',
        logic: {
            "steps": [
                {
                    "id": "summarize",
                    "type": "llm",
                    "input": "{text}"
                }
            ],
        },
        status: 'active',
        priority: 50,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        references: [],
        inputSchema: JSON.stringify({
            type: 'object',
            properties: {
                text: {
                    type: 'string',
                    description: 'Text to summarize',
                    inputType: 'textarea'
                }
            },
            required: ['text']
        }),
        outputSchema: JSON.stringify({
            type: 'object',
            properties: {
                summary: {
                    type: 'string',
                    description: 'Summary of the text'
                }
            },
            required: ['summary']
        }),
        description: 'Summarizes text using the LLM.',
    };

    const summarizationToolImplementation = async (input: any) => {
        const llm = systemNote.getLLM();
        if (!llm) {
            systemLog.warn('LLM not initialized, cannot summarize.', 'SummarizationTool');
            throw new Error('LLM not initialized.');
        }

        const prompt = `Summarize the following text: ${input.text}`;
        try {
            const summary = await llm.invoke(prompt);
            return { summary: summary };
        } catch (error: any) {
            systemLog.error(`Error summarizing text: ${error.message}`, 'SummarizationTool');
            throw error;
        }
    };
    systemNote.registerToolDefinition({ ...summarizationToolData, implementation: summarizationToolImplementation, type: 'langchain' });

    systemLog.info('Initial tools registered.', 'SystemNote');
};
