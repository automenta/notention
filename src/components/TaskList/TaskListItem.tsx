import React, { useCallback } from 'react';
import { Note } from '../../types';
import styles from './TaskList.module.css';

interface TaskListItemProps {
    task: Note;
    onPriorityChange: (id: string, priority: number) => void;
    onClick: (id: string) => void;
    isSelected: boolean;
}

// TaskListItem component - Displays a single task item in the TaskList
const TaskListItem: React.FC<TaskListItemProps> = ({ task, onPriorityChange, onClick, isSelected }) => {
    const handlePriorityChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        const newPriority = parseInt(event.target.value, 10);
        onPriorityChange(task.id, newPriority);
    }, [onPriorityChange, task.id]);

    const handleClick = useCallback(() => {
        onClick(task.id);
    }, [onClick, task.id]);

    const statusColor = () => {
        switch (task.status) {
            case 'running': return '#007bff'; // Blue
            case 'completed': return '#4CAF50'; // Green
            case 'failed': return '#f44336'; // Red
            case 'pending': return '#ffc107'; // Yellow
            case 'dormant': return '#9e9e9e'; // Grey
            case 'active': return '#28a745'; // A brighter green for active
            case 'bypassed': return '#6c757d'; // A muted grey for bypassed
            case 'pendingRefinement': return '#ffa000'; // Orange for pending refinement
            default: return '#fff'; // White
        }
    };

    return (
        <div
            className={`${styles.taskListItem} ${isSelected ? styles.selected : ''}`}
            onClick={handleClick}
        >
            <div className={styles.taskItemHeader}>
                <h3>{task.title}</h3>
                <span className={styles.taskStatus} style={{ backgroundColor: statusColor() }}>
                    {task.status.toUpperCase()}
                </span>
            </div>
            <p>{task.content?.text}</p>

            <div className={styles.taskActions}>
                <select
                    value={task.priority}
                    onChange={handlePriorityChange}
                    className={styles.prioritySelect}
                >
                    <option value={100}>High Priority</option>
                    <option value={75}>Medium-High</option>
                    <option value={50}>Medium</option>
                    <option value={25}>Low-Medium</option>
                    <option value={0}>Low Priority</option>
                </select>
            </div>
        </div>
    );
};

export default TaskListItem;
