import { Note } from '../types';
import { z } from "zod";
import { systemLog } from './systemLog';
import { getSystemNote } from './systemNote';
import { Runnable } from "langchain/runnables";

const NoteSchema = z.object({
    id: z.string(),
    type: z.enum(['Task', 'System', 'Template', 'Tool']),
    title: z.string(),
    content: z.any(),
    logic: z.any().optional(), // Change to any for now
    status: z.enum(['active', 'pending', 'completed', 'failed', 'dormant', 'bypassed', 'pendingRefinement', 'running']),
    priority: z.number(),
    createdAt: z.string(),
    updatedAt: z.string().nullable(),
    references: z.array(z.string()),
    inputSchema: z.string().optional(),
    outputSchema: z.string().optional(),
});

export class NoteImpl {
    private _runnable: Runnable | null = null; // Cache runnable

    constructor(public data: Note) { }

    // Static factory method for creating Root Note
    static createRootNote = async (llm: any): Promise<NoteImpl> => {
        systemLog.debug('Creating root note', 'NoteImpl');
        return new NoteImpl({
            id: 'root',
            type: 'System',
            title: 'Netention System',
            content: {
                notes: new Map<string, Note>(),
                activeQueue: [],
                runningCount: 0,
                concurrencyLimit: 5,
                llm,
                tools: new Map<string, Note>(),
                toolImplementations: new Map<string, Function>(),
            },
            status: 'active',
            priority: 100,
            createdAt: new Date().toISOString(),
            updatedAt: null,
            references: [],
        });
    };

    // Static factory method for creating Task Note
    static createTaskNote = async (title: string, content: string, priority: number = 50): Promise<NoteImpl> => {
        systemLog.debug(`Creating task note: ${title}`, 'NoteImpl');
        return new NoteImpl({
            id: `task-${Date.now()}`,
            type: 'Task',
            title: title,
            content: {
                messages: [{
                    type: 'system',
                    content: `You are a helpful assistant.  Respond to the user.`,
                    timestamp: new Date().toISOString()
                }],
            },
            status: 'pending',
            priority: priority,
            createdAt: new Date().toISOString(),
            updatedAt: null,
            references: [],
        });
    };

    async run() {
        if (this.data.status !== 'active' && this.data.status !== 'pending') {
            systemLog.debug(`Note ${this.data.id} is not active or pending, skipping run. Status: ${this.data.status}`, this.data.type);
            return;
        }

        this.data.status = 'running';
        this.update();
        systemLog.info(`🚀 Running Note ${this.data.id}: ${this.data.title}`, this.data.type);
        getSystemNote().incrementRunning();

        try {
            await this.executeLogic();
            this.data.status = 'completed';
            this.update();
            getSystemNote().decrementRunning();
            systemLog.info(`✅ Note ${this.data.id} completed successfully.`, this.data.type);
            await this.reflect({});
        } catch (error: any) {
            this.data.status = 'failed';
            this.update();
            getSystemNote().decrementRunning();
            systemLog.error(`🔥 Note ${this.data.id} failed: ${error.message}`, this.data.type);
            this.handleFailure(error);
        }
    }

    private async executeLogic() {
        if (!this.data.logic) {
            systemLog.debug(`Note ${this.data.id} has no logic defined, using simulation.`, this.data.type);
            return;
        }

        const logic: any = this.data.logic;
        if (!logic || !logic.steps || !Array.isArray(logic.steps)) {
            systemLog.warn(`Note ${this.data.id} has invalid or missing logic steps.`, this.data.type);
            return;
        }

        for (const step of logic.steps) {
            try {
                await this.executeStep(step);
            } catch (error: any) {
                systemLog.error(`Error executing step ${step.id} in Note ${this.data.id}: ${error.message}`, this.data.type);
                this.addSystemMessage(`Error executing step ${step.id}: ${error.message}`, 'error');
                throw error; // Re-throw to be caught by the main run function
            }
        }
    }

    private async executeStep(step: any) {
        systemLog.debug(`Running step ${step.id} of type ${step.type}`, this.data.type);

        if (step.type === 'tool') {
            await this.executeToolStep(step);
        } else {
            systemLog.warn(`Unknown step type: ${step.type}. Skipping step.`, this.data.type);
        }
    }

