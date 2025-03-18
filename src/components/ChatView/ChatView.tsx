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
    const [showToolSelector, setShowToolSelector] = useState(false);
    const [availableTools, setAvailableTools] = useState<any[]>([]);
    const [selectedTool, setSelectedTool] = useState<string | null>(null);
    const [toolInputValues, setToolInputValues] = useState<any>({});
    const [addingTool, setAddingTool] = useState(false);
    const [editingToolStep, setEditingToolStep] = useState<string | null>(null); // Track the tool step being edited

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

    useEffect(() => {
        setAvailableTools(system.getAllTools());
    }, [system]);

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

    const handleAddToolStep = useCallback(() => {
        setShowToolSelector(true);
    }, []);

    const handleSelectTool = useCallback((toolId: string) => {
        setSelectedTool(toolId);
        setAddingTool(true); // Show the input form
    }, []);

    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, inputName: string) => {
        setToolInputValues({
            ...toolInputValues,
            [inputName]: event.target.value,
        });
    }, [toolInputValues]);

    const handleAddSelectedTool = useCallback(() => {
        if (!selectedTaskId || !selectedTool) {
            systemLog.warn('Cannot add tool: no task or tool selected.', 'ChatView');
            return;
        }

        const task = system.getNote(selectedTaskId);
        if (!task) {
            systemLog.error(`Task with ID ${selectedTaskId} not found.`, 'ChatView');
            return;
        }

        const newLogic = {
            steps: [
                ...(task.logic ? JSON.parse(task.logic).steps : []),
                {
                    id: `tool-${Date.now()}`,
                    type: 'tool',
                    toolId: selectedTool,
                    input: toolInputValues, // Use the input values from the form
                }
            ]
        };

        task.logic = JSON.stringify(newLogic);
        system.updateNote(task);
        setShowToolSelector(false);
        setSelectedTool(null);
        setToolInputValues({}); // Reset input values
        setAddingTool(false);
        systemLog.info(`Tool ${selectedTool} added to Task ${selectedTaskId}`, 'ChatView');
    }, [selectedTaskId, selectedTool, system, toolInputValues]);

    const handleCancelAddTool = useCallback(() => {
        setShowToolSelector(false);
        setSelectedTool(null);
        setToolInputValues({});
        setAddingTool(false);
    }, []);

    const selectedToolData = useMemo(() => {
        if (selectedTool) {
            return system.getTool(selectedTool);
        }
        return null;
    }, [selectedTool, system]);

    const handleEditToolStep = useCallback((stepId: string) => {
        setEditingToolStep(stepId);
        // Find the task and the step
        if (!selectedTaskId) return;
        const task = system.getNote(selectedTaskId);
        if (!task || !task.logic) return;

        const logic = JSON.parse(task.logic);
        const step = logic.steps.find((s: any) => s.id === stepId);

        if (step && step.input) {
            setToolInputValues(step.input); // Initialize the input values for editing
        }
    }, [system, selectedTaskId]);

    const handleSaveEditedToolStep = useCallback(() => {
        if (!selectedTaskId || !editingToolStep) return;

        const task = system.getNote(selectedTaskId);
        if (!task || !task.logic) return;

        const logic = JSON.parse(task.logic);
        const stepIndex = logic.steps.findIndex((s: any) => s.id === editingToolStep);

        if (stepIndex !== -1) {
            logic.steps[stepIndex].input = toolInputValues; // Update the input values
            task.logic = JSON.stringify(logic);
            system.updateNote(task);
            setEditingToolStep(null);
            setToolInputValues({}); // Clear the input values
            systemLog.info(`Tool step ${editingToolStep} updated in Task ${selectedTaskId}`, 'ChatView');
        }
    }, [system, selectedTaskId, editingToolStep, toolInputValues]);

    const handleCancelEditToolStep = useCallback(() => {
        setEditingToolStep(null);
        setToolInputValues({});
    }, []);

    const handleDeleteToolStep = useCallback((stepId: string) => {
        if (!selectedTaskId) return;

        const task = system.getNote(selectedTaskId);
        if (!task || !task.logic) return;

        const logic = JSON.parse(task.logic);
        const stepIndex = logic.steps.findIndex((s: any) => s.id === stepId);

        if (stepIndex !== -1) {
            logic.steps.splice(stepIndex, 1); // Remove the step from the array
            task.logic = JSON.stringify(logic);
            system.updateNote(task);
            systemLog.info(`Tool step ${stepId} deleted from Task ${selectedTaskId}`, 'ChatView');
        }
    }, [system, selectedTaskId]);

    const getToolStep = useCallback((stepId: string) => {
        if (!selectedTaskId) return null;
        const task = system.getNote(selectedTaskId);
        if (!task || !task.logic) return null;

        const logic = JSON.parse(task.logic);
        return logic.steps.find((s: any) => s.id === stepId);
    }, [system, selectedTaskId]);

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
                    <h3>Edit Note: {system.getNote(selectedTaskId)?.title} 📝</h3>
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

            {selectedTaskId && (
                <div className={styles.toolSection}>
                    <button onClick={handleAddToolStep}>Add Tool Step</button>
                    {showToolSelector && (
                        <div className={styles.toolSelector}>
                            <h3>Select a Tool</h3>
                            <ul>
                                {availableTools.map(tool => (
                                    <li
                                        key={tool.id}
                                        onClick={() => handleSelectTool(tool.id)}
                                        className={selectedTool === tool.id ? styles.selected : ''}
                                    >
                                        {tool.title}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {addingTool && selectedToolData && selectedToolData.inputSchema && (
                        <div className={styles.toolInputForm}>
                            <h3>Enter Input Parameters for {selectedToolData.title}</h3>
                            {Object.entries(JSON.parse(selectedToolData.inputSchema).properties).map(([inputName, inputDetails]: [string, any]) => (
                                <div key={inputName} className={styles.inputGroup}>
                                    <label htmlFor={inputName}>{inputDetails.description || inputName}:</label>
                                    {inputDetails.type === 'string' && (
                                        <input
                                            type="text"
                                            id={inputName}
                                            value={toolInputValues[inputName] || ''}
                                            onChange={(e) => handleInputChange(e, inputName)}
                                        />
                                    )}
                                    {inputDetails.type === 'number' && (
                                        <input
                                            type="number"
                                            id={inputName}
                                            value={toolInputValues[inputName] || ''}
                                            onChange={(e) => handleInputChange(e, inputName)}
                                        />
                                    )}
                                    {inputDetails.type === 'boolean' && (
                                        <input
                                            type="checkbox"
                                            id={inputName}
                                            checked={toolInputValues[inputName] || false}
                                            onChange={(e) => handleInputChange(e, inputName)}
                                        />
                                    )}
                                    {/* Add more input types as needed */}
                                </div>
                            ))}
                            <button onClick={handleAddSelectedTool}>Add Tool</button>
                            <button onClick={handleCancelAddTool}>Cancel</button>
                        </div>
                    )}

                    {/* Display existing tool steps with edit option */}
                    {selectedTaskId && system.getNote(selectedTaskId)?.logic && (
                        <div>
                            <h3>Tool Steps</h3>
                            <ul>
                                {JSON.parse(system.getNote(selectedTaskId)!.logic!).steps.map((step: any) => (
                                    <li key={step.id}>
                                        {step.type === 'tool' ? (
                                            <>
                                                {system.getTool(step.toolId)?.title}
                                                <button onClick={() => handleEditToolStep(step.id)}>Edit</button>
                                                <button onClick={() => handleDeleteToolStep(step.id)}>Delete</button>
                                            </>
                                        ) : (
                                            <span>{step.type}</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Conditionally render the tool input form for editing */}
                    {editingToolStep && selectedTaskId && (
                        <div className={styles.toolInputForm}>
                            <h3>Edit Input Parameters for {system.getTool(getToolStep(editingToolStep)?.toolId)?.title}</h3>
                            {selectedToolData && selectedToolData.inputSchema && (
                                Object.entries(JSON.parse(selectedToolData.inputSchema).properties).map(([inputName, inputDetails]: [string, any]) => (
                                    <div key={inputName} className={styles.inputGroup}>
                                        <label htmlFor={inputName}>{inputDetails.description || inputName}:</label>
                                        {inputDetails.type === 'string' && (
                                            <input
                                                type="text"
                                                id={inputName}
                                                value={toolInputValues[inputName] || ''}
                                                onChange={(e) => handleInputChange(e, inputName)}
                                            />
                                        )}
                                        {inputDetails.type === 'number' && (
                                            <input
                                                type="number"
                                                id={inputName}
                                                value={toolInputValues[inputName] || ''}
                                                onChange={(e) => handleInputChange(e, inputName)}
                                            />
                                        )}
                                        {inputDetails.type === 'boolean' && (
                                            <input
                                                type="checkbox"
                                                id={inputName}
                                                checked={toolInputValues[inputName] || false}
                                                onChange={(e) => handleInputChange(e, inputName)}
                                            />
                                        )}
                                        {/* Add more input types as needed */}
                                    </div>
                                ))
                            )}
                            <button onClick={handleSaveEditedToolStep}>Save</button>
                            <button onClick={handleCancelEditToolStep}>Cancel</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
