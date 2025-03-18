import { Note } from '../../types';
import idService from '../idService';
import { SystemNote, getSystemNote } from '../systemNote';
import { systemLog } from '../systemLog';
import { ChatOpenAI } from 'langchain/chat_models/openai';

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

    const summarizationToolImplementation = async (input: any) => {
        try {
            const llm = systemNote.getLLM();
            if (!llm) {
                systemLog.warn('LLM not initialized, cannot summarize.', 'SummarizationTool');
                return { summary: 'LLM not initialized. Please check your settings.' };
            }

            const prompt = `Summarize the following text: ${input.text}`;
            const summary = await llm.invoke(prompt);
            return { summary: summary };
        } catch (error: any) {
            systemLog.error(`Error summarizing text: ${error.message}`, 'SummarizationTool');
            return { summary: `Error summarizing text: ${error.message}` };
        }
    };
    systemNote.registerToolDefinition({ ...summarizationToolData, implementation: summarizationToolImplementation, type: 'langchain' });
    systemLog.info(`🔨 Registered Tool ${summarizationToolData.id}: ${summarizationToolData.title}`, 'SystemNote');
};
