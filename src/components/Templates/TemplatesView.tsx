import React, {useState, useEffect, useCallback} from 'react';
import styles from './TemplatesView.module.css';
import {getSystemNote} from '../../lib/systemNote';
import {Note} from '../../types';
import {NoteImpl} from '../../lib/note';
import {UIView} from '../UI/UI';

export const TemplatesView: React.FC = () => {
    const system = getSystemNote();
    const [templates, setTemplates] = useState<Note[]>([]);
    const [newTemplateTitle, setNewTemplateTitle] = useState('');
    const [newTemplateContent, setNewTemplateContent] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null); // Track selected template for creation

    // Tool Creation State
    const [newToolTitle, setNewToolTitle] = useState('');
    const [newToolLogic, setNewToolLogic] = useState('');
    const [newToolInputSchema, setNewToolInputSchema] = useState('');
    const [newToolOutputSchema, setNewToolOutputSchema] = useState('');

    useEffect(() => {
        // Fetch templates on component mount and whenever notes change
        const allTemplates = system.getAllNotes().filter(n => n.type === 'Template');
        setTemplates(allTemplates);

        const unsubscribe = () => {
            system.getAllNotes();
        };
        return unsubscribe;

    }, [system]);

    const handleCreateTemplate = async () => {
        if (newTemplateTitle && newTemplateContent) {
            const newTemplate: Note = {
                id: `template-${Date.now()}`,
                type: 'Template',
                title: newTemplateTitle,
                content: newTemplateContent,
                status: 'active',
                priority: 0,
                createdAt: new Date().toISOString(),
                updatedAt: null,
                references: [],
            };
            system.addNote(newTemplate);
            setNewTemplateTitle('');
            setNewTemplateContent('');
        }
    };

    // Function to handle creating a task from a template
    const createTaskFromTemplate = useCallback(async (templateId: string) => {
        const template = system.getNote(templateId);
        if (template) {
            const task = await NoteImpl.createTaskNote(template.title, template.content, template.priority);
            task.data.logic = template.logic;
            system.addNote(task.data);
        }
    }, [system]);

    // Tool Creation Handlers
    const handleCreateTool = async () => {
        if (newToolTitle && newToolLogic && newToolInputSchema && newToolOutputSchema) {
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
        }
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
                <button onClick={handleCreateTemplate}>Create Template</button>

                <h3>Existing Templates</h3>
                <ul>
                    {templates.map(template => (
                        <li key={template.id}>
                            {template.title} - {template.content}
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
