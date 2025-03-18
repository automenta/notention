import {Note} from '../types';
import {getSystemNote} from './systemNote';
import {systemLog} from './systemLog';
import {Runnable} from 'langchain/schema/runnable'; // Import LangChain Runnable components

// NoteImpl class - Encapsulates Note data and behavior
export class NoteImpl {
    private _runnable: Runnable | null = null; // Cache runnable

    constructor(public data: Note) {
    }

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
        content: {messages: [], text: content}, // Initialize messages array for ChatView
        priority,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: null,
        references: [],
    });

    // Core run logic for a Note - Functional with simulated async task
    async run() {
        if (this.data.status !== 'active') return;
        this.data.status = 'running';
        this.update();
        systemLog.info(`🚀 Running Note ${this.data.id}: ${this.data.title}`, this.data.type);
        getSystemNote().incrementRunning();

        let executionResult;
        let executionError = null;

        try {
            const runnable = this.getRunnable();
            if (runnable) {
                executionResult = await runnable.invoke({note: this}); // Invoke Runnable
                systemLog.debug(`Note ${this.data.id} Runnable Result: ${JSON.stringify(executionResult)}`, this.data.type);
                await this.reflect(executionResult); // Basic Reflection
            } else {
                await new Promise(resolve => setTimeout(resolve, 1500)); // Fallback simulation if no runnable
                if (Math.random() < 0.2) throw new Error('Simulated task failure!');
                executionResult = {simulated: true, message: "Simulated Task Success"}; //Simulated result
                await this.reflect(executionResult); // Basic Reflection even for simulation
            }


            this.data.status = 'completed';
            systemLog.info(`✅ Note ${this.data.id}: ${this.data.title} completed.`, this.data.type);

            if (this.data.type === 'Task') {
                this.addSystemMessage(`Task completed successfully at ${new Date().toLocaleTimeString()}. Result: ${JSON.stringify(executionResult)}`);
            }

        } catch (e: any) {
            systemLog.error(`🔥 Error in Note ${this.data.id}: ${e.message}`, this.data.type);
            executionError = e;
            this.data.status = 'failed';

            if (this.data.type === 'Task') {
                this.addSystemMessage(`Task failed with error: ${e.message} at ${new Date().toLocaleTimeString()}.`, 'error');
            }
            await this.handleFailure(e); // Basic failure handling
        } finally {
            getSystemNote().decrementRunning();
            this.update();
            this.schedule();
        }
    }

    getRunnable(): Runnable | null {
        if (!this._runnable) {
            if (this.data.logic) {
                try {
                    // Basic parsing - assuming JSON Runnable spec
                    const runnableSpec = JSON.parse(this.data.logic);
                    if (runnableSpec) {
                        this._runnable = Runnable.from(runnableSpec); // Create LangChain Runnable
                    } else {
                        systemLog.warn(`Note ${this.data.id} logic is empty or invalid JSON, falling back to simulation.`, this.data.type);
                        return null; // Fallback to simulation if logic is empty or parsing fails
                    }
                } catch (e) {
                    systemLog.warn(`Error parsing Note ${this.data.id} logic as JSON Runnable, falling back to simulation: ${e.message}`, this.data.type);
                    return null; // Fallback to simulation on parsing error
                }
            } else {
                systemLog.debug(`Note ${this.data.id} has no logic defined, using simulation.`, this.data.type);
                return null; // Fallback to simulation if no logic is defined
            }
        }
        return this._runnable;
    }

    async reflect(executionResult: any) {
        systemLog.debug(`Note ${this.data.id} Reflecting on result: ${JSON.stringify(executionResult)}`, this.data.type);
        // Basic reflection - can be expanded later
        if (this.data.type === 'Task' && executionResult) {
            this.addSystemMessage(`Reflection: Task execution completed. Result details: ${JSON.stringify(executionResult)}`);
        }
    }

    async handleFailure(error: any) {
        systemLog.warn(`Handling failure for Note ${this.data.id}: ${error.message}`, this.data.type);
        // Basic failure handling - can be expanded later
        if (this.data.type === 'Task') {
            this.addSystemMessage(`Failure Handler: Error encountered. Details logged in system log.`, 'warning');
        }
    }

    // Simulate adding system messages to ChatView
    private addSystemMessage = (content: string, messageType: 'system' | 'error' = 'system') => {
        if (this.data.type === 'Task' && typeof this.data.content === 'object' && Array.isArray(this.data.content.messages)) {
            this.data.content.messages = [...this.data.content.messages, {
                type: messageType,
                content: content,
                timestamp: new Date().toISOString()
            }];
            this.update(); // Update Note to persist messages
        }
    };

    // Scheduling - Enqueue note for future execution
    private schedule = () => getSystemNote().enqueueNote(this.data.id);

    // Update - Persist Note data to SystemNote
    private update = () => getSystemNote().updateNote(this.data);
}
