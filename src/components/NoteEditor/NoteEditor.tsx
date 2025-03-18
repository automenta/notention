import React, { useState, useEffect, useCallback } from 'react';
import styles from './NoteEditor.module.css';
import { Note, NoteSchema } from '../../types';
import { getSystemNote } from '../../lib/systemNote';
import { NoteImpl } from '../../lib/note';

interface NoteEditorProps {
    noteId: string;
    onClose: () => void;
    onSave: (note: Note) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({noteId, onClose, onSave}) => {
    const [note, setNote] = useState<Note | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState<any>('');
    const systemNote = getSystemNote();

    useEffect(() => {
        const fetchNote = async () => {
            const fetchedNote = await systemNote.getNote(noteId);
            if (fetchedNote) {
                setNote(fetchedNote);
                setTitle(fetchedNote.title);
                setContent(fetchedNote.content);
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

    const handleSave = () => {
        if (!note) return;

        const updatedNote: Note = {
            ...note,
            title: title,
            content: content,
        };

        systemNote.updateNote(updatedNote).then(() => {
            onSave(updatedNote); // Notify parent component that save is complete
        });
    };

    return (
        <div className={styles.noteEditor}>
            <h2>Note Editor</h2>
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
