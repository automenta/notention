import { Note } from '../types';
import { systemLog } from './systemLog';

export async function executeTool(tool: Note, input: any, toolImplementation?: Function): Promise<any> {
    systemLog.info(`Executing tool ${tool.id}: ${tool.title}`, 'Executor');

    if (toolImplementation) {
        try {
            systemLog.debug(`Executing tool ${tool.id} with custom implementation.`, 'Executor');
            return await toolImplementation(input);
        } catch (error: any) {
            systemLog.error(`Error executing custom implementation for tool ${tool.id}: ${error.message}`, 'Executor');
            throw error;
        }
    } else {
        try {
            systemLog.debug(`Executing tool ${tool.id} with default logic.`, 'Executor');
            const logic = JSON.parse(tool.logic || '{}');
            if (!logic || !logic.steps || !Array.isArray(logic.steps)) {
                systemLog.warn(`Tool ${tool.id} has invalid or missing logic.`, 'Executor');
                throw new Error(`Tool ${tool.id} has invalid or missing logic.`);
            }

            let currentInput = input;
            for (const step of logic.steps) {
                systemLog.debug(`Running step ${step.id} of tool ${tool.id}.`, 'Executor');
                //Basic passthrough
                currentInput = input[step.input.replace(/[{}]/g, '')];
            }
            return { output: currentInput };
        } catch (error: any) {
            systemLog.error(`Error executing default logic for tool ${tool.id}: ${error.message}`, 'Executor');
            throw error;
        }
    }
}
