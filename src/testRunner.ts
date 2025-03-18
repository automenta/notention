import jest from 'jest';
import { systemLog } from './lib/systemLog';

export const runTests = async () => {
    try {
        const result = await jest.run();

        const testResults = result.testResults.map(testResult => ({
            name: testResult.name,
            status: testResult.status,
            message: testResult.message,
        }));

        const success = result.success;

        return { success, testResults };
    } catch (error: any) {
        systemLog.error(`Error running tests: ${error.message}`, 'TestRunner');
        return { success: false, testResults: [{ name: 'Test Run', status: 'error', message: error.message }] };
    }
};
