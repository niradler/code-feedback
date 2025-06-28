import { z } from 'zod';
import { runCommand } from '../utils/command.js';
import { isPathAllowed } from '../config/allowedPaths.js';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

// Define the input schema for the tool
const inputSchema = z.object({
    filePath: z.string().describe('Path to the TypeScript file to validate'),
    tsConfigPath: z.string().optional().describe('Optional path to tsconfig.json (defaults to searching up the directory tree)'),
});

export const typescriptTool = {
    name: 'validate_typescript_file',
    description: 'Validate and compile a TypeScript file, checking for syntax and type errors',
    inputSchema: {
        type: 'object',
        properties: {
            filePath: {
                type: 'string',
                description: 'Path to the TypeScript file to validate'
            },
            tsConfigPath: {
                type: 'string',
                description: 'Optional path to tsconfig.json (defaults to searching up the directory tree)'
            }
        },
        required: ['filePath']
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

        const { filePath, tsConfigPath } = parseResult.data;

        // Validate path permissions
        if (!isPathAllowed(filePath)) {
            return {
                success: false,
                errors: ['Path not allowed: File access is restricted to allowed directories'],
                warnings: [],
                output: ''
            };
        }

        try {
            // Check if file exists
            await fs.access(filePath);

            // Find tsconfig.json if not provided
            let configPath = tsConfigPath;
            if (!configPath) {
                let currentDir = dirname(filePath);
                while (currentDir !== dirname(currentDir)) {
                    try {
                        const tryPath = join(currentDir, 'tsconfig.json');
                        await fs.access(tryPath);
                        configPath = tryPath;
                        break;
                    } catch {
                        currentDir = dirname(currentDir);
                    }
                }
            }

            // Run TypeScript compiler
            const tscCommand = configPath
                ? `npx tsc --noEmit --project "${configPath}" "${filePath}"`
                : `npx tsc --noEmit "${filePath}"`;

            const result = await runCommand(tscCommand, { cwd: dirname(filePath) });

            const feedback = {
                success: result.exitCode === 0,
                errors: [] as string[],
                warnings: [] as string[],
                output: result.stdout + result.stderr,
            };

            // Parse TypeScript compiler output
            if (result.stderr) {
                const lines = result.stderr.split('\n').filter(line => line.trim());
                lines.forEach(line => {
                    if (line.includes('error TS')) {
                        feedback.errors.push(line.trim());
                    } else if (line.includes('warning TS')) {
                        feedback.warnings.push(line.trim());
                    }
                });
            }

            return feedback;
        } catch (error: any) {
            return {
                success: false,
                errors: [error.message || String(error)],
                warnings: [],
                output: error.stack || ''
            };
        }
    },
}; 