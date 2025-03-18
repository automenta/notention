import React, { useCallback, useState, useEffect } from 'react';
import styles from './ChatView.module.css';
import { getSystemNote } from '../../lib/systemNote';
import { Note } from '../../types';

interface ToolStepEditorProps {
    note: Note; // Pass the entire note as a prop
    onChange: (note: Note) => void; // Callback to update the note
    onSave: () => void;
    onCancel: () => void;
    onGenerate?: () => void;
}

export const ToolStepEditor: React.FC<ToolStepEditorProps> = ({
    note,
    onChange,
    onSave,
    onCancel,
    onGenerate,
}) => {
    const [generating, setGenerating] = useState(false);
    const system = getSystemNote();
    const tool = system.getTool(note.logic ? JSON.parse(note.logic)?.steps?.[0]?.toolId : ''); // Get tool from the note's logic

    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, inputName: string) => {
        // Update the inputValues within the note's logic
        const updatedLogic = { ...JSON.parse(note.logic || '{}') };
        if (updatedLogic.steps && updatedLogic.steps.length > 0) {
            updatedLogic.steps[0].input = { ...updatedLogic.steps[0].input, [inputName]: event.target.value };
        }
        const updatedNote = { ...note, logic: JSON.stringify(updatedLogic) };
        onChange(updatedNote);
    }, [onChange, note]);

    const handleGenerate = useCallback(() => {
        if (onGenerate) {
            setGenerating(true);
            onGenerate()
                .finally(() => setGenerating(false));
        }
    }, [onGenerate]);

    const handleRequiresWebSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const updatedNote = { ...note, requiresWebSearch: event.target.checked };
        onChange(updatedNote);
    }, [onChange, note]);

    useEffect(() => {
        // Parse the logic and initialize inputValues when the component mounts or when the note changes
    }, [note]);

    if (!tool || !tool.inputSchema) {
        return <div>Tool or input schema not found.</div>;
    }

    const inputSchema = JSON.parse(tool.inputSchema);
    const inputValues = JSON.parse(note.logic || '{}')?.steps?.[0]?.input || {};

    return (
        <div className={styles.toolInputForm}>
            <h3>Edit Input Parameters for {tool.title}</h3>
            <p className={styles.toolDescription}>{tool.content}</p>

            {/* User Override for Web Search */}
            <div className={styles.inputGroup}>
                <label htmlFor="requiresWebSearch">Requires Web Search:</label>
                <input
                    type="checkbox"
                    id="requiresWebSearch"
                    checked={note.requiresWebSearch !== undefined ? note.requiresWebSearch : false}
                    onChange={handleRequiresWebSearchChange}
                />
            </div>

            {Object.entries(inputSchema.properties).map(([inputName, inputDetails]: [string, any]) => (
                <div key={inputName} className={styles.inputGroup}>
                    <label htmlFor={inputName}>{inputDetails.description || inputName}:</label>
                    {inputDetails.inputType === 'textarea' && (
                        <textarea
                            id={inputName}
                            value={inputValues[inputName] || ''}
                            onChange={(e) => handleInputChange(e, inputName)}
                        />
                    )}
                    {inputDetails.inputType === 'select' && (
                        <select
                            id={inputName}
                            value={inputValues[inputName] || ''}
                            onChange={(e) => handleInputChange(e, inputName)}
                        >
                            {inputDetails.options && inputDetails.options.map((option: string) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    )}
                    {inputDetails.type === 'string' && !inputDetails.inputType && (
                        <input
                            type="text"
                            id={inputName}
                            value={inputValues[inputName] || ''}
                            onChange={(e) => handleInputChange(e, inputName)}
                        />
                    )}
                    {inputDetails.type === 'number' && (
                        <input
                            type="number"
                            id={inputName}
                            value={inputValues[inputName] || ''}
                            onChange={(e) => handleInputChange(e, inputName)}
                        />
                    )}
                    {inputDetails.type === 'boolean' && (
                        <input
                            type="checkbox"
                            id={inputName}
                            checked={inputValues[inputName] || false}
                            onChange={(e) => handleInputChange(e, inputName)}
                        />
                    )}
                    {/* Add more input types as needed */}
                </div>
            ))}
            <button onClick={onSave}>Save</button>
            <button onClick={onCancel}>Cancel</button>
            {onGenerate && (
                <button onClick={handleGenerate} disabled={generating}>
                    {generating ? 'Generating...' : 'Generate Inputs'}
                </button>
            )}
        </div>
    );
};
