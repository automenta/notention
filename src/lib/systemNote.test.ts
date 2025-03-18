import { InMemoryNoteStorage, GraphDBNoteStorage } from './noteStorage';
import { Note } from '../types';
import idService from './idService';
import { SystemNote, initializeSystemNote, getSystemNote } from './systemNote';
import { ChatOpenAI } from '@langchain/openai';
import * as fs from 'fs';
import path from 'path';
import { SAFE_DIRECTORY, ALLOWED_EXTENSIONS, sanitizeFilename } from './initialTools';

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

    describe('Tool Execution', () => {
        it('should execute a custom tool', async () => {
            // Create a custom tool note
            const customTool: Note = {
                id: idService.generateId(),
                type: 'Tool',
                title: 'Custom Tool',
                content: 'This is a custom tool',
                status: 'active',
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

            // Register the custom tool with the SystemNote
            systemNote.registerToolDefinition({
                ...customTool,
                type: 'custom',
                implementation: async (input: any) => {
                    return { result: `Custom tool executed with input: ${JSON.stringify(input)}` };
                }
            });

            // Execute the custom tool
            const result = await systemNote.executeTool(customTool.id, { input: 'test' });

            // Verify the result
            expect(result).toEqual({ result: 'Custom tool executed with input: {"input":"test"}' });
        });

        it('should execute a langchain tool', async () => {
            // Create a langchain tool note
            const langchainTool: Note = {
                id: idService.generateId(),
                type: 'Tool',
                title: 'Langchain Tool',
                content: 'This is a langchain tool',
                status: 'active',
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

            // Mock a Langchain tool
            const mockLangchainTool = {
                call: jest.fn().mockResolvedValue('Mock Langchain Tool Response'),
            };

            // Register the langchain tool with the SystemNote
            systemNote.registerToolDefinition({
                ...langchainTool,
                type: 'langchain',
                implementation: mockLangchainTool,
            });

            // Execute the langchain tool
            const result = await systemNote.executeTool(langchainTool.id, { input: 'test' });

            // Verify the result
            expect(result).toEqual('Mock Langchain Tool Response');
            expect(mockLangchainTool.call).toHaveBeenCalledWith({ input: 'test' });
        });

        it('should execute an api tool', async () => {
            // Create an api tool note
            const apiTool: Note = {
                id: idService.generateId(),
                type: 'Tool',
                title: 'API Tool',
                content: 'This is an API tool',
                status: 'active',
                priority: 50,
                createdAt: new Date().toISOString(),
                updatedAt: null,
                references: [],
                description: '',
                requiresWebSearch: false,
                inputSchema: '',
                outputSchema: '',
                config: {
                    method: 'POST',
                    headers: JSON.stringify({ 'Content-Type': 'application/json' }),
                },
                logic: 'https://example.com/api', // Replace with a mock API endpoint
            };

            // Mock the fetch function
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ result: 'Mock API Response' }),
            }) as jest.Mock;

            // Register the api tool with the SystemNote
            systemNote.registerToolDefinition(apiTool);

            // Execute the api tool
            const result = await systemNote.executeTool(apiTool.id, { input: 'test' });

            // Verify the result
            expect(result).toEqual({ result: 'Mock API Response' });
            expect(fetch).toHaveBeenCalledWith('https://example.com/api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: 'test' }),
            });
        });

        describe('File Operations Tool', () => {
            const testFilePath = path.join(SAFE_DIRECTORY, 'test.txt');

            afterEach(() => {
                // Clean up test file after each test
                if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath);
                }
            });

            it('should read a file within the safe directory', async () => {
                // Create a test file
                fs.writeFileSync(testFilePath, 'test content', 'utf-8');

                // Execute the file operations tool to read the file
                const result = await systemNote.executeTool('file-operations-tool', {
                    action: 'read',
                    filename: 'test.txt',
                });

                // Verify the result
                expect(result).toEqual({ result: 'test content' });
            });

            it('should write to a file within the safe directory', async () => {
                // Execute the file operations tool to write to the file
                const result = await systemNote.executeTool('file-operations-tool', {
                    action: 'write',
                    filename: 'test.txt',
                    content: 'test content',
                });

                // Verify the result
                expect(result).toEqual({ result: 'File written successfully' });

                // Verify that the file was written to
                const fileContent = fs.readFileSync(testFilePath, 'utf-8');
                expect(fileContent).toBe('test content');
            });

            it('should not read a file outside the safe directory', async () => {
                // Execute the file operations tool to read a file outside the safe directory
                await expect(
                    systemNote.executeTool('file-operations-tool', {
                        action: 'read',
                        filename: '../outside.txt',
                    })
                ).rejects.toThrow('Filename is outside the safe directory.');
            });

            it('should not write to a file outside the safe directory', async () => {
                // Execute the file operations tool to write to a file outside the safe directory
                await expect(
                    systemNote.executeTool('file-operations-tool', {
                        action: 'write',
                        filename: '../outside.txt',
                        content: 'test content',
                    })
                ).rejects.toThrow('Filename is outside the safe directory.');
            });

            it('should not allow reading files with invalid extensions', async () => {
                // Create a test file with an invalid extension
                fs.writeFileSync(path.join(SAFE_DIRECTORY, 'test.exe'), 'test content', 'utf-8');

                // Execute the file operations tool to read the file
                await expect(
                    systemNote.executeTool('file-operations-tool', {
                        action: 'read',
                        filename: 'test.exe',
                    })
                ).rejects.toThrow('Invalid file extension. Allowed extensions are: .txt, .md, .json, .js');
            });

             it('should create a directory within the safe directory', async () => {
                const testDirectoryPath = path.join(SAFE_DIRECTORY, 'test_directory');

                // Execute the file operations tool to create the directory
                const result = await systemNote.executeTool('file-operations-tool', {
                    action: 'createDirectory',
                    filename: 'test_directory',
                });

                // Verify the result
                expect(result).toEqual({ result: 'Directory created successfully' });

                // Verify that the directory was created
                expect(fs.existsSync(testDirectoryPath)).toBe(true);

                // Clean up the test directory after the test
                fs.rmdirSync(testDirectoryPath);
            });

            it('should delete a file within the safe directory', async () => {
                // Create a test file
                fs.writeFileSync(testFilePath, 'test content', 'utf-8');

                // Execute the file operations tool to delete the file
                const result = await systemNote.executeTool('file-operations-tool', {
                    action: 'deleteFile',
                    filename: 'test.txt',
                });

                // Verify the result
                expect(result).toEqual({ result: 'File deleted successfully' });

                // Verify that the file was deleted
                expect(fs.existsSync(testFilePath)).toBe(false);
            });
        });
    });
});
