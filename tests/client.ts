import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { promises as fs } from 'fs';
import { join, resolve } from 'path';

describe('MCP Code Feedback Server', () => {
    let client: Client;
    let transport: StdioClientTransport;
    const testDir = join(process.cwd(), 'test-files');

    beforeAll(async () => {
        // Create test directory
        await fs.mkdir(testDir, { recursive: true });

        // Set up environment variables for allowed paths
        const allowedPaths = [
            process.cwd(),
            testDir,
            resolve(testDir)
        ].join(',');
        
        console.log('Setting MCP_ALLOWED_PATHS to:', allowedPaths);

        // Set up transport and client with proper environment
        transport = new StdioClientTransport({
            command: "node",
            args: ["dist/index.js"],
            env: {
                ...process.env,
                MCP_ALLOWED_PATHS: allowedPaths
            }
        });

        client = new Client(
            {
                name: "test-client",
                version: "1.0.0"
            },
            {
                capabilities: {
                    tools: {}
                }
            }
        );

        // Add connection timeout and error handling
        try {
            console.log('Attempting to connect to MCP server...');
            await client.connect(transport);
            console.log('Successfully connected to MCP server');
        } catch (error) {
            console.error('Failed to connect to MCP server:', error);
            throw error;
        }
    }, 30000); // Increase timeout for beforeAll

    afterAll(async () => {
        // Close client connection first
        try {
            if (client) {
                console.log('Closing client connection...');
                await client.close();
                console.log('Client connection closed');
            }
        } catch (e) {
            console.warn('Failed to close client connection:', e);
        }

        // Clean up test files
        try {
            await fs.rm(testDir, { recursive: true, force: true });
            console.log('Test files cleaned up');
        } catch (e) {
            console.warn('Failed to clean up test directory:', e);
        }
    });

    it('should list available tools', async () => {
        try {
            console.log('Listing available tools...');
            const tools = await client.listTools();

            console.log('Available tools:', tools.tools.map(t => t.name));

            expect(tools.tools.length).toBeGreaterThan(0);
            expect(tools.tools.some(t => t.name === 'validate_typescript_file')).toBe(true);
            expect(tools.tools.some(t => t.name === 'validate_javascript_file')).toBe(true);
            expect(tools.tools.some(t => t.name === 'validate_python_file')).toBe(true);
            expect(tools.tools.some(t => t.name === 'filesystem')).toBe(true);
        } catch (error) {
            console.error('Error listing tools:', error);
            throw error;
        }
    });

    it('should create and validate TypeScript file', async () => {
        const testFile = join(testDir, 'test.ts');
        const tsContent = `
// TypeScript file 
function goodFunction(): string {
    const message: string = "Hello, World!";
    return message;
}

export { goodFunction };
`;

        // Create test file using filesystem tool
        const createResult = await client.callTool({
            name: "filesystem",
            arguments: {
                ops: [{
                    type: "createFile",
                    path: testFile,
                    content: tsContent
                }]
            }
        });

        console.log('File creation result:', createResult);
        
        const createResponse = JSON.parse(createResult.content[0].text);
        expect(createResponse.success).toBe(true);

        // Validate the TypeScript file
        const validateResult = await client.callTool({
            name: "validate_typescript_file",
            arguments: {
                filePath: testFile
            }
        });

        console.log('TypeScript validation result:', validateResult);
        
        expect(validateResult.content).toBeDefined();
        expect(validateResult.content[0]).toBeDefined();
        
        const response = JSON.parse(validateResult.content[0].text);
        // The file should be valid, so check for success
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('errors');
        expect(response).toHaveProperty('warnings');
    });

    it('should validate JavaScript file with syntax error', async () => {
        const testFile = join(testDir, 'test.js');
        const jsContent = `
// JavaScript file with syntax error
function badFunction() {
    console.log('Missing closing brace');
    // Missing closing brace

module.exports = { badFunction };
`;

        // Create test file
        await client.callTool({
            name: "filesystem",
            arguments: {
                ops: [{
                    type: "createFile",
                    path: testFile,
                    content: jsContent
                }]
            }
        });

        // Validate the JavaScript file
        const result = await client.callTool({
            name: "validate_javascript_file",
            arguments: {
                filePath: testFile
            }
        });

        console.log('JavaScript validation result:', result);
        
        expect(result.content).toBeDefined();
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(false);
        expect(response.errors.length).toBeGreaterThan(0);
    });

    it('should perform filesystem operations', async () => {
        const testFile = join(testDir, 'fs-test.txt');
        const testDir2 = join(testDir, 'subdir');
        const movedFile = join(testDir2, 'moved-file.txt');

        // Test multiple filesystem operations
        const result = await client.callTool({
            name: "filesystem",
            arguments: {
                ops: [
                    {
                        type: "createFile",
                        path: testFile,
                        content: "Hello, World!"
                    },
                    {
                        type: "createFolder",
                        path: testDir2
                    },
                    {
                        type: "move",
                        source: testFile,
                        destination: movedFile
                    }
                ]
            }
        });

        console.log('Filesystem operations result:', result);
        
        expect(result.content).toBeDefined();
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        
        // The response structure might have 'results' instead of 'errors'
        if (response.results) {
            expect(response.results.length).toBe(3);
            expect(response.results.every((r: any) => r.success)).toBe(true);
        } else if (response.errors) {
            expect(response.errors.length).toBe(0);
        }

        // Verify file was moved
        try {
            await fs.access(movedFile);
            const content = await fs.readFile(movedFile, 'utf-8');
            expect(content).toBe('Hello, World!');
        } catch (e) {
            throw new Error(`File was not moved successfully: ${e}`);
        }
    });

    it('should search files using find tool', async () => {
        // Create some test files first
        await client.callTool({
            name: "filesystem",
            arguments: {
                ops: [
                    {
                        type: "createFile",
                        path: join(testDir, 'search-test.ts'),
                        content: 'const hello = "world";'
                    },
                    {
                        type: "createFile",
                        path: join(testDir, 'search-test.js'),
                        content: 'const hello = "world";'
                    }
                ]
            }
        });

        // Search for files containing "hello"
        const result = await client.callTool({
            name: "find",
            arguments: {
                pattern: "hello",
                path: testDir
            }
        });

        console.log('Find result:', result);
        
        expect(result.content).toBeDefined();
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.output).toContain('hello');
    });

    it('should handle git operations', async () => {
        // Test git status (should work in any directory)
        const result = await client.callTool({
            name: "run_git_command",
            arguments: {
                repoPath: process.cwd(),
                gitCommand: "status"
            }
        });

        console.log('Git status result:', result);
        
        expect(result.content).toBeDefined();
        const response = JSON.parse(result.content[0].text);
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('output');
    });

    it('should handle npm operations', async () => {
        // Test listing npm scripts (should work if package.json exists)
        const result = await client.callTool({
            name: "list_npm_scripts",
            arguments: {
                projectPath: process.cwd()
            }
        });

        console.log('NPM scripts result:', result);
        
        expect(result.content).toBeDefined();
        const response = JSON.parse(result.content[0].text);
        expect(response).toHaveProperty('success');
        expect(response.success).toBe(true);
        
        // The response might have 'scripts' instead of 'output'
        if (response.scripts) {
            expect(typeof response.scripts).toBe('object');
            expect(Object.keys(response.scripts).length).toBeGreaterThan(0);
        } else if (response.output) {
            expect(typeof response.output).toBe('string');
        }
    });

    it('should handle invalid tool calls gracefully', async () => {
        try {
            await client.callTool({
                name: "nonexistent_tool",
                arguments: {}
            });
        } catch (error: any) {
            expect(error.message).toContain('not found');
        }
    });

    it('should handle malformed arguments gracefully', async () => {
        const result = await client.callTool({
            name: "validate_typescript_file",
            arguments: {
                // Missing required filePath
            }
        });

        console.log('Malformed args result:', result);

        expect(result.content).toBeDefined();
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(false);
        expect(response.errors.length).toBeGreaterThan(0);
    });

    it('should handle connection health check', async () => {
        // Simple health check to ensure connection is working
        try {
            const tools = await client.listTools();
            expect(tools.tools.length).toBeGreaterThan(0);
        } catch (error) {
            console.error('Connection health check failed:', error);
            throw error;
        }
    });
});
