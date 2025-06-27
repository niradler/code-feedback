#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { allTools } from './tools/index.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';

/**
 * Create the MCP server
 */
const server = new Server(
  {
    name: 'code-feedback-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

registerResources(server);
registerPrompts(server);

/**
 * Error handler
 */
server.onerror = (error) => {
  console.error('[MCP Error]', error);
};

/**
 * Initialize handler
 */
server.setRequestHandler(InitializeRequestSchema, async () => {
  console.error('[MCP] Received initialize request');

  return {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
    serverInfo: {
      name: 'code-feedback-mcp',
      version: '1.0.0',
    },
  };
});

/**
 * List tools handler
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error(`[MCP] Listing ${allTools.length} available tools`);

  return {
    tools: allTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

/**
 * Call tool handler
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  console.error(`[MCP] Tool call: ${name}`);

  // Find the tool
  const tool = allTools.find(t => t.name === name);
  if (!tool) {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Tool "${name}" not found`
    );
  }

  try {
    // Execute the tool
    const result = await tool.run(args || {});

    // Return the result in MCP format
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${errorMessage}`
    );
  }
});

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
  console.error('[MCP] Shutting down...');
  await server.close();
  process.exit(0);
});

/**
 * Start the server
 */
async function run() {
  try {
    console.error('[MCP] Starting Code Feedback MCP Server v1.0.0...');

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('[MCP] Server started successfully');
    console.error(`[MCP] Available tools: ${allTools.map(t => t.name).join(', ')}`);
    console.error('[MCP] Ready to receive requests');

  } catch (error) {
    console.error('[MCP] Failed to start server:', error);
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});