    private async executeToolStep(step: any) {
        const toolId = step.toolId;
        const input = step.input;

        if (!toolId) {
            systemLog.warn(`Tool ID not provided in step ${step.id}`, this.data.type);
            return;
        }

        systemLog.info(`⚙️ Executing tool ${toolId} for Note ${this.data.id}`, this.data.type);
        try {
            const result = await getSystemNote().executeTool(toolId, input);
            systemLog.info(`✅ Tool ${toolId} executed successfully for Note ${this.data.id}. Result: ${JSON.stringify(result)}`, this.data.type);
            this.addSystemMessage(`Tool ${toolId} executed successfully. Result: ${JSON.stringify(result)}`);
        } catch (toolError: any) {
            systemLog.error(`❌ Error executing tool ${toolId} for Note ${this.data.id}: ${toolError.message}`, this.data.type);
            this.addSystemMessage(`Error executing tool ${toolId}: ${toolError.message}`, 'error');
            throw toolError; // Re-throw to be caught by the executeLogic function
        }
    }

    addSystemMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
        const systemMessage = {
            type: 'system',
            content: message,
            timestamp: new Date().toISOString(),
        };

        this.data.content.messages = [...(this.data.content.messages ?? []), systemMessage];
        this.update();
        systemLog[level](`[Note ${this.data.id}] ${message}`, this.data.type);
    }

    getRunnable(): Runnable | null {
        if (this._runnable) {
            systemLog.debug(`Note ${this.data.id} using cached runnable.`, this.data.type);
            return this._runnable;
        }

        if (!this.data.logic) {
            systemLog.debug(`Note ${this.data.id} has no logic defined, using simulation.`, this.data.type);
            return null;
        }

        try {
            // this._runnable = Runnable.fromJSON(JSON.parse(this.data.logic));
            systemLog.debug(`Note ${this.data.id} runnable created from logic.`, this.data.type);
            return null;
        } catch (e) {
            systemLog.error(`Error creating runnable from logic: ${e}`, this.data.type);
            return null;
        }
    }

    async reflect(executionResult: any) {
        systemLog.debug(`Note ${this.data.id} Reflecting on result: ${JSON.stringify(executionResult)}`, this.data.type);

        if (this.data.type === 'Task' && executionResult) {
            const reflectionMessage = `Reflection: Task execution completed. Result details: ${JSON.stringify(executionResult)}`;
            this.addSystemMessage(reflectionMessage);

            // Example: Create a sub-note if the result suggests further action
            if (executionResult.output && typeof executionResult.output === 'string' && executionResult.output.includes('create sub-task')) {
                const subNote = await NoteImpl.createTaskNote(
                    `Sub-task of ${this.data.title}`,
                    'Details: ' + executionResult.output,
                    this.data.priority - 1
                );
                getSystemNote().addNote(subNote.data);
                this.data.references.push(subNote.data.id);
                this.update();
            }
        }
    }

    async handleFailure(error: any) {
        systemLog.warn(`Handling failure for Note ${this.data.id}: ${error.message}`, this.data.type);

        if (this.data.type === 'Task') {
            const failureMessage = `Failure Handler: Error encountered - ${error.message}. Details: ${JSON.stringify(error)}`;
            this.addSystemMessage(failureMessage, 'warning');

            // Example: Retry logic (up to 3 attempts)
            const retryCount = this.data.content?.retryCount || 0;
            if (retryCount < 3) {
                this.data.content.retryCount = retryCount + 1;
                this.addSystemMessage(`Retrying task (attempt ${this.data.content.retryCount}).`);
                this.data.status = 'pending';
                this.update();
                getSystemNote().enqueueNote(this.data.id); // Re-enqueue the task
            } else {
                this.data.status = 'failed';
                this.update();
                this.addSystemMessage('Task failed after multiple retries.', 'error');
            }
        }
    }

    async generateLogic(): Promise<void> {
        const llm = getSystemNote().getLLM();
        if (!llm) {
            systemLog.warn(`LLM not initialized, cannot generate logic for Note ${this.data.id}.`, this.data.type);
            return;
        }
        const prompt = `Generate a LangChain Runnable steps array (JSON format) for the following task: ${this.data.content.messages.map(m => m.content).join('\n')}. Include a step to use the "web-search-tool" if appropriate.`;
        try {
            const logic = await llm.invoke(prompt);
            this.data.logic = logic;
            this.update();
            systemLog.info(`Logic generated for Note ${this.data.id}: ${logic}`, this.data.type);
        } catch (error: any) {
            systemLog.error(`Error generating logic for Note ${this.data.id}: ${error.message}`, this.data.type);
        }
    }

    private update() {
        this.data.updatedAt = new Date().toISOString();
        getSystemNote().updateNote(this.data);
    }
}
