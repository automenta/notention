import React, { useState, useEffect } from 'react';
import styles from './NoteEditor.module.css';
import { getSystemNote } from '../../lib/systemNote';

interface NoteEditorProps {
    noteId: string;
    onClose: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ noteId, onClose }) => {
    const [noteContent, setNoteContent] = useState<string>('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const system = getSystemNote();

    useEffect(() => {
        const note = system.getNote(noteId);
        if (note) {
            setNoteContent(JSON.stringify(note, null, 2) || '');
        }
    }, [noteId, system]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNoteContent(e.target.value);
        setValidationError(null); // Clear previous errors on edit
    };

    const handleSave = () => {
        let parsedContent;
        try {
            parsedContent = JSON.parse(noteContent);
            setValidationError(null); // Clear error if parsing succeeds
        } catch (e: any) {
            setValidationError(`JSON Parse Error: ${e.message}`);
            return; // Do not save if JSON is invalid
        }

        const currentNote = system.getNote(noteId);
        if (currentNote) {
            system.updateNote({ ...currentNote, ...parsedContent }); // Basic merge - adjust as needed
            onClose();
            alert('Note content updated (Save action stubbed)'); // Save confirmation (stubbed)
        } else {
            alert('Note not found!');
        }
    };

    return (
        <div className={styles.noteEditor}>
            <textarea
                className={styles.editorTextarea}
                value={noteContent}
                onChange={handleContentChange}
                placeholder="Enter Note Content (JSON)"
            />
             {validationError && <div className={styles.validationError}>⚠️ ${validationError}</div>} {/* Display error message */}
            <div className={styles.editorActions}>
                <button onClick={handleSave} disabled>Save (Stubbed)</button> {/* Save button is stubbed */}
                <button onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
};
