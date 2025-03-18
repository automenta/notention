import { Note } from '../types';
import { getSystemNote } from './systemNote';
import { systemLog } from './systemLog';
import { Runnable, RunnableLambda, RunnableSequence } from '@langchain/core/runnables';
import { awaitAllCallbacks } from '@langchain/core/callbacks/promises';

// Custom callback handler for LangChain execution tracking
const executionCallbackHandler = {
    handleChainStart: async () => {
        systemLog.debug('Runnable chain started', 'NoteImpl');
    },
    handleChainEnd: async (outputs: any) => {
        systemLog.debug(`Runnable chain ended with outputs: ${JSON.stringify(outputs)}`, 'NoteImpl');
    },
    handleChainError: async (error: any) => {
        systemLog.error(`Runnable chain error: ${error.message}`, 'NoteImpl');
    },
};

// NoteImpl class - Encapsulates Note data and behavior
export class NoteImpl {
    private _runnable: Runnable | null = null; // Cache runnable

    constructor(public data: Note) {}

    // Static factory method for creating Root Note
    static createRootNote = async (llm: any): Promise<NoteImpl> => new NoteImpl({
        id: 'root',
        type: 'Root',
        title: 'Netention Root',
        content: 'System root note',
        status: 'active',
        priority: 100,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        references: [],
    });

    // Static factory method for creating Task Notes
    static createTaskNote = async (title: string, content: string, priority = 50): Promise<NoteImpl> => new NoteImpl({
        id: crypto.randomUUID(),
        type: 'Task',
        title,
        content: { messages: [], text: content }, // Initialize messages array for ChatView
        priority,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: null,
        references: [],
    });

    // Core run logic for a Note - Executes with LangChain runnables
    async run() {
        if (this.data.status !== 'active' && this.data.status !== 'pending') return;
        this.data.status = 'running';
        this.update();
        systemLog.info(`🚀 Running Note ${this.data.id}: ${this.data.title}`, this.data.type);
        getSystemNote().incrementRunning();

        let executionResult: any;
        let executionError: any = null;

        try {
            const runnable = this.getRunnable();
            if (runnable) {
                // Execute the runnable with callbacks for tracking
                executionResult = await runnable.invoke(
                    { note: this, input: this.data.content?.text || 'Default input' }, // Pass note and content as input
                    { callbacks: [executionCallbackHandler] }
                );
                systemLog.debug(`Note ${this.data.id} Runnable Result: ${JSON.stringify(executionResult)}`, this.data.type);
                await this.reflect(executionResult);
            } else {
                // Fallback simulation if no runnable is defined
                await new Promise(resolve => setTimeout(resolve, 1500));
                if (Math.random() < 0.2) throw new Error('Simulated task failure!');
                executionResult = { simulated: true, message: 'Simulated Task Success' };
                await this.reflect(executionResult);
            }

            this.data.status = 'completed';
            systemLog.info(`✅ Note ${this.data.id}: ${this.data.title} completed.`, this.data.type);

            if (this.data.type === 'Task') {
                this.addSystemMessage(
                    `Task completed successfully at ${new Date().toLocaleTimeString()}. Result: ${JSON.stringify(executionResult)}`
                );
            }
        } catch (e: any) {
            systemLog.error(`🔥 Error in Note ${this.data.id}: ${e.message}`, this.data.type);
            executionError = e;
            this.data.status = 'failed';

            if (this.data.type === 'Task') {
                this.addSystemMessage(
                    `Task failed with error: ${e.message} at ${new Date().toLocaleTimeString()}`,
                    'error'
                );
            }
            await this.handleFailure(e);
        } finally {
            await awaitAllCallbacks(); // Ensure all callbacks complete
            getSystemNote().decrementRunning();
            this.update();
            this.schedule();
        }
    }

