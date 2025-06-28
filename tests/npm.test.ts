import { describe, it, expect, beforeAll } from 'vitest';
import { registerTools, listNpmScriptsTool } from '../src/tools';
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

    it('should register the run_npm_script tool', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'run_npm_script');
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
}); 