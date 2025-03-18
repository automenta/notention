import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Message from './Message';
import { getSystemNote, onSystemNoteChange } from '../../lib/systemNote';
import { systemLog } from '../../lib/systemLog';
import { NoteImpl } from '../../lib/note';
import { NoteEditor } from '../NoteEditor/NoteEditor';
import styles from './ChatView.module.css';

export const ChatView: React.FC<{ selectedTaskId: string | null }> = ({ selectedTaskId }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const messagesEnd = useRef<HTMLDivElement>(null);
    const system = useMemo(() => getSystemNote(), []); // Memoize system to ensure stability
    const [editingNote, setEditingNote] = useState<boolean>(false);

    useEffect(() => {
        systemLog.debug('ChatView useEffect triggered', 'ChatView');
        if (!selectedTaskId) {
            systemLog.debug('No selected task ID, clearing messages', 'ChatView');
            setMessages([]);
            return;
        }

        const task = system.getNote(selectedTaskId);
        if (!task) {
            systemLog.warn(`Task with ID ${selectedTaskId} not found`, 'ChatView');
            setMessages([]);
            return;
        }

        const initialMessages = task?.type === 'Task' ? task.content?.messages ?? [] : [];
        setMessages(initialMessages);
        systemLog.debug(`Initial messages loaded for task ${selectedTaskId}: ${initialMessages.length}`, 'ChatView');

        // Subscribe to system note changes
        const unsubscribe = onSystemNoteChange(() => {
            const updatedTask = system.getNote(selectedTaskId);
            if (!updatedTask) {
                systemLog.warn(`Task with ID ${selectedTaskId} not found during update`, 'ChatView');
                setMessages([]);
                return;
            }
            setMessages(updatedTask?.type === 'Task' ? updatedTask.content?.messages ?? [] : []);
            systemLog.debug(`Messages updated for task ${selectedTaskId}`, 'ChatView');
        });

        return () => {
            systemLog.debug('ChatView useEffect cleanup', 'ChatView');
            unsubscribe(); // Cleanup subscription
        };
    }, [selectedTaskId, system]); // Dependencies: selectedTaskId and system

    useEffect(() => {
        messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTaskId || !input.trim()) {
            systemLog.debug('Submit prevented: no selected task or empty input', 'ChatView');
            return;
        }

        const task = system.getNote(selectedTaskId);
        if (!task) {
            systemLog.error(`Task with ID ${selectedTaskId} not found on submit`, 'ChatView');
            return;
        }

        const promptContent = input.trim();
        systemLog.debug(`Submitting prompt: ${promptContent} for task ${selectedTaskId}`, 'ChatView');
        const promptNote = await NoteImpl.createTaskNote(`Prompt for ${task.title}`, promptContent, task.priority);

        // Use the LLM to interpret user input and generate logic for promptNote
        try {
            const llm = system.getLLM();
            if (llm) {
                // Include conversation history in the prompt
                const conversationHistory = messages.map(msg => `${msg.type}: ${msg.content}`).join('\n');
                const llmResponse = await llm.invoke(`Here's the conversation history:\n${conversationHistory}\n---\nConvert this to a task plan (JSON format): ${promptContent}`);
                promptNote.data.logic = llmResponse;
                systemLog.info(`LLM generated logic for promptNote: ${llmResponse}`, 'ChatView');
            } else {
                systemLog.warn('LLM not initialized, cannot generate logic for promptNote.', 'ChatView');
            }
        } catch (error: any) {
            systemLog.error(`Error generating logic from LLM: ${error.message}`, 'ChatView');
        }

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
    }, [selectedTaskId, system, input, messages]);

    const handleEditInlineNote = useCallback(() => {
        systemLog.debug('Edit inline note requested', 'ChatView');
        setEditingNote(true);
    }, []);
    const handleSaveInlineNote = useCallback(() => {
        systemLog.debug('Save inline note requested', 'ChatView');
        setEditingNote(false);
    }, []);
    const handleCancelInlineNote = useCallback(() => {
        systemLog.debug('Cancel inline note requested', 'ChatView');
        setEditingNote(false);
    }, []);

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
                {messages.map((msg, i) => <Message key={i} message={msg} />)}
                <div ref={messagesEnd} />
            </div>

            {editingNote && selectedTaskId ? (
                <div className={styles.noteEditorInline}>
                    <h3>Inline Note Editor 📝</h3>
                    <NoteEditor
                        noteId={selectedTaskId}
                        onClose={handleCancelInlineNote}
                        onSave={async (updatedNote) => {
                            if (selectedTaskId) {
                                const task = system.getNote(selectedTaskId);
                                if (task) {
                                    system.updateNote(updatedNote);
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
