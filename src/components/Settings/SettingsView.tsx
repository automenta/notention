import React, { useState, useCallback } from 'react';
import styles from './SettingsView.module.css';
import { Settings, validateSettings } from './settingsValidation';
import { SettingsService } from '../../lib/settingsService';
import { getSystemNote } from '../../lib/systemNote';

interface SettingsViewProps {
    onClose: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onClose }) => {
    const initialSettings = SettingsService.getSettings() || {
        concurrency: 5,
        apiKey: '',
        theme: '',
        modelName: '',
        temperature: 0.7,
        usePersistence: false,
        serpApiKey: '',
    };

    const [settings, setSettings] = useState<Settings>(initialSettings);
    const [errors, setErrors] = useState<{ [key: string]: string }>({}); // Initialize with an empty object

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const {name, value, type, checked} = e.target;
        setSettings(prevSettings => {
            return {
                ...prevSettings,
                [name]: type === 'checkbox' ? checked : value,
            };
        });
    };

    const handleSave = useCallback(() => {
        const newErrors: { [key: string]: string } = {};

        if (!settings.apiKey.trim()) {
            newErrors.apiKey = 'API Key cannot be empty.';
        }

        if (!settings.modelName.trim()) {
            newErrors.modelName = 'Model Name cannot be empty.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({}); // Clear any previous errors

        localStorage.setItem('settings', JSON.stringify(settings)); // Save settings to local storage
        const systemNote = getSystemNote();
        systemNote.data.content.llm.apiKey = settings.apiKey;
        systemNote.data.content.llm.modelName = settings.modelName;
        systemNote.data.content.llm.temperature = settings.temperature;
        localStorage.setItem('usePersistence', JSON.stringify(settings.usePersistence));
        onClose();

    }, [settings, onClose]);

    return (
        <div className={styles.settingsView}>
            <h2>Settings</h2>
            {errors.general && <div className={styles.error}>{errors.general}</div>}
            <div className={styles.settingRow}>
                <label htmlFor="concurrency">Concurrency:</label>
                <input
                    type="number"
                    id="concurrency"
                    name="concurrency"
                    value={settings.concurrency}
                    onChange={handleChange}
                />
                {errors.concurrency && <div className={styles.error}>{errors.concurrency}</div>}
            </div>
            <div className={styles.settingRow}>
                <label htmlFor="apiKey">API Key:</label>
                <input
                    type="text"
                    id="apiKey"
                    name="apiKey"
                    value={settings.apiKey}
                    onChange={handleChange}
                />
                {errors.apiKey && <div className={styles.error}>{errors.apiKey}</div>}
            </div>
             <div className={styles.settingRow}>
                <label htmlFor="serpApiKey">Serp API Key:</label>
                <input
                    type="text"
                    id="serpApiKey"
                    name="serpApiKey"
                    value={settings.serpApiKey}
                    onChange={handleChange}
                />
                {errors.serpApiKey && <div className={styles.error}>{errors.serpApiKey}</div>}
            </div>
            <div className={styles.settingRow}>
                <label htmlFor="modelName">Model Name:</label>
                <input
                    type="text"
                    id="modelName"
                    name="modelName"
                    value={settings.modelName}
                    onChange={handleChange}
                />
                {errors.modelName && <div className={styles.error}>{errors.modelName}</div>}
            </div>
            <div className={styles.settingRow}>
                <label htmlFor="temperature">Temperature:</label>
                <input
                    type="number"
                    id="temperature"
                    name="temperature"
                    step="0.1"
                    min="0"
                    max="1"
                    value={settings.temperature}
                    onChange={handleChange}
                />
                {errors.temperature && <div className={styles.error}>{errors.temperature}</div>}
            </div>
            <div className={styles.settingRow}>
                <label htmlFor="usePersistence">Use Persistence:</label>
                <input
                    type="checkbox"
                    id="usePersistence"
                    name="usePersistence"
                    checked={settings.usePersistence}
                    onChange={handleChange}
                />
                {errors.usePersistence && <div className={styles.error}>{errors.usePersistence}</div>}
            </div>
            <div className={styles.buttons}>
                <button onClick={handleSave}>Save</button>
                <button onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

export default SettingsView;
