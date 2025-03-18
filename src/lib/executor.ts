import { Note } from '../types';
import { systemLog } from './systemLog';
import { RunnablePassthrough } from "langchain/runnables/passthrough";

export async function executeTool(tool: Note, input: any, toolImplementation?: Function): Promise<any> {
    systemLog.info(`Executing tool ${tool.id}: ${tool.title}`, 'Executor');

    if (toolImplementation) {
        try {
            systemLog.debug(`Executing tool ${tool.id} with custom implementation.`, 'Executor');
            return await toolImplementation(input);
        } catch (error: any) {
            systemLog.error(`Error executing custom implementation for tool ${tool.id}: ${error.message}`, 'Executor');
            throw new Error(`Error executing custom implementation for tool ${tool.id}: ${error.message}`);
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
                if (step.type === 'passthrough') {
                    const runnable = new RunnablePassthrough();
                    currentInput = await runnable.invoke(input[step.input.replace(/[{}]/g, '')]);
                } else {
                    systemLog.warn(`Unknown step type: ${step.type} in tool ${tool.id}. Skipping step.`, 'Executor');
                    throw new Error(`Unknown step type: ${step.type} in tool ${tool.id}.`);
                }
            }
            return { output: currentInput };
        } catch (error: any) {
            systemLog.error(`Error executing default logic for tool ${tool.id}: ${error.message}`, 'Executor');
            throw new Error(`Error executing default logic for tool ${tool.id}: ${error.message}`);
        }
    }
}
