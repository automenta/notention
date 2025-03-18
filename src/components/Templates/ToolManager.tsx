import React, {useState, useCallback, useMemo} from 'react';
import styles from './TemplatesView.module.css';
import {getSystemNote} from '../../lib/systemNote';
import {Note} from '../../types';
import MonacoEditor from 'react-monaco-editor';
import {systemLog} from "../../lib/systemLog";
import idService from "../../lib/idService";

interface ToolManagerProps {
}

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
    const [newApiAuthType, setNewApiAuthType] = useState<'none' | 'apiKey'>('none'); // Default to no auth
    const [newApiKeyHeader, setNewApiKeyHeader] = useState('Authorization'); // Default API Key Header
    const [newApiKeyValue, setNewApiKeyValue] = useState(''); // API Key Value
    const [toolCreationError, setToolCreationError] = useState<string | null>(null);
    const [editingToolId, setEditingToolId] = useState<string | null>(null);
    const [editingToolInputSchemaId, setEditingToolInputSchemaId] = useState<string | null>(null);
    const [editingToolOutputSchemaId, setEditingToolOutputSchemaId] = useState<string | null>(null);
    const [editingApiToolId, setEditingApiToolId] = useState<string | null>(null);
    const [tools, setTools] = useState<Note[]>([]);

    const fetchTools = useCallback(async () => {
        setTools(system.getAllTools());
    }, [system]);

    // Handle the creation of a new tool
    const handleCreateTool = useCallback(async () => {
        if (!newToolTitle || !newToolInputSchema || !newToolOutputSchema) {
            setToolCreationError('Tool Title, Input Schema, and Output Schema are required.');
            return;
        }

        if (newToolType === 'api' && (!newApiEndpoint || !newApiMethod)) {
            setToolCreationError('API Endpoint and Method are required for API tools.');
            return;
        }

        try {
            JSON.parse(newToolInputSchema);
            JSON.parse(newToolOutputSchema);
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
                    authType: newApiAuthType,
                    apiKeyHeader: newApiKeyHeader,
                    apiKeyValue: newApiKeyValue,
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
            setNewApiAuthType('none');
            setNewApiKeyHeader('Authorization');
            setNewApiKeyValue('');
            setToolCreationError(null);
            fetchTools();
        } catch (error: any) {
            systemLog.error(`Error creating tool: ${error.message}`, 'ToolManager');
            setToolCreationError(`Error creating tool: ${error.message}`);
        }
    }, [newToolInputSchema, newToolLogic, newToolOutputSchema, newToolTitle, newToolType, system, fetchTools, newApiEndpoint, newApiMethod, newApiHeaders, newApiAuthType, newApiKeyHeader, newApiKeyValue]);

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
            systemLog.error(`Error editing tool: ${error.message}`, 'ToolManager');
            setToolCreationError(`Error editing tool: ${error.message}`);
        }
    }, [system]);

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
            setNewApiAuthType((tool.config?.authType as 'none' | 'apiKey') || 'none');
            setNewApiKeyHeader(tool.config?.apiKeyHeader || 'Authorization');
            setNewApiKeyValue(tool.config?.apiKeyValue || '');
        } catch (error: any) {
            systemLog.error(`Error editing API tool: ${error.message}`, 'ToolManager');
            setToolCreationError(`Error editing API tool: ${error.message}`);
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
            systemLog.error(`Error editing tool input schema: ${error.message}`, 'ToolManager');
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
            systemLog.error(`Error editing tool output schema: ${error.message}`, 'ToolManager');
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
            fetchTools();
        } catch (error: any) {
            systemLog.error(`Error saving tool: ${error.message}`, 'ToolManager');
            setToolCreationError(`Error saving tool: ${error.message}`);
        }
    }, [system, fetchTools]);

    const handleSaveApiTool = useCallback((toolId: string, newApiEndpoint: string, newApiMethod: string, newApiHeaders: string, newApiAuthType: string, newApiKeyHeader: string, newApiKeyValue: string) => {
         try {
            const tool = system.getTool(toolId);
            if (!tool) {
                setToolCreationError(`Tool with id ${toolId} not found.`);
                return;
            }

             try {
                JSON.parse(newApiHeaders);
                 new URL(newApiEndpoint); // Validate API Endpoint URL
            } catch (e: any) {
                setToolCreationError(`Invalid JSON or URL in API definition: ${e.message}`);
                return;
            }

            tool.logic = newApiEndpoint;
            tool.config = {
                method: newApiMethod,
                headers: newApiHeaders,
                authType: newApiAuthType,
                apiKeyHeader: newApiKeyHeader,
                apiKeyValue: newApiKeyValue,
            };
            system.updateNote(tool);
            setEditingApiToolId(null);
            setToolCreationError(null);
            fetchTools();
        } catch (error: any) {
            systemLog.error(`Error saving API tool: ${error.message}`, 'ToolManager');
            setToolCreationError(`Error saving API tool: ${error.message}`);
        }
    }, [system, fetchTools]);

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
            fetchTools();
        } catch (error: any) {
            systemLog.error(`Error saving tool input schema: ${error.message}`, 'ToolManager');
            setToolCreationError(`Error saving tool input schema: ${error.message}`);
        }
    }, [system, fetchTools]);

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
            fetchTools();
        } catch (error: any) {
            systemLog.error(`Error saving tool output schema: ${error.message}`, 'ToolManager');
            setToolCreationError(`Error saving tool output schema: ${error.message}`);
        }
    }, [system, fetchTools]);

    // Handle canceling the editing of a tool
    const handleCancelEditTool = useCallback(() => {
        setEditingToolId(null);
    }, []);

     const handleCancelEditApiTool = useCallback(() => {
        setEditingApiToolId(null);
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

    return (
        <div className={styles.toolCreationContainer}>
            {/* Section for creating new tools */}
            <h3>Create New Tool</h3>
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
                onChange={(e) => {
                    setNewToolType(e.target.value as 'custom' | 'langchain' | 'api');
                }}
            >
                <option value="custom">Custom</option>
                <option value="langchain">LangChain</option>
                <option value="api">API</option>
            </select>

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
                        height="200"
                        language="json"
                        theme="vs-dark"
                        value={newApiHeaders}
                        options={editorOptions}
                        onChange={(value) => setNewApiHeaders(value)}
                    />

                    <label htmlFor="newApiAuthType">Authentication Type:</label>
                    <select
                        id="newApiAuthType"
                        value={newApiAuthType}
                        onChange={(e) => setNewApiAuthType(e.target.value as 'none' | 'apiKey')}
                    >
                        <option value="none">None</option>
                        <option value="apiKey">API Key</option>
                    </select>

                    {newApiAuthType === 'apiKey' && (
                        <>
                            <label htmlFor="newApiKeyHeader">API Key Header:</label>
                            <input
                                type="text"
                                id="newApiKeyHeader"
                                placeholder="Header name for API Key"
                                value={newApiKeyHeader}
                                onChange={(e) => setNewApiKeyHeader(e.target.value)}
                            />

                            <label htmlFor="newApiKeyValue">API Key Value:</label>
                            <input
                                type="text"
                                id="newApiKeyValue"
                                placeholder="Your API Key"
                                value={newApiKeyValue}
                                onChange={(e) => setNewApiKeyValue(e.target.value)}
                            />
                        </>
                    )}
                </>
            )}

            {newToolType !== 'api' && (
                <label htmlFor="newToolLogic">Tool Logic (JSON):</label>
            )}
            {newToolType !== 'api' && (
                <MonacoEditor
                    width="600"
                    height="300"
                    language="json"
                    theme="vs-dark"
                    value={newToolLogic}
                    options={editorOptions}
                    onChange={(value) => setNewToolLogic(value)}
                />
            )}

            <label htmlFor="newToolInputSchema">Tool Input Schema (JSON):</label>
            <MonacoEditor
                width="600"
                height="300"
                language="json"
                theme="vs-dark"
                value={newToolInputSchema}
                options={editorOptions}
                onChange={(value) => setNewToolInputSchema(value)}
            />
            <label htmlFor="newToolOutputSchema">Tool Output Schema (JSON):</label>
            <MonacoEditor
                width="600"
                height="300"
                language="json"
                theme="vs-dark"
                value={newToolOutputSchema}
                options={editorOptions}
                onChange={(value) => setNewToolOutputSchema(value)}
            />
            <button onClick={handleCreateTool}>Create Tool</button>
            {toolCreationError && <div className={styles.errorMessage}>Error: {toolCreationError}</div>}

            {/* Section for displaying existing tools */}
            <h3>Existing Tools</h3>
            <ul>
                {system.getAllTools().map(tool => (
                    <li key={tool.id}>
                        {tool.title}
                        {tool.type !== 'api' && (
                            <button onClick={() => {
                                handleEditTool(tool.id);
                                setNewToolLogic(tool.logic || '');
                            }}>Edit Logic</button>
                        )}
                        {tool.type === 'api' && (
                            <button onClick={() => {
                                handleEditApiTool(tool.id);
                            }}>Edit API Config</button>
                        )}
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

                        {editingApiToolId === tool.id && (
                            <div className={styles.templateEditor}>
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
                                        height="200"
                                        language="json"
                                        theme="vs-dark"
                                        value={newApiHeaders}
                                        options={editorOptions}
                                        onChange={(value) => setNewApiHeaders(value)}
                                    />

                                    <label htmlFor={`newApiAuthType`}>Authentication Type:</label>
                                    <select
                                        id={`newApiAuthType`}
                                        value={newApiAuthType}
                                        onChange={(e) => setNewApiAuthType(e.target.value as 'none' | 'apiKey')}
                                    >
                                        <option value="none">None</option>
                                        <option value="apiKey">API Key</option>
                                    </select>

                                    {newApiAuthType === 'apiKey' && (
                                        <>
                                            <label htmlFor={`newApiKeyHeader`}>API Key Header:</label>
                                            <input
                                                type="text"
                                                id={`newApiKeyHeader`}
                                                placeholder="Header name for API Key"
                                                value={newApiKeyHeader}
                                                onChange={(e) => setNewApiKeyHeader(e.target.value)}
                                            />

                                            <label htmlFor={`newApiKeyValue`}>API Key Value:</label>
                                            <input
                                                type="text"
                                                id={`newApiKeyValue`}
                                                placeholder="Your API Key"
                                                value={newApiKeyValue}
                                                onChange={(e) => setNewApiKeyValue(e.target.value)}
                                            />
                                        </>
                                    )}
                                <button onClick={() => handleSaveApiTool(tool.id, newApiEndpoint, newApiMethod, newApiHeaders, newApiAuthType, newApiKeyHeader, newApiKeyValue)}>Save</button>
                                <button onClick={handleCancelEditApiTool}>Cancel</button>
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
        </div>
    );
};
