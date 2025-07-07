import { describe, it, expect } from 'vitest';
import { registerTools } from '../src/tools';

class DummyServer {
    tools: any[] = [];
    registerTool(tool: any) { this.tools.push(tool); }
}

describe('Python Tool', () => {
    it('should register the python tool', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'python');
        expect(tool).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.run).toBe('function');
    });

    it('should have a valid input schema object', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'python');
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        expect(tool.inputSchema.properties.filePath).toBeDefined();
    });
}); 