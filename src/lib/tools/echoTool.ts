import { Note } from '../../types';
import idService from '../idService';
import { SystemNote, getSystemNote } from '../systemNote';
import { RunnablePassthrough } from "@langchain/core/runnables";
import { systemLog } from '../systemLog';

export const registerEchoTool = (systemNote: SystemNote) => {
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
    systemLog.info(`🔨 Registered Tool ${echoToolNoteData.id}: ${echoToolNoteData.title}`, 'SystemNote');
};
