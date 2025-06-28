import { z } from 'zod';
import { runCommand } from '../utils/command.js';
import { isPathAllowed } from '../config/allowedPaths.js';
import { dirname } from 'path';
import { promises as fs } from 'fs';

const inputSchema = z.object({
    filePath: z.string(),
    checkFormat: z.boolean().default(true),
    runTests: z.boolean().default(false),
});

export const goTool = {
    name: 'validate_go_file',
    description: 'Validate Go source file with compilation and formatting checks',
    inputSchema: {
        type: 'object',
        properties: {
            filePath: {
                type: 'string',
                description: 'Path to the Go file to validate'
            },
            checkFormat: {
                type: 'boolean',
                description: 'Whether to check Go formatting with gofmt',
                default: true
            },
            runTests: {
                type: 'boolean',
                description: 'Whether to run Go tests if it\'s a test file',
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

        const { filePath, checkFormat, runTests } = parseResult.data;

        if (!isPathAllowed(filePath)) {
            return { success: false, errors: ['Path not allowed'] as string[], warnings: [] as string[], output: '' };
        }
        try {
            await fs.access(filePath);
            const feedback = { success: true, errors: [] as string[], warnings: [] as string[], output: '' };
            // Compilation
            const buildResult = await runCommand(`go build -o /dev/null "${filePath}"`, { cwd: dirname(filePath) });
            feedback.output += `Build: ${buildResult.stdout}\n`;
            if (buildResult.exitCode !== 0) {
                feedback.success = false;
                feedback.errors.push(`Build failed: ${buildResult.stderr}`);
            }
            // Formatting
            if (checkFormat) {
                const fmtResult = await runCommand(`gofmt -d "${filePath}"`, { cwd: dirname(filePath) });
                if (fmtResult.stdout.trim()) {
                    feedback.warnings.push('File is not properly formatted. Run gofmt to fix.');
                    feedback.output += `Format diff:\n${fmtResult.stdout}\n`;
                }
            }
            // Tests
            if (runTests && filePath.includes('_test.go')) {
                const testResult = await runCommand(`go test -v "${filePath}"`, { cwd: dirname(filePath) });
                feedback.output += `Test: ${testResult.stdout}\n`;
                if (testResult.exitCode !== 0) {
                    feedback.errors.push(`Tests failed: ${testResult.stderr}`);
                    feedback.success = false;
                }
            }
            return feedback;
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)] as string[], warnings: [] as string[], output: '' };
        }
    },
}; 