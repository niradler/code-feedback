import { z } from 'zod';
import { runCommand } from '../utils/command.js';
import Config from '../config/index.js';

const uvInitSchema = z.object({
    projectPath: z.string(),
    projectName: z.string(),
    timeout: z.number().default(60000),
});

const uvAddSchema = z.object({
    projectPath: z.string(),
    packages: z.array(z.string()),
    timeout: z.number().default(120000),
});

const uvRunSchema = z.object({
    projectPath: z.string(),
    command: z.string(),
    timeout: z.number().default(60000),
});

const uvLockSchema = z.object({
    projectPath: z.string(),
    timeout: z.number().default(60000),
});

const uvSyncSchema = z.object({
    projectPath: z.string(),
    timeout: z.number().default(120000),
});

const uvVenvSchema = z.object({
    projectPath: z.string(),
    timeout: z.number().default(60000),
});

export const uvInitTool = {
    name: 'uv_init',
    description: 'Initialize a new Python project using uv',
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: { type: 'string', description: 'Path to the directory to initialize the project in' },
            projectName: { type: 'string', description: 'Name of the project' },
            timeout: { type: 'number', description: 'Timeout in milliseconds (default: 60000)', default: 60000 }
        },
        required: ['projectPath', 'projectName']
    },
    async run(args: any) {
        const parseResult = uvInitSchema.safeParse(args);
        if (!parseResult.success) {
            return { success: false, errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')}- ${e.message}`), warnings: [], output: '' };
        }
        const { projectPath, projectName, timeout } = parseResult.data;
        if (!Config.getInstance().isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'], warnings: [], output: '' };
        }
        try {
            const command = `uv init ${projectName}`;
            const result = await runCommand(command, { cwd: projectPath, timeout });
            return { success: result.exitCode === 0, errors: result.stderr ? [result.stderr] : [], warnings: [], output: result.stdout };
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)], warnings: [], output: '' };
        }
    },
};

export const uvAddTool = {
    name: 'uv_add',
    description: 'Add Python dependencies to a project using uv',
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: { type: 'string', description: 'Path to the project directory' },
            packages: { type: 'array', items: { type: 'string' }, description: 'Array of package names to add' },
            timeout: { type: 'number', description: 'Timeout in milliseconds (default: 120000)', default: 120000 }
        },
        required: ['projectPath', 'packages']
    },
    async run(args: any) {
        const parseResult = uvAddSchema.safeParse(args);
        if (!parseResult.success) {
            return { success: false, errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')}- ${e.message}`), warnings: [], output: '' };
        }
        const { projectPath, packages, timeout } = parseResult.data;
        if (!Config.getInstance().isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'], warnings: [], output: '' };
        }
        try {
            const command = `uv add ${packages.join(' ')}`;
            const result = await runCommand(command, { cwd: projectPath, timeout });
            return { success: result.exitCode === 0, errors: result.stderr ? [result.stderr] : [], warnings: [], output: result.stdout };
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)], warnings: [], output: '' };
        }
    },
};

export const uvRunTool = {
    name: 'uv_run',
    description: 'Run a command in the uv environment',
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: { type: 'string', description: 'Path to the project directory' },
            command: { type: 'string', description: 'Command to run in the uv environment' },
            timeout: { type: 'number', description: 'Timeout in milliseconds (default: 60000)', default: 60000 }
        },
        required: ['projectPath', 'command']
    },
    async run(args: any) {
        const parseResult = uvRunSchema.safeParse(args);
        if (!parseResult.success) {
            return { success: false, errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')}- ${e.message}`), warnings: [], output: '' };
        }
        const { projectPath, command, timeout } = parseResult.data;
        if (!Config.getInstance().isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'], warnings: [], output: '' };
        }
        try {
            const runCmd = `uv run ${command}`;
            const result = await runCommand(runCmd, { cwd: projectPath, timeout });
            return { success: result.exitCode === 0, errors: result.stderr ? [result.stderr] : [], warnings: [], output: result.stdout };
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)], warnings: [], output: '' };
        }
    },
};

export const uvLockTool = {
    name: 'uv_lock',
    description: 'Lock Python dependencies using uv',
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: { type: 'string', description: 'Path to the project directory' },
            timeout: { type: 'number', description: 'Timeout in milliseconds (default: 60000)', default: 60000 }
        },
        required: ['projectPath']
    },
    async run(args: any) {
        const parseResult = uvLockSchema.safeParse(args);
        if (!parseResult.success) {
            return { success: false, errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')}- ${e.message}`), warnings: [], output: '' };
        }
        const { projectPath, timeout } = parseResult.data;
        if (!Config.getInstance().isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'], warnings: [], output: '' };
        }
        try {
            const command = `uv lock`;
            const result = await runCommand(command, { cwd: projectPath, timeout });
            return { success: result.exitCode === 0, errors: result.stderr ? [result.stderr] : [], warnings: [], output: result.stdout };
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)], warnings: [], output: '' };
        }
    },
};

export const uvSyncTool = {
    name: 'uv_sync',
    description: 'Sync Python dependencies using uv',
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: { type: 'string', description: 'Path to the project directory' },
            timeout: { type: 'number', description: 'Timeout in milliseconds (default: 120000)', default: 120000 }
        },
        required: ['projectPath']
    },
    async run(args: any) {
        const parseResult = uvSyncSchema.safeParse(args);
        if (!parseResult.success) {
            return { success: false, errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')}- ${e.message}`), warnings: [], output: '' };
        }
        const { projectPath, timeout } = parseResult.data;
        if (!Config.getInstance().isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'], warnings: [], output: '' };
        }
        try {
            const command = `uv sync`;
            const result = await runCommand(command, { cwd: projectPath, timeout });
            return { success: result.exitCode === 0, errors: result.stderr ? [result.stderr] : [], warnings: [], output: result.stdout };
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)], warnings: [], output: '' };
        }
    },
};

export const uvVenvTool = {
    name: 'uv_venv',
    description: 'Manage the uv virtual environment',
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: { type: 'string', description: 'Path to the project directory' },
            timeout: { type: 'number', description: 'Timeout in milliseconds (default: 60000)', default: 60000 }
        },
        required: ['projectPath']
    },
    async run(args: any) {
        const parseResult = uvVenvSchema.safeParse(args);
        if (!parseResult.success) {
            return { success: false, errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')}- ${e.message}`), warnings: [], output: '' };
        }
        const { projectPath, timeout } = parseResult.data;
        if (!Config.getInstance().isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'], warnings: [], output: '' };
        }
        try {
            const command = `uv venv`;
            const result = await runCommand(command, { cwd: projectPath, timeout });
            return { success: result.exitCode === 0, errors: result.stderr ? [result.stderr] : [], warnings: [], output: result.stdout };
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)], warnings: [], output: '' };
        }
    },
};
