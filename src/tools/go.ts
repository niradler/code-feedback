import { z } from 'zod';
import { runCommand } from '../utils/command.js';
import Config from '../config/index.js';
import { dirname } from 'path';
import { promises as fs } from 'fs';
import { zodToJsonSchema } from 'zod-to-json-schema';

const inputSchema = z.object({
    filePath: z.string(),
    actions: z.array(z.enum(['build', 'fmt', 'mod', 'vet', 'test'])).optional(),
    command: z.string().optional(),
});

export const goTool = {
    name: 'go',
    description: 'Run Go code and return the output, errors, and execution time.',
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

        const { filePath, command } = parseResult.data;
        let { actions } = parseResult.data;
        if (!actions || actions.length === 0) {
            actions = ['build', 'fmt'];
        }

        if (!Config.getInstance().isPathAllowed(filePath)) {
            return { success: false, errors: ['Path not allowed'] as string[], warnings: [] as string[], output: '' };
        }
        try {
            await fs.access(filePath);
            const feedback = { success: true, errors: [] as string[], warnings: [] as string[], output: '' };
            const dir = dirname(filePath);
            if (command) {
                const result = await runCommand(`go ${command}`, { cwd: dir });
                feedback.output += `Command: go ${command}\n${result.stdout}\n`;
                if (result.exitCode !== 0) {
                    feedback.success = false;
                    feedback.errors.push(`Command failed: ${result.stderr}`);
                }
                return feedback;
            }
            for (const action of actions) {
                if (action === 'build') {
                    const buildResult = await runCommand(`go build -o /dev/null "${filePath}"`, { cwd: dir });
                    feedback.output += `Build: ${buildResult.stdout}\n`;
                    if (buildResult.exitCode !== 0) {
                        feedback.success = false;
                        feedback.errors.push(`Build failed: ${buildResult.stderr}`);
                    }
                } else if (action === 'fmt') {
                    const fmtResult = await runCommand(`gofmt -d "${filePath}"`, { cwd: dir });
                    if (fmtResult.stdout.trim()) {
                        feedback.warnings.push('File is not properly formatted. Run gofmt to fix.');
                        feedback.output += `Format diff:\n${fmtResult.stdout}\n`;
                    }
                } else if (action === 'mod') {
                    // go mod tidy must be run in a directory with go.mod
                    const modResult = await runCommand(`go mod tidy`, { cwd: dir });
                    feedback.output += `Mod tidy: ${modResult.stdout}\n`;
                    if (modResult.exitCode !== 0) {
                        feedback.success = false;
                        feedback.errors.push(`go mod tidy failed: ${modResult.stderr}`);
                    }
                } else if (action === 'vet') {
                    const vetResult = await runCommand(`go vet "${filePath}"`, { cwd: dir });
                    feedback.output += `Vet: ${vetResult.stdout}\n`;
                    if (vetResult.exitCode !== 0) {
                        feedback.success = false;
                        feedback.errors.push(`go vet failed: ${vetResult.stderr}`);
                    }
                } else if (action === 'test') {
                    if (filePath.includes('_test.go')) {
                        const testResult = await runCommand(`go test -v "${filePath}"`, { cwd: dir });
                        feedback.output += `Test: ${testResult.stdout}\n`;
                        if (testResult.exitCode !== 0) {
                            feedback.errors.push(`Tests failed: ${testResult.stderr}`);
                            feedback.success = false;
                        }
                    } else {
                        // If a directory is provided, run all tests in the package
                        const testResult = await runCommand(`go test -v`, { cwd: dir });
                        feedback.output += `Test: ${testResult.stdout}\n`;
                        if (testResult.exitCode !== 0) {
                            feedback.errors.push(`Tests failed: ${testResult.stderr}`);
                            feedback.success = false;
                        }
                    }
                }
            }
            return feedback;
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)] as string[], warnings: [] as string[], output: '' };
        }
    },
}; 