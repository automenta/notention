import { Note } from '../../types';
import idService from '../idService';
import { SystemNote, getSystemNote } from '../systemNote';
import { systemLog } from '../systemLog';

export const registerApiTool = (systemNote: SystemNote) => {
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
        config: {
            method: 'GET',
            headers: JSON.stringify({ 'Content-Type': 'application/json' }),
            authType: 'none',
        },
        description: 'Fetches a random joke from the Joke API.',
    };
    systemNote.registerToolDefinition({ ...apiToolData, type: 'api' });
    systemLog.info(`🔨 Registered Tool ${apiToolData.id}: ${apiToolData.title}`, 'SystemNote');
};
