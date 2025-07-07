import { z } from 'zod';
import { runCommand } from '../utils/command.js';
import Config from '../config/index.js';
import { join } from 'path';
import { promises as fs } from 'fs';
import { zodToJsonSchema } from 'zod-to-json-schema';

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

const npmToolSchema = z.object({
    projectPath: z.string(),
    command: z.string().describe('npm command to run (e.g. install, uninstall, run, test, audit, etc.)'),
    scriptName: z.string().optional().describe('Script name for run/test commands'),
    packages: z.array(z.string()).optional().describe('Packages for install/uninstall'),
    isDev: z.boolean().optional().describe('Install as devDependency'),
    args: z.array(z.string()).optional().describe('Additional arguments for the command'),
    timeout: z.number().optional().default(120000),
});

export const npmTool = {
    name: 'npm',
    description:
        `Run any npm, pnpm, or yarn command in a project directory.\n\nUse cases:\n- Run scripts (test, build, lint, etc.)\n- Install or uninstall dependencies\n- Run audit, outdated, or custom commands\n- Pass arbitrary arguments to npm/pnpm/yarn\n\nEdge cases handled:\n- Auto-detects package manager (npm, pnpm, yarn)\n- Handles missing package.json, missing scripts, invalid paths\n- Returns clear errors for unsupported or malformed commands\n- Supports all major npm commands and script execution\n\nExamples:\n- { projectPath, command: 'run', scriptName: 'test' }\n- { projectPath, command: 'install', packages: ['lodash'], isDev: true }\n- { projectPath, command: 'audit' }\n- { projectPath, command: 'outdated' }\n- { projectPath, command: 'exec', args: ['echo', 'hello'] }`,
    inputSchema: zodToJsonSchema(npmToolSchema),
    async run(args: any) {
        const parseResult = npmToolSchema.safeParse(args);
        if (!parseResult.success) {
            return {
                success: false,
                errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')} - ${e.message}`),
                warnings: [],
                output: ''
            };
        }
        const { projectPath, command, scriptName, packages, isDev, args: extraArgs, timeout } = parseResult.data;
        if (!Config.getInstance().isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'], warnings: [], output: '' };
        }
        let pm: 'npm' | 'pnpm' | 'yarn';
        try {
            pm = await detectPackageManager(projectPath);
        } catch (e: any) {
            return { success: false, errors: ['Could not detect package manager: ' + (e.message || String(e))], warnings: [], output: '' };
        }
        let cmd = '';
        let finalArgs: string[] = [];
        try {
            // Validate package.json existence for most commands
            const packageJsonPath = join(projectPath, 'package.json');
            let packageJson: any = undefined;
            try {
                const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
                packageJson = JSON.parse(packageJsonContent);
            } catch {
                if ([
                    'install', 'uninstall', 'run', 'test', 'audit', 'outdated', 'exec', 'add', 'remove', 'update', 'upgrade', 'list', 'ls'
                ].includes(command)) {
                    return { success: false, errors: ['package.json not found in project'], warnings: [], output: '' };
                }
            }
            // Command translation logic
            switch (command) {
                case 'run':
                case 'test': {
                    const script = scriptName || (command === 'test' ? 'test' : undefined);
                    if (!script) return { success: false, errors: ['scriptName required for run/test'], warnings: [], output: '' };
                    if (!packageJson?.scripts || !packageJson.scripts[script]) {
                        return { success: false, errors: [`Script '${script}' not found in package.json`], warnings: [], output: '' };
                    }
                    if (pm === 'yarn') {
                        cmd = `yarn ${script}`;
                    } else if (pm === 'pnpm') {
                        cmd = `pnpm run ${script}`;
                    } else {
                        cmd = `npm run ${script}`;
                    }
                    if (extraArgs) finalArgs = finalArgs.concat(extraArgs);
                    break;
                }
                case 'install': {
                    if (!packages || !Array.isArray(packages) || packages.length === 0) {
                        // install all deps
                        if (pm === 'yarn') cmd = 'yarn install';
                        else if (pm === 'pnpm') cmd = 'pnpm install';
                        else cmd = 'npm install';
                    } else {
                        if (pm === 'yarn') cmd = `yarn add${isDev ? ' --dev' : ''}`;
                        else if (pm === 'pnpm') cmd = `pnpm add${isDev ? ' --save-dev' : ''}`;
                        else cmd = `npm install ${isDev ? '--save-dev' : '--save'}`;
                        finalArgs = finalArgs.concat(packages);
                    }
                    if (extraArgs) finalArgs = finalArgs.concat(extraArgs);
                    break;
                }
                case 'uninstall': {
                    if (!packages || !Array.isArray(packages) || packages.length === 0) {
                        return { success: false, errors: ['packages required for uninstall'], warnings: [], output: '' };
                    }
                    if (pm === 'yarn') cmd = 'yarn remove';
                    else if (pm === 'pnpm') cmd = 'pnpm remove';
                    else cmd = 'npm uninstall';
                    finalArgs = finalArgs.concat(packages);
                    if (extraArgs) finalArgs = finalArgs.concat(extraArgs);
                    break;
                }
                case 'audit': {
                    if (pm === 'yarn') cmd = 'yarn audit --json';
                    else if (pm === 'pnpm') cmd = 'pnpm audit --json';
                    else cmd = 'npm audit --json';
                    if (extraArgs) finalArgs = finalArgs.concat(extraArgs);
                    break;
                }
                case 'outdated': {
                    if (pm === 'yarn') cmd = 'yarn outdated';
                    else if (pm === 'pnpm') cmd = 'pnpm outdated';
                    else cmd = 'npm outdated';
                    if (extraArgs) finalArgs = finalArgs.concat(extraArgs);
                    break;
                }
                case 'exec': {
                    // npm exec, pnpm exec, yarn exec
                    if (!extraArgs || extraArgs.length === 0) {
                        return { success: false, errors: ['args required for exec'], warnings: [], output: '' };
                    }
                    if (pm === 'yarn') cmd = 'yarn exec';
                    else if (pm === 'pnpm') cmd = 'pnpm exec';
                    else cmd = 'npm exec';
                    finalArgs = finalArgs.concat(extraArgs);
                    break;
                }
                case 'add': {
                    if (!packages || !Array.isArray(packages) || packages.length === 0) {
                        return { success: false, errors: ['packages required for add'], warnings: [], output: '' };
                    }
                    if (pm === 'yarn') cmd = `yarn add${isDev ? ' --dev' : ''}`;
                    else if (pm === 'pnpm') cmd = `pnpm add${isDev ? ' --save-dev' : ''}`;
                    else cmd = `npm install ${isDev ? '--save-dev' : '--save'}`;
                    finalArgs = finalArgs.concat(packages);
                    if (extraArgs) finalArgs = finalArgs.concat(extraArgs);
                    break;
                }
                case 'remove': {
                    if (!packages || !Array.isArray(packages) || packages.length === 0) {
                        return { success: false, errors: ['packages required for remove'], warnings: [], output: '' };
                    }
                    if (pm === 'yarn') cmd = 'yarn remove';
                    else if (pm === 'pnpm') cmd = 'pnpm remove';
                    else cmd = 'npm uninstall';
                    finalArgs = finalArgs.concat(packages);
                    if (extraArgs) finalArgs = finalArgs.concat(extraArgs);
                    break;
                }
                case 'update':
                case 'upgrade': {
                    if (pm === 'yarn') cmd = 'yarn upgrade';
                    else if (pm === 'pnpm') cmd = 'pnpm update';
                    else cmd = 'npm update';
                    if (extraArgs) finalArgs = finalArgs.concat(extraArgs);
                    break;
                }
                case 'list':
                case 'ls': {
                    if (pm === 'yarn') cmd = 'yarn list';
                    else if (pm === 'pnpm') cmd = 'pnpm list';
                    else cmd = 'npm list';
                    if (extraArgs) finalArgs = finalArgs.concat(extraArgs);
                    break;
                }
                default: {
                    // Allow arbitrary commands, but prepend with pm
                    cmd = `${pm} ${command}`;
                    if (extraArgs) finalArgs = finalArgs.concat(extraArgs);
                }
            }
            const fullCmd = [cmd, ...finalArgs].join(' ');
            const result = await runCommand(fullCmd, { cwd: projectPath, timeout });
            return {
                success: result.exitCode === 0,
                errors: result.stderr ? [result.stderr] : [],
                warnings: [],
                output: result.stdout,
                details: { command: fullCmd, exitCode: result.exitCode, duration: result.duration }
            };
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)], warnings: [], output: '' };
        }
    },
};

