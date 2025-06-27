import { describe, it, expect } from 'vitest';
import { registerTools } from '../src/tools';

class DummyServer {
    tools: any[] = [];
    registerTool(tool: any) { this.tools.push(tool); }
}

describe('Make Tool', () => {
    it('should register the run_make_command tool', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'run_make_command');
        expect(tool).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.run).toBe('function');
    });

    it('should validate input schema for required and optional fields', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'run_make_command');
        expect(() => tool.inputSchema.parse({ projectPath: 'foo' })).not.toThrow();
        expect(() => tool.inputSchema.parse({ projectPath: 'foo', target: 'build', makeArgs: ['-j4'], timeout: 10000 })).not.toThrow();
        expect(() => tool.inputSchema.parse({})).toThrow();
    });
}); 