import { describe, it, expect, beforeAll } from 'vitest';
import { makeTool, listMakeCommandsTool } from '../src/tools/make.js';
import { join } from 'path';
import { promises as fs } from 'fs';

describe('Make Tools', () => {
    const testProjectPath = join(process.cwd(), 'examples');

    beforeAll(async () => {
        try {
            await fs.access(join(testProjectPath, 'Makefile'));
        } catch {
            throw new Error('Makefile not found in examples directory');
        }
    });

    describe('listMakeCommandsTool', () => {
        it('should list available make targets', async () => {
            const result = await listMakeCommandsTool.run({
                projectPath: testProjectPath
            });

            expect(result.success).toBe(true);
            expect(result.errors).toEqual([]);
            expect(result.output).toContain('Available make targets:');
        });

        it('should handle invalid project path', async () => {
            const result = await listMakeCommandsTool.run({
                projectPath: '/invalid/path'
            });

            expect(result.success).toBe(false);
            expect(result.errors).toContain('Path not allowed');
        });

        it('should handle missing Makefile', async () => {
            const result = await listMakeCommandsTool.run({
                projectPath: process.cwd()
            });

            expect(result.success).toBe(false);
        });
    });

    describe('makeTool', () => {
        it('should run make command successfully', async () => {
            const result = await makeTool.run({
                projectPath: testProjectPath,
                target: 'help'
            });

            expect(result.success).toBe(true);
        });

        it('should handle invalid target', async () => {
            const result = await makeTool.run({
                projectPath: testProjectPath,
                target: 'nonexistent-target'
            });

            expect(result.success).toBe(false);
        });

        it('should handle invalid project path', async () => {
            const result = await makeTool.run({
                projectPath: '/invalid/path'
            });

            expect(result.success).toBe(false);
            expect(result.errors).toContain('Path not allowed');
        });
    });
}); 