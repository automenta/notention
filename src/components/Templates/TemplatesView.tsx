import React, {useState, useEffect, useCallback, useMemo} from 'react';
import styles from './TemplatesView.module.css';
import {getSystemNote} from '../../lib/systemNote';
import {Note} from '../../types';
import {NoteImpl} from '../../lib/note';
import {UIView} from '../UI/UI';
import MonacoEditor from 'react-monaco-editor';
import {systemLog} from "../../lib/systemLog";

// Functional component for the Templates View
export const TemplatesView: React.FC = () => {
    // Access the system note for managing notes and tools
    const system = getSystemNote();

    // State variables for managing templates
    const [templates, setTemplates] = useState<Note[]>([]);
    const [newTemplateTitle, setNewTemplateTitle] = useState('');
    const [newTemplateContent, setNewTemplateContent] = useState('');
    const [newTemplateLogic, setNewTemplateLogic] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [editingContentTemplateId, setEditingContentTemplateId] = useState<string | null>(null);
    const [templateError, setTemplateError] = useState<string | null>(null);

    // State variables for managing tools
    const [newToolTitle, setNewToolTitle] = useState('');
    const [newToolLogic, setNewToolLogic] = useState('');
    const [newToolInputSchema, setNewToolInputSchema] = useState('');
    const [newToolOutputSchema, setNewToolOutputSchema] = useState('');
    const [toolCreationError, setToolCreationError] = useState<string | null>(null);
    const [editingToolId, setEditingToolId] = useState<string | null>(null);
    const [editingToolInputSchemaId, setEditingToolInputSchemaId] = useState<string | null>(null);
    const [editingToolOutputSchemaId, setEditingToolOutputSchemaId] = useState<string | null>(null);

    // Fetch templates from the system note
    const fetchTemplates = useCallback(async () => {
        try {
            const allTemplates = system.getAllNotes().filter(note => note.type === 'Template');
            setTemplates(allTemplates);
            setTemplateError(null);
        } catch (error: any) {
            systemLog.error(`Error fetching templates: ${error.message}`, 'TemplatesView');
            setTemplateError(`Error fetching templates: ${error.message}`);
        }
    }, [system]);

    // Fetch templates on component mount and subscribe to system note changes
    useEffect(() => {
        fetchTemplates();

        // Unsubscribe from system note changes
        const unsubscribe = () => {
            system.getAllNotes();
        };
        return unsubscribe;

    }, [fetchTemplates, system]);

    // Handle the creation of a new template
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

    // Handle the creation of a new task from a template
    const handleCreateTaskFromTemplate = useCallback(async (templateId: string) => {
        try {
            const template = system.getNote(templateId);
            if (!template) {
                setTemplateError(`Template with id ${templateId} not found.`);
                return;
            }

            const task = await NoteImpl.createTaskNote(template.title, template.content, template.priority);
            task.data.logic = template.logic;
            task.data.content = template.content;
            system.addNote(task.data);
            setTemplateError(null);
        } catch (error: any) {
            systemLog.error(`Error creating task from template: ${error.message}`, 'TemplatesView');
            setTemplateError(`Error creating task from template: ${error.message}`);
        }
    }, [system]);

    // Handle the creation of a new tool
    const handleCreateTool = useCallback(async () => {
        if (!newToolTitle || !newToolLogic || !newToolInputSchema || !newToolOutputSchema) {
            setToolCreationError('All tool fields are required.');
            return;
        }

        try {
            JSON.parse(newToolLogic);
            JSON.parse(newToolInputSchema);
            JSON.parse(newToolOutputSchema);
        } catch (e: any) {
            setToolCreationError(`Invalid JSON in Tool definition: ${e.message}`);
            return;
        }

        try {
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
            setToolCreationError(null);
        } catch (error: any) {
            systemLog.error(`Error creating tool: ${error.message}`, 'TemplatesView');
            setToolCreationError(`Error creating tool: ${error.message}`);
        }
    }, [newToolInputSchema, newToolLogic, newToolOutputSchema, newToolTitle, system]);

    // Handle editing an existing template
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

    const handleEditContentTemplate = useCallback((templateId: string) => {
        try {
            setEditingContentTemplateId(templateId);
            const template = system.getNote(templateId);
            if (!template) {
                setTemplateError(`Template with id ${templateId} not found.`);
                return;
            }
            setNewTemplateContent(template.content || ''); // Set the content for editing
        } catch (error: any) {
            systemLog.error(`Error editing template: ${error.message}`, 'TemplatesView');
            setTemplateError(`Error editing template: ${error.message}`);
        }
    }, [system]);

    // Handle saving an edited template
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

    const handleSaveContentTemplate = useCallback((templateId: string, newContent: string) => {
        try {
            const template = system.getNote(templateId);
            if (!template) {
                setTemplateError(`Template with id ${templateId} not found.`);
                return;
            }

            template.content = newContent;
            system.updateNote(template);
            setEditingContentTemplateId(null);
            setTemplateError(null);
        } catch (error: any) {
            systemLog.error(`Error saving template: ${error.message}`, 'TemplatesView');
            setTemplateError(`Error saving template: ${error.message}`);
        }
    }, [system]);

    // Handle canceling the editing of a template
    const handleCancelEdit = useCallback(() => {
        setEditingTemplateId(null);
    }, []);

    const handleCancelContentEdit = useCallback(() => {
        setEditingContentTemplateId(null);
    }, []);

    // Handle editing an existing tool
    const handleEditTool = useCallback((toolId: string) => {
        try {
            setEditingToolId(toolId);
            const tool = system.getTool(toolId);
            if (!tool) {
                setToolCreationError(`Tool with id ${toolId} not found.`);
                return;
            }
            setNewToolLogic(tool.logic || '');
        } catch (error: any) {
            systemLog.error(`Error editing tool: ${error.message}`, 'TemplatesView');
            setToolCreationError(`Error editing tool: ${error.message}`);
        }
    }, [system]);

    const handleEditToolInputSchema = useCallback((toolId: string) => {
        try {
            setEditingToolInputSchemaId(toolId);
            const tool = system.getTool(toolId);
            if (!tool) {
                setToolCreationError(`Tool with id ${toolId} not found.`);
                return;
            }
            setNewToolInputSchema(tool.inputSchema || '');
        } catch (error: any) {
            systemLog.error(`Error editing tool input schema: ${error.message}`, 'TemplatesView');
            setToolCreationError(`Error editing tool input schema: ${error.message}`);
        }
    }, [system]);

    const handleEditToolOutputSchema = useCallback((toolId: string) => {
        try {
            setEditingToolOutputSchemaId(toolId);
            const tool = system.getTool(toolId);
            if (!tool) {
                setToolCreationError(`Tool with id ${toolId} not found.`);
                return;
            }
            setNewToolOutputSchema(tool.outputSchema || '');
        } catch (error: any) {
            systemLog.error(`Error editing tool output schema: ${error.message}`, 'TemplatesView');
            setToolCreationError(`Error editing tool output schema: ${error.message}`);
        }
    }, [system]);

    // Handle saving an edited tool
    const handleSaveTool = useCallback((toolId: string, newLogic: string) => {
        try {
            const tool = system.getTool(toolId);
            if (!tool) {
                setToolCreationError(`Tool with id ${toolId} not found.`);
                return;
            }

            tool.logic = newLogic;
            system.updateNote(tool);
            setEditingToolId(null);
            setToolCreationError(null);
        } catch (error: any) {
            systemLog.error(`Error saving tool: ${error.message}`, 'TemplatesView');
            setToolCreationError(`Error saving tool: ${error.message}`);
        }
    }, [system]);

    const handleSaveToolInputSchema = useCallback((toolId: string, newInputSchema: string) => {
        try {
            const tool = system.getTool(toolId);
            if (!tool) {
                setToolCreationError(`Tool with id ${toolId} not found.`);
                return;
            }

            tool.inputSchema = newInputSchema;
            system.updateNote(tool);
            setEditingToolInputSchemaId(null);
            setToolCreationError(null);
        } catch (error: any) {
            systemLog.error(`Error saving tool input schema: ${error.message}`, 'TemplatesView');
            setToolCreationError(`Error saving tool input schema: ${error.message}`);
        }
    }, [system]);

    const handleSaveToolOutputSchema = useCallback((toolId: string, newOutputSchema: string) => {
        try {
            const tool = system.getTool(toolId);
            if (!tool) {
                setToolCreationError(`Tool with id ${toolId} not found.`);
                return;
            }

            tool.outputSchema = newOutputSchema;
            system.updateNote(tool);
            setEditingToolOutputSchemaId(null);
            setToolCreationError(null);
        } catch (error: any) {
            systemLog.error(`Error saving tool output schema: ${error.message}`, 'TemplatesView');
            setToolCreationError(`Error saving tool output schema: ${error.message}`);
        }
    }, [system]);

    // Handle canceling the editing of a tool
    const handleCancelEditTool = useCallback(() => {
        setEditingToolId(null);
    }, []);

    const handleCancelEditToolInputSchema = useCallback(() => {
        setEditingToolInputSchemaId(null);
    }, []);

    const handleCancelEditToolOutputSchema = useCallback(() => {
        setEditingToolOutputSchemaId(null);
    }, []);

    // Monaco Editor options
    const editorOptions = useMemo(() => ({
        selectOnLineNumbers: true,
        roundedSelection: false,
        readOnly: false,
        cursorStyle: 'line',
        automaticLayout: true,
    }), []);

    // JSX for the Templates View
    return (
        <UIView title="Templates 📄">
            <div className={styles.templatesContainer}>
                {/* Section for creating new templates */}
                <h3>Create New Template</h3>
                <label htmlFor="newTemplateTitle">Template Title:</label>
                <input
                    type="text"
                    id="newTemplateTitle"
                    placeholder="Template Title"
                    value={newTemplateTitle}
                    onChange={(e) => setNewTemplateTitle(e.target.value)}
                />
                <label htmlFor="newTemplateContent">Template Content:</label>
                <textarea
                    id="newTemplateContent"
                    placeholder="Template Content"
                    value={newTemplateContent}
                    onChange={(e) => setNewTemplateContent(e.target.value)}
                />
                <label htmlFor="newTemplateLogic">Template Logic (JSON):</label>
                <textarea
                    id="newTemplateLogic"
                    placeholder="Template Logic (JSON)"
                    value={newTemplateLogic}
                    onChange={(e) => setNewTemplateLogic(e.target.value)}
                />
                <button onClick={handleCreateTemplate}>Create Template</button>
                {templateError && <div className={styles.errorMessage}>Error: {templateError}</div>}

                {/* Section for displaying existing templates */}
                <h3>Existing Templates</h3>
                <ul>
                    {templates.map(template => (
                        <li key={template.id}>
                            {template.title} - {template.content}
                            <button onClick={() => handleCreateTaskFromTemplate(template.id)}>Create Task</button>
                            <button onClick={() => {
                                handleEditTemplate(template.id);
                                setNewTemplateLogic(template.logic || '');
                            }}>Edit Logic</button>
                            <button onClick={() => {
                                handleEditContentTemplate(template.id);
                                setNewTemplateContent(template.content || '');
                            }}>Edit Content</button>
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
                            {editingContentTemplateId === template.id && (
                                <div className={styles.templateEditor}>
                                    <MonacoEditor
                                        width="600"
                                        height="300"
                                        language="markdown"
                                        theme="vs-dark"
                                        value={newTemplateContent}
                                        options={editorOptions}
                                        onChange={(value) => setNewTemplateContent(value)}
                                    />
                                    <button onClick={() => handleSaveContentTemplate(template.id, newTemplateContent)}>Save</button>
                                    <button onClick={handleCancelContentEdit}>Cancel</button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Section for creating new tools */}
            <div className={styles.toolCreationContainer}>
                <h3>Create New Tool</h3>
                <label htmlFor="newToolTitle">Tool Title:</label>
                <input
                    type="text"
                    id="newToolTitle"
                    placeholder="Tool Title"
                    value={newToolTitle}
                    onChange={(e) => setNewToolTitle(e.target.value)}
                />
                <label htmlFor="newToolLogic">Tool Logic (JSON):</label>
                <textarea
                    id="newToolLogic"
                    placeholder="Tool Logic (JSON)"
                    value={newToolLogic}
                    onChange={(e) => setNewToolLogic(e.target.value)}
                />
                <label htmlFor="newToolInputSchema">Tool Input Schema (JSON):</label>
                <textarea
                    id="newToolInputSchema"
                    placeholder="Tool Input Schema (JSON)"
                    value={newToolInputSchema}
                    onChange={(e) => setNewToolInputSchema(e.target.value)}
                />
                <label htmlFor="newToolOutputSchema">Tool Output Schema (JSON):</label>
                <textarea
                    id="newToolOutputSchema"
                    placeholder="Tool Output Schema (JSON)"
                    value={newToolOutputSchema}
                    onChange={(e) => setNewToolOutputSchema(e.target.value)}
                />
                <button onClick={handleCreateTool}>Create Tool</button>
                {toolCreationError && <div className={styles.errorMessage}>Error: {toolCreationError}</div>}
            </div>

            {/* Section for displaying existing tools */}
            <h3>Existing Tools</h3>
            <ul>
                {system.getAllTools().map(tool => (
                    <li key={tool.id}>
                        {tool.title}
                        <button onClick={() => {
                            handleEditTool(tool.id);
                            setNewToolLogic(tool.logic || '');
                        }}>Edit Logic</button>
                        <button onClick={() => {
                            handleEditToolInputSchema(tool.id);
                            setNewToolInputSchema(tool.inputSchema || '');
                        }}>Edit Input Schema</button>
                        <button onClick={() => {
                            handleEditToolOutputSchema(tool.id);
                            setNewToolOutputSchema(tool.outputSchema || '');
                        }}>Edit Output Schema</button>

                        {editingToolId === tool.id && (
                            <div className={styles.templateEditor}>
                                <MonacoEditor
                                    width="600"
                                    height="300"
                                    language="json"
                                    theme="vs-dark"
                                    value={newToolLogic}
                                    options={editorOptions}
                                    onChange={(value) => setNewToolLogic(value)}
                                />
                                <button onClick={() => handleSaveTool(tool.id, newToolLogic)}>Save</button>
                                <button onClick={handleCancelEditTool}>Cancel</button>
                            </div>
                        )}

                        {editingToolInputSchemaId === tool.id && (
                            <div className={styles.templateEditor}>
                                <MonacoEditor
                                    width="600"
                                    height="300"
                                    language="json"
                                    theme="vs-dark"
                                    value={newToolInputSchema}
                                    options={editorOptions}
                                    onChange={(value) => setNewToolInputSchema(value)}
                                />
                                <button onClick={() => handleSaveToolInputSchema(tool.id, newToolInputSchema)}>Save</button>
                                <button onClick={handleCancelEditToolInputSchema}>Cancel</button>
                            </div>
                        )}

                        {editingToolOutputSchemaId === tool.id && (
                            <div className={styles.templateEditor}>
                                <MonacoEditor
                                    width="600"
                                    height="300"
                                    language="json"
                                    theme="vs-dark"
                                    value={newToolOutputSchema}
                                    options={editorOptions}
                                    onChange={(value) => setNewToolOutputSchema(value)}
                                />
                                <button onClick={() => handleSaveToolOutputSchema(tool.id, newToolOutputSchema)}>Save</button>
                                <button onClick={handleCancelEditToolOutputSchema}>Cancel</button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </UIView>
    );
};
