// src/lib/planningRules.ts
import { Note } from '../types';
import { SystemNote, getSystemNote } from './systemNote';
import idService from './idService';
import { systemLog } from './systemLog';

export interface PlanningRule {
    name: string;
    condition: (task: Note, system: SystemNote) => boolean;
    action: (task: Note, system: SystemNote) => Promise<void>;
}

const planningRules: PlanningRule[] = [
    {
        name: "Decompose Complex Task",
        condition: (task: Note, system: SystemNote) => {
            return task.priority > 75 && task.content.messages?.length === 0; // High priority, vague description
        },
        action: async (task: Note, system: SystemNote) => {
            systemLog.info(`Decomposing complex task: ${task.title}`, 'PlanningRules');
            // In a real implementation, this would use the LLM to generate sub-tasks
            const subTask1: Note = {
                id: idService.generateId(),
                type: 'Task',
                title: `Sub-task 1 of ${task.title}`,
                content: { messages: [] },
                status: 'pending',
                priority: task.priority - 10,
                createdAt: new Date().toISOString(),
                updatedAt: null,
                references: [task.id],
                description: `A subtask of ${task.title}`,
            };
            system.addNote(subTask1);
            task.references = [...(task.references ?? []), subTask1.id];
            system.updateNote(task);
            systemLog.info(`Created subtask: ${subTask1.title}`, 'PlanningRules');
        }
    },
    {
        name: "Add Web Search Step",
        condition: (task: Note, system: SystemNote) => {
            return task.description?.toLowerCase().includes("information") && !task.logic?.includes("web-search-tool");
        },
        action: async (task: Note, system: SystemNote) => {
            systemLog.info(`Adding web search step to task: ${task.title}`, 'PlanningRules');
            // In a real implementation, this would modify the task's logic to include a web search tool step
            task.logic = JSON.stringify({
                steps: [
                    {
                        id: idService.generateId(),
                        type: "tool",
                        toolId: system.getAllTools().find(tool => tool.title === "Web Search Tool")?.id,
                        input: "{query: task.description}"
                    }
                ]
            });
            system.updateNote(task);
            systemLog.info(`Added web search step to task: ${task.title}`, 'PlanningRules');
        }
    },
    // Add more planning rules here
];

export default planningRules;
