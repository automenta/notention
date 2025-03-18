import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './ToolManager.module.css';
import { getSystemNote } from '../../lib/systemNote';
import { Note } from '../../types';
import MonacoEditor from 'react-monaco-editor';
import { systemLog } from "../../lib/systemLog";
import idService from "../../lib/idService";

interface ToolManagerProps {
}

/**
 * Component for managing tools, allowing users to create, edit, and delete tools.
 */
export const ToolManager: React.FC<ToolManagerProps> = () => {
    const system = getSystemNote();

    const [newToolTitle, setNewToolTitle] = useState('');
    const [newToolLogic, setNewToolLogic] = useState('');
    const [newToolInputSchema, setNewToolInputSchema] = useState('');
    const [newToolOutputSchema, setNewToolOutputSchema] = useState('');
    const [newToolType, setNewToolType] = useState<'custom' | 'langchain' | 'api'>('custom'); // Default to 'custom'
    const [newApiEndpoint, setNewApiEndpoint] = useState('');
    const [newApiMethod, setNewApiMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('POST'); // Default to 'POST'
    const [newApiHeaders, setNewApiHeaders] = useState('{}'); // Default to empty JSON object
    const [toolCreationError, setToolCreationError] = useState<string | null>(null);
    const [editingToolId, setEditingToolId] = useState<string | null>(null);
    const [editingToolInputSchemaId, setEditingToolInputSchemaId] = useState<string | null>(null);
    const [editingToolOutputSchemaId, setEditingToolOutputSchemaId] = useState<string | null>(null);
    const [editingApiToolId, setEditingApiToolId] = useState<string | null>(null);
    const [tools, setTools] = useState<Note[]>([]);

    /**
     * Fetches all tools from the system and updates the state.
     */
    const fetchTools = useCallback(async () => {
        setTools(system.getAllTools());
    }, [system]);

    useEffect(() => {
        fetchTools();
    }, [fetchTools, system]);

    const validateJson = (jsonString: string): boolean => {
        try {
            JSON.parse(jsonString);
            return true;
        } catch (e) {
            return false;
        }
    };

    /**
     * Handles the creation of a new tool.
     */
    const handleCreateTool = useCallback(async () => {
        if (!newToolTitle || !newToolInputSchema || !newToolOutputSchema) {
            setToolCreationError('Tool Title, Input Schema, and Output Schema are required.');
            return;
        }

        if (newToolType === 'api' && (!newApiEndpoint || !newApiMethod)) {
            setToolCreationError('API Endpoint and Method are required for API tools.');
            return;
        }

        if (!validateJson(newToolInputSchema) || !validateJson(newToolOutputSchema)) {
            setToolCreationError('Invalid JSON in Input Schema or Output Schema.');
            return;
        }

        try {
            if (newToolType === 'api') {
                JSON.parse(newApiHeaders); // Validate headers as JSON
                new URL(newApiEndpoint); // Validate API Endpoint URL
            }
        } catch (e: any) {
            setToolCreationError(`Invalid JSON or URL in Tool definition: ${e.message}`);
            return;
        }

        try {
            const newTool: Note & { type: 'custom' | 'langchain' | 'api' } = {
                id: idService.generateId(),
                type: newToolType, // Use the selected tool type
                title: newToolTitle,
                content: `Tool: ${newToolTitle}`,
                logic: newToolType === 'api' ? newApiEndpoint : newToolLogic, // Store API endpoint in logic for API tools
                inputSchema: newToolInputSchema,
                outputSchema: newToolOutputSchema,
                status: 'active',
                priority: 0,
                createdAt: new Date().toISOString(),
                updatedAt: null,
                references: [],
                config: newToolType === 'api' ? {
                    method: newApiMethod,
                    headers: newApiHeaders,
                } : undefined,
            };
            system.registerToolDefinition(newTool);
            setNewToolTitle('');
            setNewToolLogic('');
            setNewToolInputSchema('');
            setNewToolOutputSchema('');
            setNewToolType('custom'); // Reset to default
            setNewApiEndpoint('');
            setNewApiMethod('POST');
            setNewApiHeaders('{}');
            setToolCreationError(null);
            fetchTools();
        } catch (error: any) {
            systemLog.error(`Error creating tool: ${error.message}`, 'ToolManager');
            setToolCreationError(`Error creating tool: ${error.message}`);
        }
    }, [newToolInputSchema, newToolLogic, newToolOutputSchema, newToolTitle, newToolType, system, fetchTools, newApiEndpoint, newApiMethod, newApiHeaders, validateJson]);

    /**
     * Handles editing an existing tool's logic.
     * @param {string} toolId - The ID of the tool to edit.
     */
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
            systemLog.error(`Error editing tool: ${error.message}`, 'ToolManager');
            setToolCreationError(`Error editing tool: ${error.message}`);
        }
    }, [system]);

    /**
     * Handles editing an existing API tool's configuration.
     * @param {string} toolId - The ID of the API tool to edit.
     * @param {string} toolId - The ID of the API tool to edit.
     */
    const handleEditApiTool = useCallback((toolId: string) => {
        try {
            setEditingApiToolId(toolId);
            const tool = system.getTool(toolId);
            if (!tool) {
                setToolCreationError(`Tool with id ${toolId} not found.`);
                return;
            }
            setNewApiEndpoint(tool.logic || '');
            setNewApiMethod((tool.config?.method as 'GET' | 'POST' | 'PUT' | 'DELETE') || 'POST');
            setNewApiHeaders(tool.config?.headers || '{}');
        } catch (error: any) {
            systemLog.error(`Error editing API tool: ${error.message}`, 'ToolManager');
            setToolCreationError(`Error editing API tool: ${error.message}`);
        }
    }, [system]);

    /**
     * Handles editing an existing tool's input schema.
     * @param {string} toolId - The ID of the tool to edit.
     */
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
            systemLog.error(`Error editing tool input schema: ${error.message}`, 'ToolManager');
            setToolCreationError(`Error editing tool input schema: ${error.message}`);
        }
    }, [system]);

    /**
     * Handles editing an existing tool's output schema.
     * @param {string} toolId - The ID of the tool to edit.
     */
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
            systemLog.error(`Error editing tool output schema: ${error.message}`, 'ToolManager');
            setToolCreationError(`Error editing tool output schema: ${error.message}`);
        }
    }, [system]);

    /**
     * Handles saving an edited tool's logic.
     * @param {string} toolId - The ID of the tool to save.
     * @param {string} newLogic - The new logic for the tool.
     */
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
            fetchTools();
        } catch (error: any) {
            systemLog.error(`Error saving tool: ${error.message}`, 'ToolManager');
            setToolCreationError(`Error saving tool: ${error.message}`);
        }
    }, [system, fetchTools]);

    /**
     * Handles saving an edited API tool's configuration.
     * @param {string} toolId - The ID of the API tool to save.
     * @param {string} newApiEndpoint - The new API endpoint URL.
     * @param {string} newApiMethod - The new API method (GET, POST, PUT, DELETE).
     * @param {string} newApiHeaders - The new API headers (JSON format).
     */
    const handleSaveApiTool = useCallback((toolId: string, newApiEndpoint: string, newApiMethod: string, newApiHeaders: string) => {
        try {
            const tool = system.getTool(toolId);
            if (!tool) {
                setToolCreationError(`Tool with id ${toolId} not found.`);
                return;
            }

             if (!validateJson(newApiHeaders)) {
                 setToolCreationError('Invalid JSON in API Headers.');
                 return;
             }

            try {
                new URL(newApiEndpoint); // Validate API Endpoint URL
            } catch (e: any) {
                setToolCreationError(`Invalid URL in API definition: ${e.message}`);
                return;
            }

            tool.logic = newApiEndpoint;
            tool.config = {
                method: newApiMethod,
                headers: newApiHeaders,
            };
            system.updateNote(tool);
            setEditingApiToolId(null);
            setToolCreationError(null);
            fetchTools();
        } catch (error: any) {
            systemLog.error(`Error saving API tool: ${error.message}`, 'ToolManager');
            setToolCreationError(`Error saving API tool: ${error.message}`);
        }
    }, [system, fetchTools, validateJson]);

    /**
     * Handles saving an edited tool's input schema.
     * @param {string} toolId - The ID of the tool to save.
     * @param {string} newInputSchema - The new input schema for the tool.
     */
    const handleSaveToolInputSchema = useCallback((toolId: string, newInputSchema: string) => {
        try {
            const tool = system.getTool(toolId);
            if (!tool) {
                setToolCreationError(`Tool with id ${toolId} not found.`);
                return;
            }

             if (!validateJson(newInputSchema)) {
                 setToolCreationError('Invalid JSON in Input Schema.');
                 return;
             }

            tool.inputSchema = newInputSchema;
            system.updateNote(tool);
            setEditingToolInputSchemaId(null);
            setToolCreationError(null);
            fetchTools();
        } catch (error: any) {
            systemLog.error(`Error saving tool input schema: ${error.message}`, 'ToolManager');
            setToolCreationError(`Error saving tool input schema: ${error.message}`);
        }
    }, [system, fetchTools, validateJson]);

    /**
     * Handles saving an edited tool's output schema.
     * @param {string} toolId - The ID of the tool to save.
     * @param {string} newOutputSchema - The new output schema for the tool.
     */
    const handleSaveToolOutputSchema = useCallback((toolId: string, newOutputSchema: string) => {
        try {
            const tool = system.getTool(toolId);
            if (!tool) {
                setToolCreationError(`Tool with id ${toolId} not found.`);
                return;
            }

             if (!validateJson(newOutputSchema)) {
                 setToolCreationError('Invalid JSON in Output Schema.');
                 return;
            }

            tool.outputSchema = newOutputSchema;
            system.updateNote(tool);
            setEditingToolOutputSchemaId(null);
            setToolCreationError(null);
            fetchTools();
        } catch (error: any) {
            systemLog.error(`Error saving tool output schema: ${error.message}`, 'ToolManager');
            setToolCreationError(`Error saving tool output schema: ${error.message}`);
        }
    }, [system, fetchTools, validateJson]);

    /**
     * Handles canceling the editing of a tool's logic.
     */
    const handleCancelEditTool = useCallback(() => {
        setEditingToolId(null);
    }, []);

    /**
     * Handles canceling the editing of an API tool's configuration.
     */
    const handleCancelEditApiTool = useCallback(() => {
        setEditingApiToolId(null);
    }, []);

    /**
     * Handles canceling the editing of a tool's input schema.
     */
    const handleCancelEditToolInputSchema = useCallback(() => {
        setEditingToolInputSchemaId(null);
    }, []);

    /**
     * Handles canceling the editing of a tool's output schema.
     */
    const handleCancelEditToolOutputSchema = useCallback(() => {
        setEditingToolOutputSchemaId(null);
    }, []);

    /**
     * Monaco Editor options for JSON editing.
     */
    const editorOptions = useMemo(() => ({
        selectOnLineNumbers: true,
        roundedSelection: false,
        readOnly: false,
        cursorStyle: 'line',
        automaticLayout: true,
    }), []);

    return (
        <div className={styles.toolManager}>
            <h2>Tool Manager</h2>
            {toolCreationError && <div className={styles.error}>{toolCreationError}</div>}

            {/* Section for displaying existing tools */}
            <div className={styles.toolList}>
                <h3>Existing Tools</h3>
                {tools.map(tool => (
                    <div key={tool.id} className={styles.toolItem}>
                        <h4>{tool.title}</h4>
                        <p>Type: {tool.type}</p>

                        {/* Display and edit logic for custom tools */}
                        {tool.type === 'custom' && (
                            <>
                                {editingToolId === tool.id ? (
                                    <div className={styles.editForm}>
                                        <label htmlFor={`toolLogic-${tool.id}`}>Tool Logic:</label>
                                        <MonacoEditor
                                            width="600"
                                            height="300"
                                            language="json"
                                            theme="vs-dark"
                                            value={newToolLogic}
                                            options={editorOptions}
                                            onChange={(value) => setNewToolLogic(value)}
                                        />
                                        <div className={styles.editActions}>
                                            <button onClick={() => handleSaveTool(tool.id, newToolLogic)}>Save Logic</button>
                                            <button onClick={handleCancelEditTool}>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p>Logic: {tool.logic}</p>
                                        <button onClick={() => {
                                            handleEditTool(tool.id);
                                            setNewToolLogic(tool.logic || '');
                                        }}>Edit Logic</button>
                                    </>
                                )}
                            </>
                        )}

                        {/* Display and edit API configuration for API tools */}
                        {tool.type === 'api' && (
                            <>
                                {editingApiToolId === tool.id ? (
                                    <div className={styles.editForm}>
                                        <label htmlFor={`apiEndpoint-${tool.id}`}>API Endpoint:</label>
                                        <input
                                            type="text"
                                            id={`apiEndpoint-${tool.id}`}
                                            placeholder="API Endpoint URL"
                                            value={newApiEndpoint}
                                            onChange={(e) => setNewApiEndpoint(e.target.value)}
                                        />
                                         <label htmlFor={`apiMethod-${tool.id}`}>API Method:</label>
                                         <select
                                             id={`apiMethod-${tool.id}`}
                                             value={newApiMethod}
                                             onChange={(e) => setNewApiMethod(e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE')}
                                         >
                                             <option value="GET">GET</option>
                                             <option value="POST">POST</option>
                                             <option value="PUT">PUT</option>
                                             <option value="DELETE">DELETE</option>
                                         </select>
                                         <label htmlFor={`apiHeaders-${tool.id}`}>API Headers (JSON):</label>
                                         <MonacoEditor
                                             width="600"
                                             height="300"
                                             language="json"
                                             theme="vs-dark"
                                             value={newApiHeaders}
                                             options={editorOptions}
                                             onChange={(value) => setNewApiHeaders(value)}
                                         />
                                        <div className={styles.editActions}>
                                            <button onClick={() => handleSaveApiTool(tool.id, newApiEndpoint, newApiMethod, newApiHeaders)}>Update API Config</button>
                                            <button onClick={handleCancelEditApiTool}>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p>API Endpoint: {JSON.parse(tool.logic || '{}').apiEndpoint}</p>
                                        <p>API Method: {tool.config?.method}</p>
                                        <p>API Headers: {tool.config?.headers}</p>
                                        <button onClick={() => {
                                            handleEditApiTool(tool.id);
                                            setNewApiEndpoint(tool.logic || '');
                                            setNewApiMethod((tool.config?.method as 'GET' | 'POST' | 'PUT' | 'DELETE') || 'POST');
                                            setNewApiHeaders(tool.config?.headers || '{}');
                                        }}>Edit API Config</button>
                                    </>
                                )}
                            </>
                        )}
                         {/* Display and edit input schema for all tool types */}
                         {editingToolInputSchemaId === tool.id ? (
                             <div className={styles.editForm}>
                                 <label htmlFor={`toolInputSchema-${tool.id}`}>Input Schema (JSON):</label>
                                 <MonacoEditor
                                     width="600"
                                     height="300"
                                     language="json"
                                     theme="vs-dark"
                                     value={newToolInputSchema}
                                     options={editorOptions}
                                     onChange={(value) => setNewToolInputSchema(value)}
                                 />
                                 <div className={styles.editActions}>
                                     <button onClick={() => handleSaveToolInputSchema(tool.id, newToolInputSchema)}>Save Input Schema</button>
                                     <button onClick={handleCancelEditToolInputSchema}>Cancel</button>
                                 </div>
                             </div>
                         ) : (
                             <>
                                 <p>Input Schema: {tool.inputSchema}</p>
                                 <button onClick={() => {
                                     handleEditToolInputSchema(tool.id);
                                     setNewToolInputSchema(tool.inputSchema || '');
                                 }}>Edit Input Schema</button>
                             </>
                         )}

                         {/* Display and edit output schema for all tool types */}
                         {editingToolOutputSchemaId === tool.id ? (
                             <div className={styles.editForm}>
                                 <label htmlFor={`toolOutputSchema-${tool.id}`}>Output Schema (JSON):</label>
                                 <MonacoEditor
                                     width="600"
                                     height="300"
                                     language="json"
                                     theme="vs-dark"
                                     value={newToolOutputSchema}
                                     options={editorOptions}
                                     onChange={(value) => setNewToolOutputSchema(value)}
                                 />
                                 <div className={styles.editActions}>
                                     <button onClick={() => handleSaveToolOutputSchema(tool.id, newToolOutputSchema)}>Save Output Schema</button>
                                     <button onClick={handleCancelEditToolOutputSchema}>Cancel</button>
                                 </div>
                             </div>
                         ) : (
                             <>
                                 <p>Output Schema: {tool.outputSchema}</p>
                                 <button onClick={() => {
                                     handleEditToolOutputSchema(tool.id);
                                     setNewToolOutputSchema(tool.outputSchema || '');
                                 }}>Edit Output Schema</button>
                             </>
                         )}
                    </div>
                ))}
            </div>

            {/* Section for creating new tools */}
            <div className={styles.createTool}>
                <h3>Create New Tool</h3>
                {toolCreationError && <div className={styles.error}>{toolCreationError}</div>}
                <label htmlFor="newToolTitle">Tool Title:</label>
                <input
                    type="text"
                    id="newToolTitle"
                    placeholder="Tool Title"
                    value={newToolTitle}
                    onChange={(e) => setNewToolTitle(e.target.value)}
                />

                <label htmlFor="newToolType">Tool Type:</label>
                <select
                    id="newToolType"
                    value={newToolType}
                    onChange={(e) => setNewToolType(e.target.value as 'custom' | 'langchain' | 'api')}
                >
                    <option value="custom">Custom</option>
                    <option value="langchain">LangChain</option>
                    <option value="api">API</option>
                </select>

                {newToolType === 'custom' && (
                    <>
                        <label htmlFor="newToolLogic">Tool Logic:</label>
                        <MonacoEditor
                            width="600"
                            height="300"
                            language="json"
                            theme="vs-dark"
                            value={newToolLogic}
                            options={editorOptions}
                            onChange={(value) => setNewToolLogic(value)}
                        />
                    </>
                )}

                {newToolType === 'api' && (
                    <>
                        <label htmlFor="newApiEndpoint">API Endpoint:</label>
                        <input
                            type="text"
                            id="newApiEndpoint"
                            placeholder="API Endpoint URL"
                            value={newApiEndpoint}
                            onChange={(e) => setNewApiEndpoint(e.target.value)}
                        />
                         <label htmlFor="newApiMethod">API Method:</label>
                         <select
                             id="newApiMethod"
                             value={newApiMethod}
                             onChange={(e) => setNewApiMethod(e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE')}
                         >
                             <option value="GET">GET</option>
                             <option value="POST">POST</option>
                             <option value="PUT">PUT</option>
                             <option value="DELETE">DELETE</option>
                         </select>
                         <label htmlFor="newApiHeaders">API Headers (JSON):</label>
                         <MonacoEditor
                             width="600"
                             height="300"
                             language="json"
                             theme="vs-dark"
                             value={newApiHeaders}
                             options={editorOptions}
                             onChange={(value) => setNewApiHeaders(value)}
                         />
                    </>
                )}

                <label htmlFor="newToolInputSchema">Input Schema (JSON):</label>
                <MonacoEditor
                    width="600"
                    height="300"
                    language="json"
                    theme="vs-dark"
                    value={newToolInputSchema}
                    options={editorOptions}
                    onChange={(value) => setNewToolInputSchema(value)}
                />

                <label htmlFor="newToolOutputSchema">Output Schema (JSON):</label>
                <MonacoEditor
                    width="600"
                    height="300"
                    language="json"
                    theme="vs-dark"
                    value={newToolOutputSchema}
                    options={editorOptions}
                    onChange={(value) => setNewToolOutputSchema(value)}
                />

                <button onClick={handleCreateTool}>Create Template</button>
            </div>
        </div>
    );
};
