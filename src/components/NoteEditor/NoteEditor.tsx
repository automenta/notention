import React, { useState, useEffect, useCallback } from 'react';
import styles from './NoteEditor.module.css';
import { Note, NoteSchema } from '../../types';
import { getSystemNote } from '../../lib/systemNote';
import { NoteImpl } from '../../lib/note';
import idService from '../../lib/idService';

interface NoteEditorProps {
    noteId: string | null;
    onClose: () => void;
    onSave: (note: Note) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ noteId, onClose, onSave }) => {
    const [note, setNote] = useState<Note | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState<any>('');
    const [error, setError] = useState<string | null>(null);
    const systemNote = getSystemNote();

    useEffect(() => {
        const fetchNote = async () => {
            if (noteId) {
                const fetchedNote = await systemNote.getNote(noteId);
                if (fetchedNote) {
                    setNote(fetchedNote);
                    setTitle(fetchedNote.title);
                    setContent(fetchedNote.content);
                }
            } else {
                // Initialize for new note creation
                setNote(null);
                setTitle('');
                setContent('Write a summary of...');
            }
        };

        fetchNote();
    }, [noteId, systemNote]);

    const handleTitleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(event.target.value);
    }, [title]);

    const handleContentChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(event.target.value);
    }, [content]);

    const handleSave = async () => {
        if (!title.trim()) {
            setError('Title cannot be empty.');
            return;
        }

        setError(null);

        if (note) {
            // Update existing note
            const updatedNote: Note = {
                ...note,
                title: title,
                content: content,
            };

            await systemNote.updateNote(updatedNote);
            onSave(updatedNote); // Notify parent component that save is complete
        } else {
            // Create a new note
            const newNoteImpl = await NoteImpl.createTaskNote(title, content);
            await systemNote.addNote(newNoteImpl.data);
            onSave(newNoteImpl.data); // Notify parent component that save is complete
        }
        onClose();
    };

    return (
        <div className={styles.noteEditor}>
            <h2>Note Editor</h2>
            {error && <div className={styles.error}>{error}</div>}
            <label htmlFor="title">Title:</label>
            <input
                type="text"
                id="title"
                value={title}
                onChange={handleTitleChange}
            />
            <label htmlFor="content">Content:</label>
            <textarea
                id="content"
                value={content}
                onChange={handleContentChange}
            />
            <div className={styles.buttons}>
                <button onClick={handleSave}>Save</button>
                <button onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

export default NoteEditor;
