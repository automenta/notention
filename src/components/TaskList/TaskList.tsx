import React, { useState, useEffect } from 'react';
import TaskListDisplay from './TaskListDisplay';
import TaskListFilters from './TaskListFilters';
import { Note, NoteSchema } from '../../types';
import styles from './TaskList.module.css';
import { getSystemNote, onSystemNoteChange } from '../../lib/systemNote';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-beautiful-dnd';

const TaskList: React.FC<{ onTaskSelect: (id: string) => void, selectedId: string | null }> = ({
                                                                                                    onTaskSelect,
                                                                                                    selectedId
                                                                                                }) => {
    const [sortBy, setSortBy] = useState<'priority' | 'status' | 'createdAt'>('priority');
    const [filterByStatus, setFilterByStatus] = useState<'active' | 'pending' | 'completed' | 'failed' | 'dormant' | 'bypassed' | 'pendingRefinement'>('pending');
    const [tasks, setTasks] = useState<Note[]>([]);
    const [systemNote, setSystemNote] = useState(getSystemNote());

    useEffect(() => {
        const fetchTasks = async () => {
            const allNotes = await systemNote.getAllNotes();
            const taskNotes = allNotes.filter(note => note.type === 'Task');
            setTasks(taskNotes);
        };

        fetchTasks();
        setSystemNote(getSystemNote());

        const unsubscribe = onSystemNoteChange(() => {
            fetchTasks();
            setSystemNote(getSystemNote());
        });

        return () => unsubscribe();


    }, []);

    const handleSortByChange = (newSortBy: 'priority' | 'status' | 'createdAt') => {
        setSortBy(newSortBy);
    };

    const handleFilterByStatusChange = (newFilterByStatus: 'active' | 'pending' | 'completed' | 'failed' | 'dormant' | 'bypassed' | 'pendingRefinement') => {
        setFilterByStatus(newFilterByStatus);
    };

    const handleOnDragEnd = (result: any) => {
        console.log('drag ended', result);
    };

    const filteredTasks = tasks.filter(task => {
        if (filterByStatus === 'all') return true;
        return task.status === filterByStatus;
    });

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (sortBy === 'priority') {
            return b.priority - a.priority;
        }
        if (sortBy === 'status') {
            return a.status.localeCompare(b.status);
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const handlePriorityChange = (id: string, newPriority: number) => {
        const taskToUpdate = tasks.find(task => task.id === id);
        if (taskToUpdate) {
            const updatedTask = { ...taskToUpdate, priority: newPriority };
            systemNote.updateNote(updatedTask);
        }
    };

    return (
        <DragDropContext onDragEnd={handleOnDragEnd}>
            <div className={styles.taskList}>
                <TaskListFilters sortBy={sortBy} filterByStatus={filterByStatus}
                                 onSortByChange={handleSortByChange}
                                 onFilterByStatusChange={handleFilterByStatusChange}/>
                <TaskListDisplay tasks={sortedTasks} selectedId={selectedId} onTaskSelect={onTaskSelect}
                                 onPriorityChange={handlePriorityChange}/>
            </div>
        </DragDropContext>
    );
};
