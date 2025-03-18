import React, { useCallback, useState } from 'react';
import styles from './ChatView.module.css';
import { getSystemNote } from '../../lib/systemNote';

interface ToolStepEditorProps {
    toolId: string;
    inputValues: any;
    onChange: (inputName: string, value: any) => void;
    onSave: () => void;
    onCancel: () => void;
    onGenerate?: () => void;
}

export const ToolStepEditor: React.FC<ToolStepEditorProps> = ({
    toolId,
    inputValues,
    onChange,
    onSave,
    onCancel,
    onGenerate,
}) => {
    const [generating, setGenerating] = useState(false);
    const system = getSystemNote();
    const tool = system.getTool(toolId);

    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, inputName: string) => {
        onChange(inputName, event.target.value);
    }, [onChange]);

    const handleGenerate = useCallback(() => {
        if (onGenerate) {
            setGenerating(true);
            onGenerate()
                .finally(() => setGenerating(false));
        }
    }, [onGenerate]);

    if (!tool || !tool.inputSchema) {
        return <div>Tool or input schema not found.</div>;
    }

    const inputSchema = JSON.parse(tool.inputSchema);

    return (
        <div className={styles.toolInputForm}>
            <h3>Edit Input Parameters for {tool.title}</h3>
            <p className={styles.toolDescription}>{tool.content}</p>
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
