import React, {useCallback, useEffect, useState} from 'react';
import TaskListItem from './TaskListItem';
import {getSystemNote, onSystemNoteChange} from '../../lib/systemNote';
import {Note} from '../../types';
import styles from './TaskList.module.css';
import {NoteImpl} from "../../lib/note";

export const TaskList: React.FC<{
    onTaskSelect: (id: string | null) => void;
    onEditNote: () => void;
}> = ({onTaskSelect, onEditNote}) => {
    const [tasks, setTasks] = useState<Note[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'priority' | 'status' | 'createdAt'>('priority');
    const [filterByStatus, setFilterByStatus] = useState<'active' | 'pending' | 'completed' | 'failed' | 'dormant' | 'bypassed' | 'pendingRefinement' | 'all'>('all');
    const system = getSystemNote();
    const [showToolSelector, setShowToolSelector] = useState(false);
    const [availableTools, setAvailableTools] = useState<Note[]>([]);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [availableTemplates, setAvailableTemplates] = useState<Note[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    useEffect(() => {
        const updateTasks = () => {
            const newTasks = system.getAllNotes().filter(n => n.type === 'Task');
            setTasks(prevTasks => {
                // Only update if tasks have actually changed
                if (JSON.stringify(prevTasks) !== JSON.stringify(newTasks)) {
                    return newTasks;
                }
                return prevTasks;
            });
        };
        updateTasks();
        const unsubscribe = onSystemNoteChange(updateTasks);
        return unsubscribe;
    }, [system]);

    useEffect(() => {
        setAvailableTools(system.getAllTools());
        setAvailableTemplates(system.getAllNotes().filter(n => n.type === 'Template'));
    }, [system]);

    // Compute sorted and filtered tasks in render phase
    const sortedAndFilteredTasks = (() => {
        let sortedTasks = [...tasks];
        if (sortBy === 'priority') sortedTasks.sort((a, b) => b.priority - a.priority);
        if (sortBy === 'createdAt') sortedTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (sortBy === 'status') sortedTasks.sort((a, b) => a.status.localeCompare(b.status));
        return filterByStatus === 'all' ? sortedTasks : sortedTasks.filter(task => task.status === filterByStatus);
    })();

    const changePriority = useCallback((id: string, priority: number) => {
        const note = system.getNote(id);
        if (note) system.updateNote({...note, priority});
    }, [system]);

    const selectTask = useCallback((id: string) => {
        setSelectedId(id);
        onTaskSelect(id);
    }, [onTaskSelect]);

    const handleAddTask = useCallback(() => {
        NoteImpl.createTaskNote('New Task', 'Describe your task here...').then(noteImpl => system.addNote(noteImpl.data));
    }, [system]);

    const handleRunTask = useCallback(() => {
        if (selectedId) {
            system.runNote(selectedId); // Call system.runNote with selectedId
        }
    }, [selectedId, system]);

    const handleArchiveTask = useCallback(() => {
        if (selectedId) alert(`Archive Task: ${selectedId}`);
    }, [selectedId]);

    const handleDeleteTask = useCallback(() => {
        if (selectedId && window.confirm(`Delete Task ${selectedId}?`)) {
            system.deleteNote(selectedId);
            onTaskSelect(null);
        }
    }, [selectedId, system, onTaskSelect]);

    const handleAddToolStep = useCallback(() => {
        setShowToolSelector(true);
    }, []);

    const handleSelectTool = useCallback((toolId: string) => {
        setShowToolSelector(false);
        if (selectedId) {
            const task = system.getNote(selectedId);
            if (task) {
                try {
                    const newStep = {
                        id: `toolStep-${Date.now()}`,
                        type: 'invoke',
                        runnable: {
                            $type: 'Tool',
                            name: toolId
                        }
                    };

                    let logic;
                    if (task.logic) {
                        logic = JSON.parse(task.logic);
                        logic.steps = [...logic.steps, newStep];
                    } else {
                        logic = {steps: [newStep]};
                    }
                    task.logic = JSON.stringify(logic);
                    system.updateNote(task);
                } catch (e) {
                    alert('Error adding tool step.');
                }
            }
        }
    }, [selectedId, system]);

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
    }, [system]);

    return (
        <div className={styles.taskList}>
            <h2>Tasks 🚀</h2>
            <div className={styles.taskListActions}>
                <button onClick={handleAddTask}>+ Add Task</button>
                {selectedId && (
                    <>
                        <button onClick={handleRunTask}>Run Task</button>
                        <button onClick={onEditNote}>Edit Note</button>
                        <button onClick={handleArchiveTask}>Archive</button>
                        <button className={styles.deleteButton} onClick={handleDeleteTask}>Delete</button>
                        <button onClick={handleAddToolStep}>Add Tool Step</button>
                    </>
                )}
            </div>

            <div className={styles.taskListFilters}>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as 'priority' | 'status' | 'createdAt')}>
                    <option value="priority">Sort by Priority</option>
                    <option value="createdAt">Sort by Date</option>
                    <option value="status">Sort by Status</option>
                </select>
                <select value={filterByStatus}
                        onChange={e => setFilterByStatus(e.target.value as 'active' | 'pending' | 'completed' | 'failed' | 'dormant' | 'bypassed' | 'pendingRefinement' | 'all')}>
                    <option value="all">Show All</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="dormant">Dormant</option>
                    <option value="bypassed">Bypassed</option>
                    <option value="pendingRefinement">Pending Refinement</option>
                </select>
            </div>

            <button onClick={handleCreateFromTemplate}>Create from Template</button>

            <div className={styles.taskListItems}>
                {sortedAndFilteredTasks.map(task => (
                    <TaskListItem
                        key={task.id}
                        task={task}
                        onPriorityChange={changePriority}
                        onClick={selectTask}
                        isSelected={task.id === selectedId}
                    />
                ))}
            </div>

            {showToolSelector && (
                <div className={styles.toolSelector}>
                    <h3>Select a Tool</h3>
                    <ul>
                        {availableTools.map(tool => (
                            <li key={tool.id} onClick={() => handleSelectTool(tool.id)}>
                                {tool.title}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

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
        </div>
    );
};
