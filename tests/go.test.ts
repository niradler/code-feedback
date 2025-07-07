import { describe, it, expect } from 'vitest';
import { registerTools } from '../src/tools';

class DummyServer {
    tools: any[] = [];
    registerTool(tool: any) { this.tools.push(tool); }
}

describe('Go Tool', () => {
    it('should register the go tool', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'go');
        expect(tool).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.run).toBe('function');
    });

    it('should validate input schema for required and optional fields', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'go');
        // The inputSchema is a JSON schema, not a Zod schema, so we can't call parse directly.
        // Instead, check the structure of the schema.
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.properties.filePath).toBeDefined();
        expect(tool.inputSchema.properties.actions).toBeDefined();
        expect(tool.inputSchema.properties.command).toBeDefined();
        expect(tool.inputSchema.required).toContain('filePath');
        // Check that actions is an array of enums
        expect(tool.inputSchema.properties.actions.items.enum).toEqual([
            'build', 'fmt', 'mod', 'vet', 'test'
        ]);
    });
}); 