import { Note } from '../../types';
import idService from '../idService';
import { SystemNote, getSystemNote } from '../systemNote';
import { systemLog } from '../systemLog';
import * as fs from 'fs';
import path from 'path';
import { SAFE_DIRECTORY, ALLOWED_EXTENSIONS, sanitizeFilename } from '../initialTools';

export const registerFileOperationsTool = (systemNote: SystemNote) => {
    const fileOperationsToolData: Note = {
        id: idService.generateId(),
        type: 'Tool',
        title: 'File Operations Tool',
        content: `A tool to read and write local files within the safe directory: ${SAFE_DIRECTORY} (SECURITY WARNING).`,
        logic: {
            "steps": [
                {
                    "id": "read-file",
                    "type": "passthrough",
                    "input": "{filename}"
                },
                {
                    "id": "write-file",
                    "type": "passthrough",
                    "input": "{filename, content}"
                }
            ],
        },
        status: 'active',
        priority: 50,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        references: [],
        inputSchema: JSON.stringify({
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['read', 'write', 'createDirectory', 'deleteFile'],
                    description: 'Action to perform',
                    inputType: 'select', // Specify inputType as select
                },
                filename: { type: 'string', description: 'Filename' },
		        content: { type: 'string', description: 'Content to write', inputType: 'textarea' }
            },
            required: ['action', 'filename', 'content']
        }),
        outputSchema: JSON.stringify({
            type: 'object',
            properties: {
                result: { type: 'string', description: 'Result of the operation' }
            }
        }),
        description: 'Reads and writes local files within a safe directory (SECURITY WARNING).',
    };

    const fileOperationsToolImplementation = async (input: any) => {
         try {
            if (!input || !input.filename || !input.action) {
                throw new Error('Invalid input: Action and filename are required.');
            }

            const action = input.action;
            let filename = sanitizeFilename(input.filename); // Sanitize the filename
            filename = path.resolve(SAFE_DIRECTORY, filename); // Resolve the full path

            // More robust check to ensure the resolved path is within the safe directory
            if (!filename.startsWith(SAFE_DIRECTORY + path.sep)) {
                throw new Error('Access denied: Filename is outside the safe directory.');
            }

             // Check if the file exists before attempting to read or delete it
            if (action === 'read' || action === 'deleteFile') {
                if (!fs.existsSync(filename)) {
                    throw new Error('File not found.');
                }
            }

            // Validate file extension
            const ext = path.extname(filename).toLowerCase();
	    //console.log(`action=${action} filename=${filename} ext=${ext} ALLOWED_EXTENSIONS=${ALLOWED_EXTENSIONS}`)
            if (action !== 'createDirectory' && !ALLOWED_EXTENSIONS.includes(ext)) {
                throw new Error(`Access denied: Invalid file extension. Allowed extensions are: ${ALLOWED_EXTENSIONS.join(', ')}`);
            }

            if (action === 'read') {
                const content = fs.readFileSync(filename, 'utf-8');
                return { result: content };
            } else if (action === 'write') {
                 if (input.content === undefined || input.content === null) {
                    throw new Error('Invalid input: Content is required for write action.');
                }
                // Ensure the content is a string before writing
                const contentToWrite = String(input.content);
                fs.writeFileSync(filename, contentToWrite, 'utf-8');
                return { result: 'File written successfully' };
            } else if (action === 'createDirectory') {
	         // Check if the directory already exists
                if (fs.existsSync(filename)) {
                    throw new Error('Directory already exists.');
                }
                fs.mkdirSync(filename, { recursive: true });
                return { result: 'Directory created successfully' };
            } else if (action === 'deleteFile') {
                fs.unlinkSync(filename);
                return { result: 'File deleted successfully' };
            } else {
                throw new Error('Invalid action');
            }
        } catch (error: any) {
            systemLog.error(`File operation failed: ${error.message}`, 'FileOperationsTool');
            return { result: `Error: ${error.message}` };
        }
    };
    systemNote.registerToolDefinition({ ...fileOperationsToolData, implementation: fileOperationsToolImplementation, type: 'custom' });
    systemLog.info(`🔨 Registered Tool ${fileOperationsToolData.id}: ${fileOperationsToolData.title}`, 'SystemNote');
};
