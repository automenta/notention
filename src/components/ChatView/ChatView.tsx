import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Message from './Message';
import {getSystemNote, onSystemNoteChange} from '../../lib/systemNote';
import {systemLog} from '../../lib/systemLog';
import {NoteImpl} from '../../lib/note';
import {NoteEditor} from '../NoteEditor/NoteEditor';
import styles from './ChatView.module.css';

export const ChatView: React.FC<{ selectedTaskId: string | null }> = ({selectedTaskId}) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const messagesEnd = useRef<HTMLDivElement>(null);
    const system = useMemo(() => getSystemNote(), []); // Memoize system to ensure stability
    const [editingNote, setEditingNote] = useState<boolean>(false);

    useEffect(() => {
        if (!selectedTaskId) {
            setMessages([]);
            return;
        }

        const task = system.getNote(selectedTaskId);
        const initialMessages = task?.type === 'Task' ? task.content?.messages ?? [] : [];
        setMessages(initialMessages);

        // Subscribe to system note changes
        const unsubscribe = onSystemNoteChange(() => {
            const updatedTask = system.getNote(selectedTaskId);
            setMessages(updatedTask?.type === 'Task' ? updatedTask.content?.messages ?? [] : []);
        });

        return unsubscribe; // Cleanup subscription
    }, [selectedTaskId, system]); // Dependencies: selectedTaskId and system

    useEffect(() => {
        messagesEnd.current?.scrollIntoView({behavior: 'smooth'});
    }, [messages]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTaskId || !input.trim()) return;

        const task = system.getNote(selectedTaskId);
        if (!task) return;

        const promptContent = input.trim();
        const promptNote = await NoteImpl.createTaskNote(`Prompt for ${task.title}`, promptContent, task.priority);

        system.addNote(promptNote.data);
        task.references.push(promptNote.data.id);
        task.content.messages = [...(task.content.messages ?? []), {
            type: 'user',
            content: promptContent,
            text: promptContent,
            timestamp: new Date().toISOString()
        }];
        system.updateNote(task);
        system.enqueueNote(promptNote.data.id);

        setInput('');
        systemLog.info(`💬 User input for Task ${selectedTaskId}: ${promptContent}`, 'ChatView');
    }, [selectedTaskId, system, input]);

    const handleEditInlineNote = useCallback(() => setEditingNote(true), []);
    const handleSaveInlineNote = useCallback(() => setEditingNote(false), []);
    const handleCancelInlineNote = useCallback(() => setEditingNote(false), []);

    return (
        <div className={styles.chatView}>
            <div className={styles.chatHeader}>
                <h2>{selectedTaskId ? system.getNote(selectedTaskId)?.title : 'Select a Task to Chat'}</h2>
                {selectedTaskId && !editingNote && (
                    <div className={styles.chatActions}>
                        <button onClick={handleEditInlineNote}>Edit Note</button>
                    </div>
                )}
            </div>

            <div className={styles.messagesContainer}>
                {messages.map((msg, i) => <Message key={i} message={msg}/>)}
                <div ref={messagesEnd}/>
            </div>

            {editingNote && selectedTaskId ? (
                <div className={styles.noteEditorInline}>
                    <h3>Inline Note Editor 📝</h3>
                    <NoteEditor
                        noteId={selectedTaskId}
                        onClose={handleCancelInlineNote}
                        onSave={async (content) => {
                            if (selectedTaskId) {
                                const task = system.getNote(selectedTaskId);
                                if (task) {
                                    system.updateNote({...task, content});
                                    setEditingNote(false);
                                } else {
                                    systemLog.error('Note not found!', 'ChatView');
                                }
                            }
                        }}
                    />
                    <div className={styles.inlineEditorActions}>
                        <button onClick={handleCancelInlineNote}>Cancel</button>
                    </div>
                </div>
            ) : (
                <form className={styles.inputArea} onSubmit={handleSubmit}>
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder='Enter your message...'
                        disabled={!selectedTaskId}
                    />
                    <button type='submit' disabled={!selectedTaskId}>Send</button>
                </form>
            )}

            {!selectedTaskId && !editingNote &&
                <div className={styles.placeholder}>⬅️ Select a task to view messages and interact.</div>}
        </div>
    );
};
