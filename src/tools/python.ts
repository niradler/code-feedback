import { z } from 'zod';
import { runCommand } from '../utils/command.js';
import { isPathAllowed } from '../config/allowedPaths.js';
import { dirname } from 'path';
import { promises as fs } from 'fs';

const inputSchema = z.object({
    filePath: z.string(),
    linter: z.enum(['pylint', 'flake8', 'black', 'mypy']).optional(),
    fix: z.boolean().default(false),
});

export const pythonTool = {
    name: 'validate_python_file',
    description: 'Validate Python file with syntax checking and optional linting',
    inputSchema: {
        type: 'object',
        properties: {
            filePath: {
                type: 'string',
                description: 'Path to the Python file to validate'
            },
            linter: {
                type: 'string',
                enum: ['pylint', 'flake8', 'black', 'mypy'],
                description: 'Linter to use (pylint, flake8, black, mypy)'
            },
            fix: {
                type: 'boolean',
                description: 'Whether to auto-fix issues (works with black)',
                default: false
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

        const { filePath, linter, fix } = parseResult.data;

        if (!isPathAllowed(filePath)) {
            return { success: false, errors: ['Path not allowed'] as string[], warnings: [] as string[], output: '' };
        }
        try {
            await fs.access(filePath);
            const feedback = { success: true, errors: [] as string[], warnings: [] as string[], output: '' };
            // Syntax check
            const syntaxResult = await runCommand(`python -m py_compile "${filePath}"`, { cwd: dirname(filePath) });
            if (syntaxResult.exitCode !== 0) {
                feedback.success = false;
                feedback.errors.push(`Syntax error: ${syntaxResult.stderr}`);
            } else {
                feedback.output += 'Syntax check: OK\n';
            }
            // Linter
            if (linter && feedback.success) {
                let lintCommand = '';
                switch (linter) {
                    case 'pylint': lintCommand = `pylint "${filePath}"`; break;
                    case 'flake8': lintCommand = `flake8 "${filePath}"`; break;
                    case 'black': lintCommand = fix ? `black "${filePath}"` : `black --check "${filePath}"`; break;
                    case 'mypy': lintCommand = `mypy "${filePath}"`; break;
                }
                const lintResult = await runCommand(lintCommand, { cwd: dirname(filePath) });
                feedback.output += `${linter}: ${lintResult.stdout}\n`;
                if (lintResult.exitCode !== 0) {
                    if (linter === 'pylint' && lintResult.exitCode < 32) {
                        feedback.warnings.push(`${linter} issues: ${lintResult.stdout}`);
                    } else {
                        feedback.errors.push(`${linter} errors: ${lintResult.stderr || lintResult.stdout}`);
                        feedback.success = false;
                    }
                }
            }
            return feedback;
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)] as string[], warnings: [] as string[], output: '' };
        }
    },
}; 