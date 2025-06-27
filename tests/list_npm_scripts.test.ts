import { describe, it, expect } from 'vitest';
import { registerTools } from '../src/tools';

class DummyServer {
    tools: any[] = [];
    registerTool(tool: any) { this.tools.push(tool); }
}

describe('List NPM Scripts Tool', () => {
    it('should register the list_npm_scripts tool', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'list_npm_scripts');
        expect(tool).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.run).toBe('function');
    });
}); 