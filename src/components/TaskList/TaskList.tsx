import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { getSystemNote, onSystemNoteChange } from '../../lib/systemNote';
import { Note } from '../../types';
import styles from './TaskList.module.css';
import { TaskListDisplay } from './TaskListDisplay';
import { TaskListFilters } from './TaskListFilters';
import { TaskCreation } from './TaskCreation';

export const TaskList: React.FC<{
    onTaskSelect: (id: string | null) => void;
    onEditNote: () => void;
}> = ({ onTaskSelect, onEditNote }) => {
    const [tasks, setTasks] = useState<Note[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'priority' | 'status' | 'createdAt'>('priority');
    const [filterByStatus, setFilterByStatus] = useState<'active' | 'pending' | 'completed' | 'failed' | 'dormant' | 'bypassed' | 'pendingRefinement' | 'all'>('all');
    const system = getSystemNote();

    const updateTasks = useCallback(() => {
        const newTasks = system.getAllNotes().filter(n => n.type === 'Task');
        setTasks(prevTasks => {
            if (JSON.stringify(prevTasks) !== JSON.stringify(newTasks)) {
                return newTasks;
            }
            return prevTasks;
        });
    }, [system]);

    useEffect(() => {
        updateTasks();
        const unsubscribe = onSystemNoteChange(updateTasks);
        return unsubscribe;
    }, [system, updateTasks]);

    const sortedAndFilteredTasks = useMemo(() => {
        let sortedTasks = [...tasks];
        if (sortBy === 'priority') sortedTasks.sort((a, b) => b.priority - a.priority);
        if (sortBy === 'createdAt') sortedTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (sortBy === 'status') sortedTasks.sort((a, b) => a.status.localeCompare(b.status));
        return filterByStatus === 'all' ? sortedTasks : sortedTasks.filter(task => task.status === filterByStatus);
    }, [tasks, sortBy, filterByStatus]);

    const handleChangePriority = useCallback((id: string, priority: number) => {
        const note = system.getNote(id);
        if (note) system.updateNote({ ...note, priority });
    }, [system]);

    const handleSelectTask = useCallback((id: string) => {
        setSelectedId(id);
        onTaskSelect(id);
    }, [onTaskSelect]);

    const onDragEnd = useCallback((result: any) => {
        if (!result.destination) {
            return;
        }

        const items = Array.from(sortedAndFilteredTasks);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update the tasks state with the new order
        setTasks(items);

        // Persist the new order in the system note
        // Instead of updating the entire notes map, update only the task notes
        items.forEach((task, index) => {
            const note = system.getNote(task.id);
            if (note) {
                system.updateNote({ ...note, priority: index }); // Update priority to reflect order
            }
        });
    }, [system, sortedAndFilteredTasks]);

    const handleRunTask = useCallback(() => {
        if (selectedId) {
            system.runNote(selectedId);
        }
    }, [system, selectedId]);

    const handleArchiveTask = useCallback(() => {
        console.log('Archive Task clicked');
    }, []);

    const handleDeleteTask = useCallback(() => {
        console.log('Delete Task clicked');
    }, []);

    const handleAddToolStep = useCallback(() => {
        console.log('Add Tool Step clicked');
    }, []);

    const handleTaskAdd = useCallback(() => {
        updateTasks();
    }, [updateTasks]);

    return (
        <div className={styles.taskList}>
            <h2>Tasks 🚀</h2>

            <TaskCreation onTaskAdd={handleTaskAdd} />

            <TaskListFilters
                sortBy={sortBy}
                filterByStatus={filterByStatus}
                onSortByChange={setSortBy}
                onFilterByStatusChange={setFilterByStatus}
            />

            <TaskListDisplay
                tasks={sortedAndFilteredTasks}
                selectedId={selectedId}
                onTaskSelect={handleSelectTask}
                onPriorityChange={handleChangePriority}
                onDragEnd={onDragEnd}
            />

            {selectedId && (
                <div className={styles.taskListActions}>
                    <button onClick={handleRunTask}>Run Task</button>
                    <button onClick={onEditNote}>Edit Note</button>
                    <button onClick={handleArchiveTask}>Archive</button>
                    <button className={styles.deleteButton} onClick={handleDeleteTask}>Delete</button>
                    <button onClick={handleAddToolStep}>Add Tool Step</button>
                </div>
            )}
        </div>
    );
};
