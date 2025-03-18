import { Note } from '../../types';
import idService from '../idService';
import { SystemNote, getSystemNote } from '../systemNote';
import { systemLog } from '../systemLog';

/**
 * Registers the user interaction tool with the system.
 * @param {SystemNote} systemNote - The system note instance.
 */
export const registerUserInteractionTool = (systemNote: SystemNote) => {
    const userInteractionToolData: Note = {
        id: idService.generateId(),
        type: 'Tool',
        title: 'User Interaction Tool',
        content: 'A tool to prompt the user for input.',
        logic: {
            "steps": [
                {
                    "id": "prompt",
                    "type": "user_input",
                    "input": "{prompt}"
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
                prompt: {
                    type: 'string',
                    description: 'The prompt to display to the user.',
                    inputType: 'textarea'
                }
            },
            required: ['prompt']
        }),
        outputSchema: JSON.stringify({
            type: 'object',
            properties: {
                userInput: {
                    type: 'string',
                    description: 'The input provided by the user.'
                }
            },
            required: ['userInput']
        }),
        description: 'Prompts the user for input.',
    };

    const userInteractionToolImplementation = async (input: any) => {
        const userInput = window.prompt(input.prompt);
        return { userInput: userInput || '' };
    };

    systemNote.registerToolDefinition({ ...userInteractionToolData, implementation: userInteractionToolImplementation, type: 'custom' });
    systemLog.info(`🔨 Registered Tool ${userInteractionToolData.id}: ${userInteractionToolData.title}`, 'SystemNote');
};
