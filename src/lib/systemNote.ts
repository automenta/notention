import { Note } from '../types';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { systemLog } from './systemLog';
import { NoteImpl } from './note';

type Listener = () => void;
const listeners: Listener[] = [];
let systemNoteData: Note | undefined = undefined;

// Initialize System Note - singleton pattern
export const initializeSystemNote = (llm: ChatOpenAI) => {
  if (systemNoteData) throw new Error('System Note already initialized');
  systemNoteData = {
    id: 'system',
    type: 'System',
    title: 'Netention System',
    content: { notes: new Map<string, Note>(), activeQueue: [], runningCount: 0, concurrencyLimit: 5, llm },
    status: 'active',
    priority: 100,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    references: [],
  };
  systemLog.info('System Note Initialized 🚀', 'SystemNote');
  // Start the system loop after initialization
  getSystemNote().runSystemLoop();
};

// Accessor for the System Note instance
export const getSystemNote = () => {
  if (!systemNoteData) {
    initializeSystemNote({} as ChatOpenAI); // Bootstrap if not initialized
    systemLog.warning('System Note was not initialized, bootstrapping with default. Ensure initializeSystemNote is called.', 'SystemNote');
  }
  return new SystemNote(systemNoteData!);
};

// SystemNote class - encapsulates system-level operations and state
class SystemNote {
  constructor(public data: Note) {}

  // CRUD operations for Notes
  addNote = (note: Note) => {
    this.data.content.notes.set(note.id, note);
    this.notify();
    systemLog.info(`📝 Added Note ${note.id}: ${note.title}`, 'SystemNote');
  };
  getNote = (id: string) => this.data.content.notes.get(id);
  getAllNotes = () => [...this.data.content.notes.values()];
  updateNote = (note: Note) => {
    this.data.content.notes.set(note.id, note);
    this.notify();
    systemLog.info(`🔄 Updated Note ${note.id}: ${note.title}`, 'SystemNote');
  };
  deleteNote = (id: string) => {
    this.data.content.notes.delete(id);
    this.data.content.activeQueue = this.data.content.activeQueue.filter(n => n !== id);
    this.notify();
    systemLog.info(`🗑️ Deleted Note ${id}`, 'SystemNote');
  };

  // Task queue management
  enqueueNote = (id: string) => {
    if (!this.data.content.activeQueue.includes(id)) {
      this.data.content.activeQueue.push(id);
      this.notify();
      const note = this.getNote(id);
      systemLog.info(`➡️ Enqueued Note ${note.id}: ${note?.title}`, 'SystemNote');
    }
  };
  dequeueNote = () => {
    if (!this.data.content.activeQueue.length) return;
    this.data.content.activeQueue.sort((a, b) => (this.getNote(b)?.priority ?? 0) - (this.getNote(a)?.priority ?? 0));
    const noteId = this.data.content.activeQueue.shift();
    if (noteId) {
      const note = this.getNote(noteId);
      systemLog.info(`⬅️ Dequeued Note ${noteId}: ${note?.title}`, 'SystemNote');
    }
    return noteId;
  };

  // LLM access
  getLLM = () => this.data.content.llm as ChatOpenAI;

  // Concurrency management
  incrementRunning = () => {
    this.data.content.runningCount++;
    this.notify();
  };

  decrementRunning = () => {
    this.data.content.runningCount--;
    this.notify();
  };  canRun = () => this.data.content.runningCount < this.data.content.concurrencyLimit;

  // Run a specific note
  runNote = async (noteId: string) => {
    const note = this.getNote(noteId);
    if (note) {
      const noteImpl = new NoteImpl(note);
      await noteImpl.run();
    } else {
      systemLog.error(`🔥 Note with ID ${noteId} not found, cannot run.`, 'SystemNote');
    }
  };

  // System Loop - Dequeue and Run Notes
  runSystemLoop = async () => {
    const loop = async () => {
      while (this.canRun()) {
        const nextNoteId = this.dequeueNote();
        if (nextNoteId) {
          this.incrementRunning();
          await this.runNote(nextNoteId);
          this.decrementRunning();
        } else {
          break; // No more notes in queue
        }
      }
      setTimeout(loop, 1000); // Run loop every 1 second
    };
    loop(); // Start the loop
    systemLog.info('System Loop Started 🔄', 'SystemNote');
  };

  // Notification system for UI updates
  private notify = () => listeners.forEach(l => l());
}

// Hook for subscribing to SystemNote changes
export const onSystemNoteChange = (listener: Listener) => {
  listeners.push(listener);
  return () => listeners.splice(listeners.indexOf(listener), 1);
};
