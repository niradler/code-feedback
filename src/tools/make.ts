import { z } from 'zod';
import { runCommand } from '../utils/command.js';
import { isPathAllowed } from '../config/allowedPaths.js';
import { join } from 'path';
import { promises as fs } from 'fs';

const inputSchema = z.object({
    projectPath: z.string(),
    target: z.string().optional(),
    makeArgs: z.array(z.string()).default([]),
    timeout: z.number().default(60000),
});
type Input = z.infer<typeof inputSchema>;

export const makeTool = {
    name: 'run_make_command',
    description: 'Run Make commands (make, make build, make test, etc.)',
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: {
                type: 'string',
                description: 'Path to the project directory containing Makefile'
            },
            target: {
                type: 'string',
                description: 'Make target to run (default: no target)'
            },
            makeArgs: {
                type: 'array',
                items: { type: 'string' },
                description: 'Additional arguments for make command',
                default: []
            },
            timeout: {
                type: 'number',
                description: 'Timeout in milliseconds (default: 60000)',
                default: 60000
            }
        },
        required: ['projectPath']
    },
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
        
        const { projectPath, target, makeArgs, timeout } = parseResult.data;
        
        if (!isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'] as string[], warnings: [] as string[], output: '' };
        }
        try {
            await fs.access(join(projectPath, 'Makefile'));
            let command = 'make';
            if (target) command += ` ${target}`;
            if (makeArgs.length > 0) command += ` ${makeArgs.join(' ')}`;
            const result = await runCommand(command, { cwd: projectPath, timeout });
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