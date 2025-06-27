import { describe, it, expect } from 'vitest';
import { registerTools } from '../src/tools';

class DummyServer {
    tools: any[] = [];
    registerTool(tool: any) { this.tools.push(tool); }
}

describe('Go Tool', () => {
    it('should register the validate_go_file tool', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'validate_go_file');
        expect(tool).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.run).toBe('function');
    });

    it('should validate input schema for required and optional fields', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'validate_go_file');
        expect(() => tool.inputSchema.parse({ filePath: 'foo.go' })).not.toThrow();
        expect(() => tool.inputSchema.parse({ filePath: 'foo.go', checkFormat: false, runTests: true })).not.toThrow();
        expect(() => tool.inputSchema.parse({})).toThrow();
    });
}); 