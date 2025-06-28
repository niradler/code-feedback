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

const listMakeCommandsInputSchema = z.object({
    projectPath: z.string(),
    timeout: z.number().default(30000),
});

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

function extractMakeTargets(stdout: string): string[] {
    const lines = stdout.split('\n');
    const targets: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('make:') && !trimmed.startsWith('echo')) {
            const match = trimmed.match(/^([a-zA-Z0-9._-]+):/);
            if (match && match[1]) {
                targets.push(match[1]);
            }
        }
    }

    return [...new Set(targets)].sort();
}

export const listMakeCommandsTool = {
    name: 'list_make_commands',
    description: 'List available make targets/commands from a Makefile',
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: {
                type: 'string',
                description: 'Path to the project directory containing Makefile'
            },
            timeout: {
                type: 'number',
                description: 'Timeout in milliseconds (default: 30000)',
                default: 30000
            }
        },
        required: ['projectPath']
    },
    async run(args: any) {
        const parseResult = listMakeCommandsInputSchema.safeParse(args);
        if (!parseResult.success) {
            return {
                success: false,
                errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')} - ${e.message}`),
                warnings: [],
                output: ''
            };
        }

        const { projectPath, timeout } = parseResult.data;

        if (!isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'] as string[], warnings: [] as string[], output: '' };
        }

        try {
            await fs.access(join(projectPath, 'Makefile'));

            const result = await runCommand('make -n', { cwd: projectPath, timeout });

            if (result.exitCode === 0) {
                const stdout = result.stdout || '';
                const targets = extractMakeTargets(stdout);
                const output = targets.length > 0
                    ? `Available make targets:\n${targets.map(target => `- ${target}`).join('\n')}`
                    : 'No make targets found or Makefile is empty';

                return {
                    success: true,
                    errors: [],
                    warnings: [],
                    output: output
                };
            } else {
                return {
                    success: false,
                    errors: [result.stderr || 'Failed to list make commands'],
                    warnings: [],
                    output: ''
                };
            }
        } catch (error: any) {
            return {
                success: false,
                errors: [error.message || String(error)] as string[],
                warnings: [] as string[],
                output: ''
            };
        }
    }
}; 