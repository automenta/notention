// src/lib/settingsService.ts
interface Settings {
    concurrency: number;
    apiKey: string;
    theme: string;
    modelName: string;
    temperature: number;
    usePersistence: boolean;
    serpApiKey: string;
}

export const getSettings = (): Settings | null => {
    try {
        const settingsString = localStorage.getItem('settings');
        if (settingsString) {
            return JSON.parse(settingsString) as Settings;
        }
        return null;
    } catch (error) {
        console.error("Error getting settings from local storage:", error);
        return null;
    }
};
