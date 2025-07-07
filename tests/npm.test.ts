import { describe, it, expect, beforeAll } from 'vitest';
import { registerTools, listNpmScriptsTool, npmTool, checkNpmDependencyTool } from '../src/tools';
import { join } from 'path';
import { promises as fs } from 'fs';
import Config from '../src/config/index.js';
import { runCommand } from '../src/utils/command.js';

class DummyServer {
    tools: any[] = [];
    registerTool(tool: any) { this.tools.push(tool); }
}

describe('NPM Tools', () => {
    const testProjectPath = process.cwd();

    beforeAll(async () => {
        Config.getInstance().addAllowedPaths([testProjectPath]);
        try {
            await fs.access(join(testProjectPath, 'package.json'));
        } catch {
            throw new Error('package.json not found in project root');
        }
    });

    it('should register the npm tool', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'npm');
        expect(tool).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.run).toBe('function');
    });

    it('should register the list_npm_scripts tool', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'list_npm_scripts');
        expect(tool).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.run).toBe('function');
    });

    it('should register the check_npm_dependency tool', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'check_npm_dependency');
        expect(tool).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.run).toBe('function');
    });

    describe('listNpmScriptsTool', () => {
        it('should list all npm scripts and match package.json', async () => {
            const result = await listNpmScriptsTool.run({ projectPath: testProjectPath });
            expect(result.success).toBe(true);
            expect(result.errors).toBeUndefined();
            expect(result.scripts).toBeDefined();

            const packageJsonPath = join(testProjectPath, 'package.json');
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            expect(result.scripts).toEqual(packageJson.scripts || {});
        });

        it('should handle invalid project path', async () => {
            const result = await listNpmScriptsTool.run({ projectPath: '/invalid/path' });
            expect(result.success).toBe(false);
            expect(result.errors).toContain('Path not allowed');
        });

        it('should match scripts listed by npm run', async () => {
            const toolResult = await listNpmScriptsTool.run({ projectPath: testProjectPath });
            expect(toolResult.success).toBe(true);
            const toolScripts = toolResult.scripts;

            const { stdout } = await runCommand('npm run', { cwd: testProjectPath });
            // Extract script names from npm run output
            const scriptNames = Object.keys(toolScripts);
            for (const name of scriptNames) {
                expect(stdout).toContain(name);
            }
        });
    });

    describe('npmTool', () => {
        it('should handle missing script gracefully', async () => {
            const result = await npmTool.run({ projectPath: testProjectPath, command: 'run', scriptName: 'not_a_real_script' });
            expect(result.success).toBe(false);
            expect(result.errors[0]).toMatch(/not found/);
        });
        it('should handle audit command', async () => {
            const result = await npmTool.run({ projectPath: testProjectPath, command: 'audit' });
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.output).toBe('string');
        });
    });

    describe('checkNpmDependencyTool', () => {
        it('should check for a known dependency', async () => {
            const packageJsonPath = join(testProjectPath, 'package.json');
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            const depName = Object.keys(packageJson.dependencies || {})[0] || Object.keys(packageJson.devDependencies || {})[0];
            if (depName) {
                const result = await checkNpmDependencyTool.run({ projectPath: testProjectPath, packageName: depName });
                expect(result.success).toBe(true);
                expect(result.found).toBe(true);
                expect(['dependency', 'devDependency']).toContain(result.type);
            }
        });
        it('should return not found for a non-existent dependency', async () => {
            const result = await checkNpmDependencyTool.run({ projectPath: testProjectPath, packageName: 'this-package-should-not-exist' });
            expect(result.success).toBe(true);
            expect(result.found).toBe(false);
        });
    });
}); 