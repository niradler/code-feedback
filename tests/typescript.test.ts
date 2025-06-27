import { describe, it, expect } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerTools } from '../src/tools';
import { join } from 'path';

// Dummy server mock for testing
class DummyServer {
    tools: any[] = [];
    registerTool(tool: any) { this.tools.push(tool); }
}

describe('TypeScript Tool', () => {
    it('should register the validate_typescript_file tool', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'validate_typescript_file');
        expect(tool).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.run).toBe('function');
    });

    it('should validate input schema for required and optional fields', () => {
        const server = new DummyServer();
        registerTools(server);
        const tool = server.tools.find(t => t.name === 'validate_typescript_file');
        expect(() => tool.inputSchema.parse({ filePath: 'foo.ts' })).not.toThrow();
        expect(() => tool.inputSchema.parse({ filePath: 'foo.ts', tsConfigPath: 'tsconfig.json' })).not.toThrow();
        expect(() => tool.inputSchema.parse({})).toThrow();
    });

    // More tests (integration, error cases) can be added here
}); 