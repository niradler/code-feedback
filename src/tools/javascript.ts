import { z } from 'zod';
import { runCommand } from '../utils/command.js';
import Config from '../config/index.js';
import { dirname } from 'path';
import { promises as fs } from 'fs';
import { zodToJsonSchema } from 'zod-to-json-schema';

const inputSchema = z.object({
    filePath: z.string(),
});

export const javascriptTool = {
    name: 'javascript',
    description: 'Run JavaScript code and return the output, errors, and execution time.',
    inputSchema: zodToJsonSchema(inputSchema),
    async run(args: any) {
        // Validate input using Zod
        const parseResult = inputSchema.safeParse(args);
        if (!parseResult.success) {
            return {
                success: false,
                errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')} - ${e.message}`),
                warnings: [],
                output: ''
            };
        }

        const { filePath } = parseResult.data;

        if (!Config.getInstance().isPathAllowed(filePath)) {
            return { success: false, errors: ['Path not allowed'] as string[], warnings: [] as string[], output: '' };
        }
        try {
            await fs.access(filePath);
            const nodeCommand = `node --check "${filePath}"`;
            const result = await runCommand(nodeCommand, { cwd: dirname(filePath) });
            const feedback = {
                success: result.exitCode === 0,
                errors: result.stderr ? [result.stderr] as string[] : [],
                warnings: [] as string[],
                output: result.stdout,
            };
            return feedback;
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)] as string[], warnings: [] as string[], output: '' };
        }
    },
}; 