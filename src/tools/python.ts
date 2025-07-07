import { z } from 'zod';
import { runCommand } from '../utils/command.js';
import Config from '../config/index.js';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import { zodToJsonSchema } from 'zod-to-json-schema';

const inputSchema = z.object({
    filePath: z.string(),
    linter: z.enum(['pylint', 'flake8', 'black', 'mypy']).optional(),
    fix: z.boolean().default(false),
});

export const pythonTool = {
    name: 'python',
    description: 'Run Python code and return the output, errors, and execution time.',
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

        const { filePath, linter, fix } = parseResult.data;

        if (!Config.getInstance().isPathAllowed(filePath)) {
            return { success: false, errors: ['Path not allowed'] as string[], warnings: [] as string[], output: '' };
        }

        // Find venv or .venv python executable (check up to 2 parent directories)
        async function findVenvPython(startDir: string): Promise<string | null> {
            let currentDir = startDir;
            let levels = 0;
            while (levels < 3) { // current, parent, grandparent
                for (const venvName of ['venv', '.venv']) {
                    const venvPath = join(currentDir, venvName, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
                    try {
                        await fs.access(venvPath);
                        return venvPath;
                    } catch { /* ignore not found */ }
                }
                const parentDir = dirname(currentDir);
                if (parentDir === currentDir) break; // reached root
                currentDir = parentDir;
                levels++;
            }
            return null;
        }

        try {
            await fs.access(filePath);
            const feedback = { success: true, errors: [] as string[], warnings: [] as string[], output: '' };
            const fileDir = dirname(filePath);
            const venvPython = await findVenvPython(fileDir);
            const pythonExec = venvPython || 'python';
            // Syntax check
            const syntaxResult = await runCommand(`${pythonExec} -m py_compile "${filePath}"`, { cwd: fileDir });
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
                    case 'pylint': lintCommand = `${pythonExec} -m pylint "${filePath}"`; break;
                    case 'flake8': lintCommand = `${pythonExec} -m flake8 "${filePath}"`; break;
                    case 'black': lintCommand = fix ? `${pythonExec} -m black "${filePath}"` : `${pythonExec} -m black --check "${filePath}"`; break;
                    case 'mypy': lintCommand = `${pythonExec} -m mypy "${filePath}"`; break;
                }
                const lintResult = await runCommand(lintCommand, { cwd: fileDir });
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