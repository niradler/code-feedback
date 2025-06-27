import { z } from 'zod';
import { runCommand } from '../utils/command.js';
import { isPathAllowed } from '../config/allowedPaths.js';
import { dirname } from 'path';
import { promises as fs } from 'fs';

const inputSchema = z.object({
    filePath: z.string(),
    fix: z.boolean().default(false),
    configPath: z.string().optional(),
});
type Input = z.infer<typeof inputSchema>;

export const lintTool = {
    name: 'lint_file',
    description: 'Run ESLint on a JavaScript/TypeScript file to check for code quality issues',
    inputSchema: {
        type: 'object',
        properties: {
            filePath: {
                type: 'string',
                description: 'Path to the file to lint'
            },
            fix: {
                type: 'boolean',
                description: 'Whether to automatically fix fixable issues',
                default: false
            },
            configPath: {
                type: 'string',
                description: 'Optional path to ESLint config file'
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
        
        const { filePath, fix, configPath } = parseResult.data;
        
        if (!isPathAllowed(filePath)) {
            return { success: false, errors: ['Path not allowed'] as string[], warnings: [] as string[], output: '' };
        }
        try {
            await fs.access(filePath);
            let eslintCommand = `npx eslint "${filePath}" --format json`;
            if (fix) eslintCommand += ' --fix';
            if (configPath) eslintCommand += ` --config "${configPath}"`;
            const result = await runCommand(eslintCommand, { cwd: dirname(filePath) });
            const feedback = {
                success: result.exitCode === 0,
                errors: [] as string[],
                warnings: [] as string[],
                output: result.stdout,
            };
            try {
                const eslintResults = JSON.parse(result.stdout);
                if (eslintResults.length > 0) {
                    const fileResult = eslintResults[0];
                    fileResult.messages.forEach((message: any) => {
                        const formattedMessage = `Line ${message.line}, Column ${message.column}: ${message.message} (${message.ruleId})`;
                        if (message.severity === 2) feedback.errors.push(formattedMessage);
                        else if (message.severity === 1) feedback.warnings.push(formattedMessage);
                    });
                }
            } catch (parseError) {
                if (result.stderr) feedback.errors.push(result.stderr);
            }
            return feedback;
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)] as string[], warnings: [] as string[], output: '' };
        }
    },
}; 