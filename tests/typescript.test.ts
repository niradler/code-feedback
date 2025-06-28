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
        const parse = typeof tool.inputSchema.parse === 'function' ? tool.inputSchema.parse.bind(tool.inputSchema) : null;
        if (parse) {
            expect(() => parse({ filePath: 'foo.ts' })).not.toThrow();
            expect(() => parse({ filePath: 'foo.ts', tsConfigPath: 'tsconfig.json' })).not.toThrow();
            expect(() => parse({})).toThrow();
        } else {
            expect(tool.inputSchema).toBeDefined();
        }
    });

    // More tests (integration, error cases) can be added here
}); 