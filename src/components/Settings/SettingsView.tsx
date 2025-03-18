import React, { useState, useEffect } from 'react';
import styles from './SettingsView.module.css';
import { getSystemNote, initializeSystemNote } from '../../lib/systemNote';
import { UIView } from '../../components/UI/UI';
import { ChatOpenAI } from 'langchain/chat_models/openai';

// Define a type for the settings
interface Settings {
    concurrency: number;
    apiKey: string;
    theme: string;
    modelName: string;
    temperature: number;
    usePersistence: boolean;
    serpApiKey: string;
}

const defaultSettings: Settings = {
    concurrency: 5,
    apiKey: '',
    theme: 'light',
    modelName: 'gpt-3.5-turbo',
    temperature: 0.7,
    usePersistence: false,
    serpApiKey: '',
};

export const SettingsView: React.FC = () => {
    const system = getSystemNote();

    // Initialize settings state
    const [settings, setSettings] = useState<Settings>(() => {
        const storedSettings = localStorage.getItem('settings');
        return storedSettings ? JSON.parse(storedSettings) : defaultSettings;
    });

    // Load settings from localStorage on component mount
    useEffect(() => {
        const storedSettings = localStorage.getItem('settings');
        if (storedSettings) {
            setSettings(JSON.parse(storedSettings));
        }
    }, []);

    // Generic handler for input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        const newSettings = { ...settings, [name]: newValue };
        setSettings(newSettings);
    };

    const handleSaveSettings = () => {
        // Save settings to localStorage as a single JSON object
        localStorage.setItem('settings', JSON.stringify(settings));

        // Apply changes to system where applicable
        system.data.content.concurrencyLimit = settings.concurrency;

        //Theme handling
        document.documentElement.setAttribute('data-theme', settings.theme);

        //Reinitialize system note if persistence changes
        const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
        if (apiKey) {
            const llm = new ChatOpenAI({
                openAIApiKey: apiKey,
                modelName: settings.modelName,
                temperature: settings.temperature
            });
            initializeSystemNote(llm, settings.usePersistence); // Re-initialize SystemNote with LLM
        } else {
            console.warn("No OpenAI API key found. The system will run without LLM functionality.");
            initializeSystemNote({} as any, settings.usePersistence); // Initialize SystemNote without LLM
        }

        // Apply theme
        document.documentElement.setAttribute('data-theme', settings.theme);

        alert('Settings saved!');
    };

    return (
        <UIView title="System Settings ⚙️">
            <div className={styles.settingsContainer}>
                <label>
                    Concurrency Limit:
                    <input
                        type="number"
                        name="concurrency"
                        value={settings.concurrency}
                        onChange={handleInputChange}
                    />
                </label>

                <label>
                    OpenAI API Key:
                    <input
                        type="text"
                        name="apiKey"
                        value={settings.apiKey}
                        onChange={handleInputChange}
                    />
                </label>

                <label>
                    SerpAPI API Key:
                    <input
                        type="text"
                        name="serpApiKey"
                        value={settings.serpApiKey}
                        onChange={handleInputChange}
                    />
                </label>

                <label>
                    LLM Model:
                    <select
                        name="modelName"
                        value={settings.modelName}
                        onChange={handleInputChange}
                    >
                        <option value="gpt-3.5-turbo">GPT 3.5 Turbo</option>
                        <option value="gpt-4">GPT 4</option>
                    </select>
                </label>

                <label>
                    Temperature:
                    <input
                        type="number"
                        name="temperature"
                        value={settings.temperature}
                        onChange={handleInputChange}
                        step="0.1"
                        min="0"
                        max="1"
                    />
                </label>

                <label>
                    Theme:
                    <select
                        name="theme"
                        value={settings.theme}
                        onChange={handleInputChange}
                    >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                </label>
                <label>
                    Enable Persistence:
                    <input
                        type="checkbox"
                        name="usePersistence"
                        checked={settings.usePersistence}
                        onChange={handleInputChange}
                    />
                </label>

                <button onClick={handleSaveSettings}>Save Settings</button>
            </div>
        </UIView>
    );
};