export const listNpmScriptsTool = {
    name: 'list_npm_scripts',
    description: `List all available npm scripts in a project.\n\nUse cases:\n- Discover all scripts (test, build, lint, etc.) defined in package.json\n- Useful for UI pickers, automation, and validation\n\nEdge cases handled:\n- Handles missing package.json\n- Returns empty object if no scripts found`,
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
        const { projectPath } = args;
        if (!Config.getInstance().isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'], scripts: {} };
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

export const checkNpmDependencyTool = {
    name: 'check_npm_dependency',
    description: `Check if a package is present in dependencies or devDependencies in package.json.\n\nUse cases:\n- Validate if a package is installed\n- Check if a package is a devDependency\n- Useful for automation, install checks, and dependency management\n\nEdge cases handled:\n- Handles missing package.json\n- Returns clear info if package is not found`,
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: {
                type: 'string',
                description: 'Path to the project directory containing package.json'
            },
            packageName: {
                type: 'string',
                description: 'Name of the package to check'
            }
        },
        required: ['projectPath', 'packageName']
    },
    async run(args: any) {
        const { projectPath, packageName } = args;
        if (!Config.getInstance().isPathAllowed(projectPath)) {
            return { success: false, errors: ['Path not allowed'], found: false };
        }
        try {
            const packageJsonPath = join(projectPath, 'package.json');
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            const deps = packageJson.dependencies || {};
            const devDeps = packageJson.devDependencies || {};
            if (deps[packageName]) {
                return { success: true, found: true, type: 'dependency', version: deps[packageName] };
            } else if (devDeps[packageName]) {
                return { success: true, found: true, type: 'devDependency', version: devDeps[packageName] };
            } else {
                return { success: true, found: false };
            }
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)], found: false };
        }
    },
}; 