import { InMemoryNoteStorage, GraphDBNoteStorage } from './noteStorage';
import { Note } from '../types';
import idService from './idService';
import { SystemNote, initializeSystemNote, getSystemNote } from './systemNote';
import { ChatOpenAI } from '@langchain/openai';

// Mock the ChatOpenAI class
jest.mock('@langchain/openai', () => {
    return {
        ChatOpenAI: jest.fn().mockImplementation(() => {
            return {
                call: jest.fn().mockResolvedValue('Mock LLM Response'),
                invoke: jest.fn().mockResolvedValue('Mock LLM Response'),
            };
        }),
    };
});

describe('SystemNote Integration with InMemoryNoteStorage', () => {
    let systemNote: SystemNote;
    let inMemoryStorage: InMemoryNoteStorage;
    let note1: Note;

    beforeEach(() => {
        // Initialize SystemNote with InMemoryNoteStorage
        initializeSystemNote({} as ChatOpenAI); // Provide a mock LLM
        systemNote = getSystemNote();
        inMemoryStorage = new InMemoryNoteStorage(); // Directly initialize InMemoryNoteStorage

        note1 = {
            id: idService.generateId(),
            type: 'Task',
            title: 'Test Note 1',
            content: 'This is a test note',
            status: 'pending',
            priority: 50,
            createdAt: new Date().toISOString(),
            updatedAt: null,
            references: [],
            description: '',
            requiresWebSearch: false,
            inputSchema: '',
            outputSchema: '',
            config: {},
            logic: ''
        };
    });

    it('should add a note to the storage through SystemNote', async () => {
        await systemNote.addNote(note1);
        const retrievedNote = await inMemoryStorage.getNote(note1.id);
        expect(retrievedNote).toEqual(note1);
    });

    it('should get a note from the storage through SystemNote', async () => {
        await systemNote.addNote(note1);
        const retrievedNote = await systemNote.getNote(note1.id);
        expect(retrievedNote).toEqual(note1);
    });

    it('should update a note in the storage through SystemNote', async () => {
        await systemNote.addNote(note1);
        const updatedNote = { ...note1, title: 'Updated Test Note' };
        await systemNote.updateNote(updatedNote);
        const retrievedNote = await inMemoryStorage.getNote(note1.id);
        expect(retrievedNote).toEqual(updatedNote);
    });

    it('should delete a note from the storage through SystemNote', async () => {
        await systemNote.addNote(note1);
        await systemNote.deleteNote(note1.id);
        const retrievedNote = await inMemoryStorage.getNote(note1.id);
        expect(retrievedNote).toBeUndefined();
    });
});
