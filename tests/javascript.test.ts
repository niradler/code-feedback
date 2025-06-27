import { describe, it, expect } from 'vitest';
import { registerTools } from '../src/tools';

class DummyServer {
    tools: any[] = [];
    registerTool(tool: any) { this.tools.push(tool); }
}

describe('JavaScript Tool', () => {
    it('should register the validate_javascript_file tool', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'validate_javascript_file');
        expect(tool).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.run).toBe('function');
    });

    it('should validate input schema for required fields', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'validate_javascript_file');
        expect(() => tool.inputSchema.parse({ filePath: 'foo.js' })).not.toThrow();
        expect(() => tool.inputSchema.parse({})).toThrow();
    });
}); 