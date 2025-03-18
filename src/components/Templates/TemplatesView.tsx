import React, {useState, useEffect, useCallback} from 'react';
import styles from './TemplatesView.module.css';
import {getSystemNote} from '../../lib/systemNote';
import {Note} from '../../types';
import {NoteImpl} from '../../lib/note';
import {UIView} from '../UI/UI';
import MonacoEditor from 'react-monaco-editor';
import {systemLog} from "../../lib/systemLog";

export const TemplatesView: React.FC = () => {
    const system = getSystemNote();
    const [templates, setTemplates] = useState<Note[]>([]);
    const [newTemplateTitle, setNewTemplateTitle] = useState('');
    const [newTemplateContent, setNewTemplateContent] = useState('');
    const [newTemplateLogic, setNewTemplateLogic] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [templateError, setTemplateError] = useState<string | null>(null);

    const [newToolTitle, setNewToolTitle] = useState('');
    const [newToolLogic, setNewToolLogic] = useState('');
    const [newToolInputSchema, setNewToolInputSchema] = useState('');
    const [newToolOutputSchema, setNewToolOutputSchema] = useState('');

    const fetchTemplates = useCallback(async () => {
        try {
            const allTemplates = system.getAllNotes().filter(n => n.type === 'Template');
            setTemplates(allTemplates);
            setTemplateError(null);
        } catch (error: any) {
            systemLog.error(`Error fetching templates: ${error.message}`, 'TemplatesView');
            setTemplateError(`Error fetching templates: ${error.message}`);
        }
    }, [system]);

    useEffect(() => {
        fetchTemplates();

        const unsubscribe = () => {
            system.getAllNotes();
        };
        return unsubscribe;

    }, [fetchTemplates, system]);

    const handleCreateTemplate = useCallback(async () => {
        if (!newTemplateTitle || !newTemplateContent) {
            setTemplateError('Template title and content are required.');
            return;
        }

        try {
            const newTemplate: Note = {
                id: `template-${Date.now()}`,
                type: 'Template',
                title: newTemplateTitle,
                content: newTemplateContent,
                logic: newTemplateLogic,
                status: 'active',
                priority: 0,
                createdAt: new Date().toISOString(),
                updatedAt: null,
                references: [],
            };
            system.addNote(newTemplate);
            setNewTemplateTitle('');
            setNewTemplateContent('');
            setNewTemplateLogic('');
            setTemplateError(null);
        } catch (error: any) {
            systemLog.error(`Error creating template: ${error.message}`, 'TemplatesView');
            setTemplateError(`Error creating template: ${error.message}`);
        }
    }, [newTemplateContent, newTemplateLogic, newTemplateTitle, system]);

    const handleCreateTaskFromTemplate = useCallback(async (templateId: string) => {
        try {
            const template = system.getNote(templateId);
            if (!template) {
                setTemplateError(`Template with id ${templateId} not found.`);
                return;
            }

            const task = await NoteImpl.createTaskNote(template.title, template.content, template.priority);
            task.data.logic = template.logic;
            system.addNote(task.data);
            setTemplateError(null);
        } catch (error: any) {
            systemLog.error(`Error creating task from template: ${error.message}`, 'TemplatesView');
            setTemplateError(`Error creating task from template: ${error.message}`);
        }
    }, [system]);

    const handleCreateTool = useCallback(async () => {
        if (!newToolTitle || !newToolLogic || !newToolInputSchema || !newToolOutputSchema) {
            setTemplateError('All tool fields are required.');
            return;
        }

        try {
            JSON.parse(newToolLogic);
            JSON.parse(newToolInputSchema);
            JSON.parse(newToolOutputSchema);
        } catch (e) {
            alert('Invalid JSON in Tool definition.');
            return;
        }

        const newTool: Note = {
            id: `tool-${Date.now()}`,
            type: 'Tool',
            title: newToolTitle,
            content: `Tool: ${newToolTitle}`,
            logic: newToolLogic,
            inputSchema: newToolInputSchema,
            outputSchema: newToolOutputSchema,
            status: 'active',
            priority: 0,
            createdAt: new Date().toISOString(),
            updatedAt: null,
            references: [],
        };
        system.registerTool(newTool);
        setNewToolTitle('');
        setNewToolLogic('');
        setNewToolInputSchema('');
        setNewToolOutputSchema('');
    }, [newToolInputSchema, newToolLogic, newToolOutputSchema, newToolTitle, system]);

    const handleEditTemplate = useCallback((templateId: string) => {
        try {
            setEditingTemplateId(templateId);
            const template = system.getNote(templateId);
            if (!template) {
                setTemplateError(`Template with id ${templateId} not found.`);
                return;
            }
            setNewTemplateLogic(template.logic || '');
        } catch (error: any) {
            systemLog.error(`Error editing template: ${error.message}`, 'TemplatesView');
            setTemplateError(`Error editing template: ${error.message}`);
        }
    }, [system]);

    const handleSaveTemplate = useCallback((templateId: string, newLogic: string) => {
        try {
            const template = system.getNote(templateId);
            if (!template) {
                setTemplateError(`Template with id ${templateId} not found.`);
                return;
            }

            template.logic = newLogic;
            system.updateNote(template);
            setEditingTemplateId(null);
            setTemplateError(null);
        } catch (error: any) {
            systemLog.error(`Error saving template: ${error.message}`, 'TemplatesView');
            setTemplateError(`Error saving template: ${error.message}`);
        }
    }, [system]);

    const handleCancelEdit = useCallback(() => {
        setEditingTemplateId(null);
    }, []);

    const editorOptions = {
        selectOnLineNumbers: true,
        roundedSelection: false,
        readOnly: false,
        cursorStyle: 'line',
        automaticLayout: true,
    };

    return (
        <UIView title="Templates 📄">
            <div className={styles.templatesContainer}>
                <h3>Create New Template</h3>
                <input
                    type="text"
                    placeholder="Template Title"
                    value={newTemplateTitle}
                    onChange={(e) => setNewTemplateTitle(e.target.value)}
                />
                <textarea
                    placeholder="Template Content"
                    value={newTemplateContent}
                    onChange={(e) => setNewTemplateContent(e.target.value)}
                />
                <textarea
                    placeholder="Template Logic (JSON)"
                    value={newTemplateLogic}
                    onChange={(e) => setNewTemplateLogic(e.target.value)}
                />
                <button onClick={handleCreateTemplate}>Create Template</button>
                {templateError && <div className={styles.errorMessage}>Error: {templateError}</div>}
                <h3>Existing Templates</h3>

                <ul>
                    {templates.map(template => (
                        <li key={template.id}>
                            {template.title} - {template.content}
                            <button onClick={() => handleCreateTaskFromTemplate(template.id)}>Create Task</button>
                            <button onClick={() => handleEditTemplate(template.id)}>Edit Logic</button>
                            {editingTemplateId === template.id && (
                                <div className={styles.templateEditor}>
                                    <MonacoEditor
                                        width="600"
                                        height="300"
                                        language="json"
                                        theme="vs-dark"
                                        value={newTemplateLogic}
                                        options={editorOptions}
                                        onChange={(value) => setNewTemplateLogic(value)}
                                    />
                                    <button onClick={() => handleSaveTemplate(template.id, newTemplateLogic)}>Save</button>
                                    <button onClick={handleCancelEdit}>Cancel</button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            <div className={styles.toolCreationContainer}>
                <h3>Create New Tool</h3>
                <input
                    type="text"
                    placeholder="Tool Title"
                    value={newToolTitle}
                    onChange={(e) => setNewToolTitle(e.target.value)}
                />
                <textarea
                    placeholder="Tool Logic (JSON)"
                    value={newToolLogic}
                    onChange={(e) => setNewToolLogic(e.target.value)}
                />
                <textarea
                    placeholder="Tool Input Schema (JSON)"
                    value={newToolInputSchema}
                    onChange={(e) => setNewToolInputSchema(e.target.value)}
                />
                <textarea
                    placeholder="Tool Output Schema (JSON)"
                    value={newToolOutputSchema}
                    onChange={(e) => setNewToolOutputSchema(e.target.value)}
                />
                <button onClick={handleCreateTool}>Create Tool</button>
            </div>
        </UIView>
    );
};
