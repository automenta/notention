import { Note } from '../types';
import { getSystemNote } from './systemNote';
import { systemLog } from './systemLog';

// NoteImpl class - Encapsulates Note data and behavior
export class NoteImpl {
  constructor(public data: Note) {}

  // Core run logic for a Note - Functional with simulated async task
  run = async () => {
    if (this.data.status !== 'active') return; // Only run active notes
    this.data.status = 'running';
    this.update(); // Update status to 'running' in SystemNote
    systemLog.info(`🚀 Running Note ${this.data.id}: ${this.data.title}`, this.data.type); // Log note run start
    getSystemNote().incrementRunning(); // Increment running count

    try {
      // *** SIMULATED ASYNC TASK - REPLACE WITH ACTUAL NOTE LOGIC (Think-Act-Reflect Loop, LangChain calls) ***
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate work - 1.5 seconds
      if (Math.random() < 0.2) throw new Error('Simulated task failure!'); // Simulate occasional errors (20% chance)

      this.data.status = 'completed';
      systemLog.info(`✅ Note ${this.data.id}: ${this.data.title} completed.`, this.data.type); // Log note completion

      // Simulate adding a system message to ChatView on completion
      if (this.data.type === 'Task') {
        this.addSystemMessage(`Task completed successfully at ${new Date().toLocaleTimeString()}.`);
      }

    } catch (e: any) {
      systemLog.error(`🔥 Error in Note ${this.data.id}: ${e.message}`, this.data.type); // Log error
      this.data.status = 'failed';

      //Simulate adding a system message to ChatView on failure
       if (this.data.type === 'Task') {
        this.addSystemMessage(`Task failed with error: ${e.message} at ${new Date().toLocaleTimeString()}.`, 'error');
      }

    } finally {
      getSystemNote().decrementRunning(); // Decrement running count
      this.update(); // Update status in SystemNote
      this.schedule(); // Schedule next run (enqueue in active queue)
    }
  };

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
}