    // Constructs a LangChain Runnable from note logic
    getRunnable(): Runnable | null {
        if (this._runnable) return this._runnable;

        if (!this.data.logic) {
            systemLog.debug(`Note ${this.data.id} has no logic defined, using simulation.`, this.data.type);
            return null;
        }

        try {
            const logicSpec = JSON.parse(this.data.logic);
            if (!logicSpec.steps || !Array.isArray(logicSpec.steps)) {
                systemLog.warn(`Note ${this.data.id} logic is invalid (no steps array), falling back to simulation.`, this.data.type);
                return null;
            }

            // Build a sequence of runnables from steps
            const runnables = logicSpec.steps.map((step: any) => {
                if (step.type === 'invoke' && step.runnable?.$type === 'Tool') {
                    const toolNote = getSystemNote().getTool(step.runnable.name);
                    if (!toolNote) {
                        systemLog.error(`Tool ${step.runnable.name} not found for Note ${this.data.id}`, this.data.type);
                        throw new Error(`Tool ${step.runnable.name} not found`);
                    }

                    const toolLogic = toolNote.logic ? JSON.parse(toolNote.logic) : null;
                    if (!toolLogic || !toolLogic.steps) {
                        systemLog.warn(`Tool ${step.runnable.name} has no valid logic`, this.data.type);
                        return RunnableLambda.from((input) => input); // Passthrough fallback
                    }

                    // For simplicity, assume tool logic has one step (e.g., passthrough for Echo Tool)
                    return RunnableLambda.from((input) => {
                        const toolInput = step.input || input;
                        systemLog.debug(`Invoking tool ${step.runnable.name} with input: ${JSON.stringify(toolInput)}`, this.data.type);
                        return { output: toolInput.input }; // Echo Tool behavior
                    });
                } else if (step.type === 'passthrough') {
                    return RunnableLambda.from((input) => input); // Passthrough step
                } else {
                    systemLog.warn(`Unsupported step type ${step.type} in Note ${this.data.id}`, this.data.type);
                    return RunnableLambda.from((input) => input); // Fallback
                }
            });

            this._runnable = runnables.length > 1 ? RunnableSequence.from(runnables) : runnables[0];
            return this._runnable;
        } catch (e) {
            systemLog.warn(`Error parsing Note ${this.data.id} logic as Runnable: ${e.message}, falling back to simulation`, this.data.type);
            return null;
        }
    }

    // Reflects on execution results, updating note content or creating sub-notes
    async reflect(executionResult: any) {
        systemLog.debug(`Note ${this.data.id} Reflecting on result: ${JSON.stringify(executionResult)}`, this.data.type);

        if (this.data.type === 'Task' && executionResult) {
            const reflectionMessage = `Reflection: Task execution completed. Result details: ${JSON.stringify(executionResult)}`;
            this.addSystemMessage(reflectionMessage);

            // Example: Create a sub-note if the result suggests further action
            if (executionResult.output && typeof executionResult.output === 'string' && executionResult.output.includes('Task')) {
                const subNote = await NoteImpl.createTaskNote(
                    `Sub-task from ${this.data.title}`,
                    `Follow-up on: ${executionResult.output}`,
                    this.data.priority - 10 // Lower priority for sub-task
                );
                this.data.references.push(subNote.data.id);
                getSystemNote().addNote(subNote.data);
                systemLog.info(`Created sub-note ${subNote.data.id} from reflection`, this.data.type);
            }
        }
    }

    // Handles execution failures, potentially retrying or escalating
    async handleFailure(error: any) {
        systemLog.warn(`Handling failure for Note ${this.data.id}: ${error.message}`, this.data.type);

        if (this.data.type === 'Task') {
            const failureMessage = `Failure Handler: Error encountered - ${error.message}. Details logged in system log.`;
            this.addSystemMessage(failureMessage, 'warning');

            // Example: Retry logic (up to 3 attempts)
            const retryCount = this.data.content?.retryCount || 0;
            if (retryCount < 3) {
                this.data.content = { ...this.data.content, retryCount: retryCount + 1 };
                this.data.status = 'pending';
                this.schedule();
                systemLog.info(`Retrying Note ${this.data.id} (Attempt ${retryCount + 1}/3)`, this.data.type);
            } else {
                // Escalate by creating a new task for review
                const escalationNote = await NoteImpl.createTaskNote(
                    `Review Failure of ${this.data.title}`,
                    `Task failed after 3 attempts: ${error.message}`,
                    this.data.priority + 20 // Higher priority for escalation
                );
                this.data.references.push(escalationNote.data.id);
                getSystemNote().addNote(escalationNote.data);
                systemLog.info(`Escalated failure to new task ${escalationNote.data.id}`, this.data.type);
            }
        }
    }

    // Adds system messages to task notes for ChatView
    private addSystemMessage = (content: string, messageType: 'system' | 'error' | 'warning' = 'system') => {
        if (this.data.type === 'Task' && typeof this.data.content === 'object' && Array.isArray(this.data.content.messages)) {
            this.data.content.messages = [...this.data.content.messages, {
                type: messageType,
                content,
                timestamp: new Date().toISOString(),
            }];
            this.update();
        }
    };

    // Schedules the note for future execution
    private schedule = () => getSystemNote().enqueueNote(this.data.id);

    // Updates the note in SystemNote
    private update = () => getSystemNote().updateNote(this.data);
}