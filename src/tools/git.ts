import { z } from 'zod';
import { runCommand } from '../utils/command.js';
import Config from '../config/index.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';

const inputSchema = z.object({
    repoPath: z.string(),
    gitCommand: z.enum([
        'status',
        'diff',
        'log',
        'branch',
        'checkout',
        'commit',
        'add',
        'push',
        'pull',
        'merge',
        'reset',
        'custom'
    ]),
    args: z.array(z.string()).default([]),
    message: z.string().optional(),
    timeout: z.number().default(60000),
});

export const gitTool = {
    name: 'git',
    description: 'Run git commands (status, add, commit, push, etc.) in a repository.',
    inputSchema: zodToJsonSchema(inputSchema),
    async run(args: any) {
        const parseResult = inputSchema.safeParse(args);
        if (!parseResult.success) {
            return {
                success: false,
                errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')}: ${e.message}`),
                warnings: [],
                output: ''
            };
        }
        const { repoPath, gitCommand, args: gitArgs, message, timeout } = parseResult.data;
        if (!Config.getInstance().isPathAllowed(repoPath)) {
            return { success: false, errors: ['Path not allowed'], warnings: [], output: '' };
        }
        try {
            await fs.access(join(repoPath, '.git'));
            let command = 'git';
            switch (gitCommand) {
                case 'status':
                case 'diff':
                case 'log':
                case 'branch':
                case 'push':
                case 'pull':
                case 'merge':
                case 'reset':
                    command += ` ${gitCommand}`;
                    if (gitArgs.length > 0) command += ` ${gitArgs.join(' ')}`;
                    break;
                case 'checkout':
                    command += ` checkout`;
                    if (gitArgs.length > 0) command += ` ${gitArgs.join(' ')}`;
                    break;
                case 'add':
                    command += ` add`;
                    if (gitArgs.length > 0) command += ` ${gitArgs.join(' ')}`;
                    else command += ' .';
                    break;
                case 'commit':
                    command += ' commit';
                    if (message) command += ` -m "${message}"`;
                    if (gitArgs.length > 0) command += ` ${gitArgs.join(' ')}`;
                    break;
                case 'custom':
                    if (gitArgs.length > 0) command += ` ${gitArgs.join(' ')}`;
                    else return { success: false, errors: ['No custom git command provided in args'], warnings: [], output: '' };
                    break;
            }
            const result = await runCommand(command, { cwd: repoPath, timeout });
            return {
                success: result.exitCode === 0,
                errors: result.stderr ? [result.stderr] : [],
                warnings: [],
                output: result.stdout,
            };
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)], warnings: [], output: '' };
        }
    },
}; 