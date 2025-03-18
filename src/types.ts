import * as z from 'zod';

export const NoteSchema = z.object({
    id: z.string().uuid(),
    type: z.enum([
        "Root", "Task", "Plan", "Step", "Tool", "Memory",
        "System", "Data", "Prompt", "Config"
    ]).default("Task"),
    title: z.string().default("Untitled Note"),
    content: z.any().optional(),
    logic: z.any().optional(),
    status: z.enum(["pending", "active", "running", "completed", "failed", "dormant", "bypassed", "pendingRefinement"]).default("pending"),
    priority: z.number().int().default(0),
    createdAt: z.string().datetime().default(() => new Date().toISOString()),
    updatedAt: z.string().datetime().nullable(),
    inputSchema: z.any().optional(),
    outputSchema: z.any().optional(),
    references: z.array(z.string().uuid()).default([]),
    config: z.record(z.any()).optional(),
    description: z.string().optional(),
    requiresWebSearch: z.boolean().optional(), // Add requiresWebSearch property
});

export type Note = z.infer<typeof NoteSchema>;

export interface TaskLogic {
    steps: WorkflowStep[];
}

export interface WorkflowStep {
    id: string;
    type: 'tool';
    toolId: string;
    input: any;
}
