import { Note } from '../../types';
import idService from '../idService';
import { SystemNote, getSystemNote } from '../systemNote';
import { systemLog } from '../systemLog';
import { ChatOpenAI } from 'langchain/chat_models/openai';

/**
 * Registers the summarization tool with the system.
 * @param {SystemNote} systemNote - The system note instance.
 */
export const registerSummarizationTool = (systemNote: SystemNote) => {
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

    /**
     * Implementation for the summarization tool.
     * @param {any} input - The input to the tool, containing the text to summarize.
     * @returns {Promise<{ summary: string }>} - A promise that resolves with the summary of the text.
     */
    const summarizationToolImplementation = async (input: any): Promise<{ summary: string }> => {
        try {
            const llm: ChatOpenAI = systemNote.getLLM();
            if (!llm) {
                systemLog.warn('LLM not initialized, cannot summarize.', 'SummarizationTool');
                return { summary: 'LLM not initialized. Please check your settings.' };
            }

            const prompt: string = `Summarize the following text: ${input.text}`;
            const summary: string = await llm.invoke(prompt);
            return { summary: summary };
        } catch (error: any) {
            systemLog.error(`Error summarizing text: ${error.message}`, 'SummarizationTool');
            return { summary: `Error summarizing text: ${error.message}` };
        }
    };
    systemNote.registerToolDefinition({ ...summarizationToolData, implementation: summarizationToolImplementation, type: 'langchain' });
    systemLog.info(`🔨 Registered Tool ${summarizationToolData.id}: ${summarizationToolData.title}`, 'SystemNote');
};
