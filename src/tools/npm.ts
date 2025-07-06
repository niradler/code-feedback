import { z } from 'zod';
import { runCommand } from '../utils/command.js';
import Config from '../config/index.js';
import { join } from 'path';
import { promises as fs } from 'fs';

const inputSchema = z.object({
    projectPath: z.string(),
    scriptName: z.string(),
    timeout: z.number().default(60000),
});

const listScriptsSchema = z.object({
    projectPath: z.string(),
});

const installSchema = z.object({
    projectPath: z.string(),
    packages: z.array(z.string()),
    isDev: z.boolean().default(false),
    timeout: z.number().default(120000),
});

const uninstallSchema = z.object({
    projectPath: z.string(),
    packages: z.array(z.string()),
    timeout: z.number().default(60000),
});

const auditSchema = z.object({
    projectPath: z.string(),
    timeout: z.number().default(60000),
});

// Utility to detect package manager based on lock files
async function detectPackageManager(projectPath: string): Promise<'pnpm' | 'yarn' | 'npm'> {
    const pnpmLock = join(projectPath, 'pnpm-lock.yaml');
    const yarnLock = join(projectPath, 'yarn.lock');
    const npmLock = join(projectPath, 'package-lock.json');
    if (await fs.stat(pnpmLock).then(() => true, () => false)) return 'pnpm';
    if (await fs.stat(yarnLock).then(() => true, () => false)) return 'yarn';
    if (await fs.stat(npmLock).then(() => true, () => false)) return 'npm';
    return 'npm';
}

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

        if (!Config.getInstance().isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'] as string[], warnings: [] as string[], output: '' };
        }
        try {
            const packageJsonPath = join(projectPath, 'package.json');
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            if (!packageJson.scripts || !packageJson.scripts[scriptName]) {
                return { success: false, errors: [`Script '${scriptName}' not found in package.json`] as string[], warnings: [] as string[], output: '' };
            }
            const pm = await detectPackageManager(projectPath);
            let command;
            if (pm === 'yarn') {
                command = `yarn ${scriptName}`;
            } else if (pm === 'pnpm') {
                command = `pnpm run ${scriptName}`;
            } else {
                command = `npm run ${scriptName}`;
            }
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

        if (!Config.getInstance().isPathAllowed(projectPath)) {
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

export const installNpmDepsTool = {
    name: 'install_npm_deps',
    description: 'Install npm dependencies (packages) in a project',
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: {
                type: 'string',
                description: 'Path to the project directory containing package.json'
            },
            packages: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of package names to install'
            },
            isDev: {
                type: 'boolean',
                description: 'Whether to install as dev dependencies (default: false)',
                default: false
            },
            timeout: {
                type: 'number',
                description: 'Timeout in milliseconds (default: 120000)',
                default: 120000
            }
        },
        required: ['projectPath', 'packages']
    },
    async run(args: any) {
        const parseResult = installSchema.safeParse(args);
        if (!parseResult.success) {
            return {
                success: false,
                errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')} - ${e.message}`),
                warnings: [],
                output: ''
            };
        }

        const { projectPath, packages, isDev, timeout } = parseResult.data;

        if (!Config.getInstance().isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'] as string[], warnings: [] as string[], output: '' };
        }

        try {
            const pm = await detectPackageManager(projectPath);
            let command;
            if (pm === 'yarn') {
                command = `yarn add${isDev ? ' --dev' : ''} ${packages.join(' ')}`;
            } else if (pm === 'pnpm') {
                command = `pnpm add${isDev ? ' --save-dev' : ''} ${packages.join(' ')}`;
            } else {
                const flag = isDev ? '--save-dev' : '--save';
                command = `npm install ${flag} ${packages.join(' ')}`;
            }
            const result = await runCommand(command, { cwd: projectPath, timeout });

            return {
                success: result.exitCode === 0,
                errors: result.stderr ? [result.stderr] as string[] : [],
                warnings: [] as string[],
                output: result.stdout,
            };
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)] as string[], warnings: [] as string[], output: '' };
        }
    },
};

export const uninstallNpmDepsTool = {
    name: 'uninstall_npm_deps',
    description: 'Uninstall npm dependencies (packages) from a project',
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: {
                type: 'string',
                description: 'Path to the project directory containing package.json'
            },
            packages: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of package names to uninstall'
            },
            timeout: {
                type: 'number',
                description: 'Timeout in milliseconds (default: 60000)',
                default: 60000
            }
        },
        required: ['projectPath', 'packages']
    },
    async run(args: any) {
        const parseResult = uninstallSchema.safeParse(args);
        if (!parseResult.success) {
            return {
                success: false,
                errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')} - ${e.message}`),
                warnings: [],
                output: ''
            };
        }

        const { projectPath, packages, timeout } = parseResult.data;

        if (!Config.getInstance().isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'] as string[], warnings: [] as string[], output: '' };
        }

        try {
            const pm = await detectPackageManager(projectPath);
            let command;
            if (pm === 'yarn') {
                command = `yarn remove ${packages.join(' ')}`;
            } else if (pm === 'pnpm') {
                command = `pnpm remove ${packages.join(' ')}`;
            } else {
                command = `npm uninstall ${packages.join(' ')}`;
            }
            const result = await runCommand(command, { cwd: projectPath, timeout });

            return {
                success: result.exitCode === 0,
                errors: result.stderr ? [result.stderr] as string[] : [],
                warnings: [] as string[],
                output: result.stdout,
            };
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)] as string[], warnings: [] as string[], output: '' };
        }
    },
};

export const auditNpmDepsTool = {
    name: 'audit_npm_deps',
    description: 'Audit npm dependencies for vulnerabilities in a project',
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: {
                type: 'string',
                description: 'Path to the project directory containing package.json'
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
        const parseResult = auditSchema.safeParse(args);
        if (!parseResult.success) {
            return {
                success: false,
                errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')} - ${e.message}`),
                warnings: [],
                output: ''
            };
        }

        const { projectPath, timeout } = parseResult.data;

        if (!Config.getInstance().isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'] as string[], warnings: [] as string[], output: '' };
        }

        try {
            const pm = await detectPackageManager(projectPath);
            let command;
            if (pm === 'yarn') {
                command = 'yarn audit --json';
            } else if (pm === 'pnpm') {
                command = 'pnpm audit --json';
            } else {
                command = 'npm audit --json';
            }
            const result = await runCommand(command, { cwd: projectPath, timeout });
            return {
                success: result.exitCode === 0,
                errors: result.stderr ? [result.stderr] as string[] : [],
                warnings: [],
                output: result.stdout,
            };
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)] as string[], warnings: [] as string[], output: '' };
        }
    },
}; 