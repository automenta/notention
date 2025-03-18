import React, {useState} from 'react';
import styles from './SettingsView.module.css';
import {getSystemNote} from '../../lib/systemNote';
import {UIView} from '../UI/UI';

export const SettingsView: React.FC = () => {
    const system = getSystemNote();
    const [concurrency, setConcurrency] = useState(system.data.content.concurrencyLimit);
    const [apiKey, setApiKey] = useState(''); // State for API Key
    const [theme, setTheme] = useState('light'); // State for theme

    const handleConcurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setConcurrency(val);
        system.data.content.concurrencyLimit = val;
    };

    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setApiKey(e.target.value);
        // In a real implementation, you would likely want to store this securely
        // and re-initialize the system with the new API key.
    };

    const handleThemeToggle = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        // In a real implementation, you would apply the theme to the document or app context.
    };

    return (
        <UIView title="System Settings ⚙️">
            <div className={styles.settingsContainer}>
                <label>
                    Concurrency Limit:
                    <input
                        type="number"
                        value={concurrency}
                        onChange={handleConcurrencyChange}
                    />
                </label>

                <label>
                    OpenAI API Key:
                    <input
                        type="text"
                        value={apiKey}
                        onChange={handleApiKeyChange}
                    />
                </label>

                <label>
                    Theme:
                    <button onClick={handleThemeToggle}>
                        {theme === 'light' ? 'Dark' : 'Light'} Mode
                    </button>
                </label>
            </div>
        </UIView>
    );
};
