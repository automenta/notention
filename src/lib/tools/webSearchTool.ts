import { Note } from '../../types';
import idService from '../idService';
import { SystemNote, getSystemNote } from '../systemNote';
import { SerpAPI } from "langchain/tools";
import { systemLog } from '../systemLog';

export const registerWebSearchTool = (systemNote: SystemNote) => {
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
        try {
            const settingsString = localStorage.getItem('settings');
            const settings = settingsString ? JSON.parse(settingsString) : null;
            const serpApiKey = settings ? settings.serpApiKey : null;

            if (!serpApiKey) {
                systemLog.error('SerpAPI key not found in settings.', 'WebSearchTool');
                return { results: 'SerpAPI key not found. Please configure it in the <a href="/settings">settings</a>.' };
            }

            const serpAPI = new SerpAPI(serpApiKey);
            const results = await serpAPI.call(input.query);
            return { results: results };
        } catch (error: any) {
            systemLog.error(`Web Search failed: ${error.message}`, 'WebSearchTool');
            return { results: `Web Search failed: ${error.message}. Please check your SerpAPI key and try again.` };
        }
    };
    systemNote.registerToolDefinition({ ...webSearchToolData, implementation: webSearchToolImplementation, type: 'custom' });
    systemLog.info(`🔨 Registered Tool ${webSearchToolData.id}: ${webSearchToolData.title}`, 'SystemNote');
};
