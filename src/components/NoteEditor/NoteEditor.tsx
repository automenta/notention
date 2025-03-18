import React, {useEffect, useState, useCallback} from 'react';
import styles from './NoteEditor.module.css';
import {getSystemNote} from '../../lib/systemNote';
import MonacoEditor from 'react-monaco-editor';
import {Note} from '../../types';

interface NoteEditorProps {
    noteId: string;
    onClose: () => void;
    onSave: (note: Note) => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({noteId, onClose, onSave}) => {
    const [note, setNote] = useState<Note | undefined>(undefined);
    const [title, setTitle] = useState<string>('');
    const [content, setContent] = useState<string>('');
    const [logic, setLogic] = useState<string>('');
    const [validationError, setValidationError] = React.useState<string | null>(null);
    const system = getSystemNote();

    useEffect(() => {
        const currentNote = system.getNote(noteId);
        if (currentNote) {
            setNote(currentNote);
            setTitle(currentNote.title || '');
            setContent(currentNote.content || '');
            setLogic(currentNote.logic || '');
        }
    }, [noteId, system]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    const handleContentChange = (value: string) => {
        setContent(value);
    };

    const handleLogicChange = (value: string) => {
        setLogic(value);
    };

    const handleSave = () => {
        if (!note) {
            alert('Note not found!');
            return;
        }

        let parsedLogic;
        try {
            parsedLogic = JSON.parse(logic);
            setValidationError(null); // Clear error if parsing succeeds
        } catch (e: any) {
            setValidationError(`JSON Parse Error: ${e.message}`);
            return; // Do not save if JSON is invalid
        }

        const updatedNote: Note = {
            ...note,
            title: title,
            content: content,
            logic: logic,
        };

        onSave(updatedNote);
    };

    const editorOptions = {
        selectOnLineNumbers: true,
        roundedSelection: false,
        readOnly: false,
        cursorStyle: 'line',
        automaticLayout: true,
    };

    return (
        <div className={styles.noteEditor}>
            <h3>Title</h3>
            <input
                type="text"
                value={title}
                onChange={handleTitleChange}
            />

            <h3>Content</h3>
            <MonacoEditor
                width="800"
                height="200"
                language="markdown"
                theme="vs-dark"
                value={content}
                options={editorOptions}
                onChange={handleContentChange}
            />

            <h3>Logic (JSON)</h3>
            <MonacoEditor
                width="800"
                height="400"
                language="json"
                theme="vs-dark"
                value={logic}
                options={editorOptions}
                onChange={handleLogicChange}
            />

            {validationError &&
            <div className={styles.validationError}>⚠️ {validationError}</div>}
            <div className={styles.editorActions}>
                <button onClick={handleSave}>Save</button>
                <button onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
};
