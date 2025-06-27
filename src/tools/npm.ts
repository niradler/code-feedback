import { z } from 'zod';
import { runCommand } from '../utils/command.js';
import { isPathAllowed } from '../config/allowedPaths.js';
import { join } from 'path';
import { promises as fs } from 'fs';

const inputSchema = z.object({
    projectPath: z.string(),
    scriptName: z.string(),
    timeout: z.number().default(60000),
});
type Input = z.infer<typeof inputSchema>;

const listScriptsSchema = z.object({
    projectPath: z.string(),
});
type ListScriptsInput = z.infer<typeof listScriptsSchema>;

export const npmTool = {
    name: 'run_npm_script',
    description: 'Run any npm script defined in package.json (test, lint, build, etc.)',
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: {
                type: 'string',
                description: 'Path to the project directory containing package.json'
            },
            scriptName: {
                type: 'string',
                description: 'Name of the npm script to run'
            },
            timeout: {
                type: 'number',
                description: 'Timeout in milliseconds (default: 60000)',
                default: 60000
            }
        },
        required: ['projectPath', 'scriptName']
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
        
        const { projectPath, scriptName, timeout } = parseResult.data;
        
        if (!isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'] as string[], warnings: [] as string[], output: '' };
        }
        try {
            const packageJsonPath = join(projectPath, 'package.json');
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            if (!packageJson.scripts || !packageJson.scripts[scriptName]) {
                return { success: false, errors: [`Script '${scriptName}' not found in package.json`] as string[], warnings: [] as string[], output: '' };
            }
            const command = `npm run ${scriptName}`;
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

export const listNpmScriptsTool = {
    name: 'list_npm_scripts',
    description: 'List all available npm scripts in a project',
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: {
                type: 'string',
                description: 'Path to the project directory containing package.json'
            }
        },
        required: ['projectPath']
    },
    async run(args: any) {
        // Validate input using Zod
        const parseResult = listScriptsSchema.safeParse(args);
        if (!parseResult.success) {
            return {
                success: false,
                errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')} - ${e.message}`),
                scripts: {}
            };
        }
        
        const { projectPath } = parseResult.data;
        
        if (!isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'] as string[], scripts: {} };
        }
        try {
            const packageJsonPath = join(projectPath, 'package.json');
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            return { success: true, scripts: packageJson.scripts || {} };
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)], scripts: {} };
        }
    },
}; 