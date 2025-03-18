import React, { useCallback, useState, useEffect } from 'react';
import { getSystemNote } from '../../lib/systemNote';
import { Note } from '../../types';
import styles from './TaskList.module.css';
import { NoteImpl } from "../../lib/note";

interface TaskCreationProps {
    onTaskAdd: () => void;
}

export const TaskCreation: React.FC<TaskCreationProps> = ({ onTaskAdd }) => {
    const [showToolSelector, setShowToolSelector] = useState(false);
    const [availableTools, setAvailableTools] = useState<Note[]>([]);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [availableTemplates, setAvailableTemplates] = useState<Note[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [selectedToolId, setSelectedToolId] = useState<string | null>(null); // Track selected tool
    const system = getSystemNote();

    useEffect(() => {
        setAvailableTools(system.getAllTools());
        setAvailableTemplates(system.getAllNotes().filter(n => n.type === 'Template'));
    }, [system]);

    const handleAddTask = useCallback(() => {
        if (selectedToolId) {
            // Create a task with the selected tool
            const selectedTool = system.getTool(selectedToolId);
            const taskTitle = selectedTool ? `Task with ${selectedTool.title}` : 'New Task with Tool';

            const newLogic = {
                steps: [
                    {
                        id: `tool-${Date.now()}`,
                        type: 'tool',
                        toolId: selectedToolId,
                        input: { /* Define input parameters here */ }
                    }
                ]
            };

            NoteImpl.createTaskNote(taskTitle, 'Describe your task here...').then(noteImpl => {
                noteImpl.data.logic = JSON.stringify(newLogic);
                system.addNote(noteImpl.data);
            });
            setShowToolSelector(false);
            setSelectedToolId(null);
        } else {
            // Create a basic task
            NoteImpl.createTaskNote('New Task', 'Describe your task here...').then(noteImpl => system.addNote(noteImpl.data));
        }
        onTaskAdd();
    }, [system, selectedToolId, onTaskAdd]);

    const handleCreateFromTemplate = useCallback(() => {
        setShowTemplateSelector(true);
    }, []);

    const handleSelectTemplate = useCallback((templateId: string) => {
        setShowTemplateSelector(false);
        setSelectedTemplateId(templateId);
        const template = system.getNote(templateId);
        if (template) {
            NoteImpl.createTaskNote(template.title, template.content, template.priority).then(noteImpl => {
                noteImpl.data.logic = template.logic;
                system.addNote(noteImpl.data);
            });
        }
        onTaskAdd();
    }, [system, onTaskAdd]);

    const handleSelectTool = useCallback((toolId: string) => {
        console.log('Selected tool:', toolId);
        setSelectedToolId(toolId); // Set selected tool
    }, []);

    const handleShowToolSelector = useCallback(() => {
        setShowToolSelector(true); // Show tool selector
    }, []);

    return (
        <div>
            <div className={styles.taskListActions}>
                <button onClick={handleAddTask}>+ Add Task</button>
                <button onClick={handleCreateFromTemplate}>Create from Template</button>
            </div>

            {showTemplateSelector && (
                <div className={styles.templateSelector}>
                    <h3>Select a Template</h3>
                    <ul>
                        {availableTemplates.map(template => (
                            <li key={template.id} onClick={() => handleSelectTemplate(template.id)}>
                                {template.title}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {!showToolSelector ? (
                <button onClick={handleShowToolSelector}>+ Add Task with Tool</button>
            ) : (
                <div className={styles.toolSelector}>
                    <h3>Select a Tool</h3>
                    <ul>
                        {availableTools.map(tool => (
                            <li key={tool.id}
                                onClick={() => handleSelectTool(tool.id)}
                                className={selectedToolId === tool.id ? styles.selected : ''}>
                                {tool.title}
                            </li>
                        ))}
                    </ul>
                    <button onClick={handleAddTask}>Create Task with Selected Tool</button>
                </div>
            )}
        </div>
    );
};
