import { Note } from '../../types';
import idService from '../idService';
import { SystemNote, getSystemNote } from '../systemNote';
import { systemLog } from '../systemLog';
import { ChatOpenAI } from 'langchain/chat_models/openai';

export const registerGenerateTaskLogicTool = (systemNote: SystemNote) => {
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
    systemNote.registerToolDefinition({ ...generateTaskLogicToolData, implementation: generateTaskLogicToolImplementation, type: 'custom' });
    systemLog.info(`🔨 Registered Tool ${generateTaskLogicToolData.id}: ${generateTaskLogicToolData.title}`, 'SystemNote');
};
