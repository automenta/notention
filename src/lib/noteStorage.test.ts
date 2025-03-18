import { InMemoryNoteStorage } from './noteStorage';
import { Note } from '../types';
import idService from './idService';

describe('InMemoryNoteStorage', () => {
  let storage: InMemoryNoteStorage;
  let note1: Note;
  let note2: Note;

  beforeEach(() => {
    storage = new InMemoryNoteStorage();
    note1 = {
      id: idService.generateId(),
      type: 'Task',
      title: 'Test Note 1',
      content: 'This is a test note.',
      status: 'pending',
      priority: 50,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      references: [],
      description: 'Test Description',
    };
    note2 = {
      id: idService.generateId(),
      type: 'Task',
      title: 'Test Note 2',
      content: 'This is another test note.',
      status: 'active',
      priority: 75,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      references: [],
      description: 'Test Description 2',
    };
  });

  it('should add a note', async () => {
    await storage.addNote(note1);
    const retrievedNote = await storage.getNote(note1.id);
    expect(retrievedNote).toEqual(note1);
  });

  it('should get a note by ID', async () => {
    await storage.addNote(note1);
    const retrievedNote = await storage.getNote(note1.id);
    expect(retrievedNote).toEqual(note1);
  });

  it('should return undefined when getting a non-existent note', async () => {
    const retrievedNote = await storage.getNote('non-existent-id');
    expect(retrievedNote).toBeUndefined();
  });

  it('should get all notes', async () => {
    await storage.addNote(note1);
    await storage.addNote(note2);
    const allNotes = await storage.getAllNotes();
    expect(allNotes).toEqual([note1, note2]);
  });

  it('should update a note', async () => {
    await storage.addNote(note1);
    const updatedNote = { ...note1, title: 'Updated Test Note' };
    await storage.updateNote(updatedNote);
    const retrievedNote = await storage.getNote(note1.id);
    expect(retrievedNote).toEqual(updatedNote);
  });

  it('should delete a note', async () => {
    await storage.addNote(note1);
    await storage.deleteNote(note1.id);
    const retrievedNote = await storage.getNote(note1.id);
    expect(retrievedNote).toBeUndefined();
  });

  it('should get references for a note', async () => {
    note1.references = [note2.id];
    await storage.addNote(note1);
    await storage.addNote(note2);
    const references = await storage.getReferences(note1.id);
    expect(references).toEqual([note2.id]);
  });

  it('should add a reference to a note', async () => {
    await storage.addNote(note1);
    await storage.addNote(note2);
    await storage.addReference(note1.id, note2.id);
    const retrievedNote = await storage.getNote(note1.id);
    expect(retrievedNote?.references).toContain(note2.id);
  });

  it('should remove a reference from a note', async () => {
    note1.references = [note2.id];
    await storage.addNote(note1);
    await storage.addNote(note2);
    await storage.removeReference(note1.id, note2.id);
    const retrievedNote = await storage.getNote(note1.id);
    expect(retrievedNote?.references).not.toContain(note2.id);
  });
});
