import { Note } from '../types';

export interface NoteStorage {
    getNote(id: string): Promise<Note | undefined>;
    getAllNotes(): Promise<Note[]>;
    addNote(note: Note): Promise<void>;
    updateNote(note: Note): Promise<void>;
    deleteNote(id: string): Promise<void>;
    getReferences(noteId: string): Promise<string[]>;
    addReference(sourceId: string, targetId: string): Promise<void>;
    removeReference(sourceId: string, targetId: string): Promise<void>;
}

export class InMemoryNoteStorage implements NoteStorage {
    private notes: Map<string, Note> = new Map();

    async getNote(id: string): Promise<Note | undefined> {
        return this.notes.get(id);
    }

    async getAllNotes(): Promise<Note[]> {
        return Array.from(this.notes.values());
    }

    async addNote(note: Note): Promise<void> {
        this.notes.set(note.id, note);
    }

    async updateNote(note: Note): Promise<void> {
        this.notes.set(note.id, note);
    }

    async deleteNote(id: string): Promise<void> {
        this.notes.delete(id);
    }

   async getReferences(noteId: string): Promise<string[]> {
        const note = this.notes.get(noteId);
        return note?.references || [];
    }

    async addReference(sourceId: string, targetId: string): Promise<void> {
        const sourceNote = this.notes.get(sourceId);
        if (sourceNote) {
            sourceNote.references = [...(sourceNote.references || []), targetId];
            this.updateNote(sourceNote);
        }
    }

    async removeReference(sourceId: string, targetId: string): Promise<void> {
         const sourceNote = this.notes.get(sourceId);
        if (sourceNote) {
            sourceNote.references = sourceNote.references?.filter(ref => ref !== targetId) || [];
            this.updateNote(sourceNote);
        }
    }
}

// Placeholder for GraphDBNoteStorage - You'll need to implement this
export class GraphDBNoteStorage implements NoteStorage {
    async getNote(id: string): Promise<Note | undefined> {
        console.warn('GraphDBNoteStorage not implemented yet.');
        return undefined;
    }
    async getAllNotes(): Promise<Note[]> {
        console.warn('GraphDBNoteStorage not implemented yet.');
        return [];
    }
    async addNote(note: Note): Promise<void> {
        console.warn('GraphDBNoteStorage not implemented yet.');
    }
    async updateNote(note: Note): Promise<void> {
        console.warn('GraphDBNoteStorage not implemented yet.');
    }
    async deleteNote(id: string): Promise<void> {
        console.warn('GraphDBNoteStorage not implemented yet.');
    }
    async getReferences(noteId: string): Promise<string[]> {
        console.warn('GraphDBNoteStorage not implemented yet.');
        return [];
    }
    async addReference(sourceId: string, targetId: string): Promise<void> {
        console.warn('GraphDBNoteStorage not implemented yet.');
    }
    async removeReference(sourceId: string, targetId: string): Promise<void> {
        console.warn('GraphDBNoteStorage not implemented yet.');
    }
}
