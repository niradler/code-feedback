#!/usr/bin/env node

// Simple test script to verify MCP server functionality
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function testMCPServer() {
  console.log('Testing Code Feedback MCP Server...\n');
  
  // Start the MCP server
  const serverProcess = spawn('node', [join(__dirname, '../dist/index.js')], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Test message to list tools
  const listToolsMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  console.log('Sending list tools request...');
  serverProcess.stdin.write(JSON.stringify(listToolsMessage) + '\n');

  let responseData = '';
  
  serverProcess.stdout.on('data', (data) => {
    responseData += data.toString();
    
    // Try to parse response
    try {
      const lines = responseData.split('\n').filter(line => line.trim());
      for (const line of lines) {
        const response = JSON.parse(line);
        if (response.id === 1) {
          console.log('✅ MCP Server responded successfully!');
          console.log('Available tools:');
          response.result.tools.forEach((tool, index) => {
            console.log(`  ${index + 1}. ${tool.name} - ${tool.description}`);
          });
          
          // Test a simple tool call
          testToolCall(serverProcess);
          return;
        }
      }
    } catch (error) {
      // Continue collecting data
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.log('Server stderr:', data.toString());
  });

  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start MCP server:', error);
  });

  // Cleanup after 10 seconds
  setTimeout(() => {
    serverProcess.kill();
    console.log('\n✅ Test completed!');
  }, 10000);
}

function testToolCall(serverProcess) {
  console.log('\nTesting analyze_code_file tool...');
  
  const analyzeMessage = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'analyze_code_file',
      arguments: {
        filePath: join(__dirname, '../examples/example-good.js')
      }
    }
  };

  serverProcess.stdin.write(JSON.stringify(analyzeMessage) + '\n');
  
  let toolResponseData = '';
  const originalHandler = serverProcess.stdout.listeners('data')[0];
  
  serverProcess.stdout.removeAllListeners('data');
  serverProcess.stdout.on('data', (data) => {
    toolResponseData += data.toString();
    
    try {
      const lines = toolResponseData.split('\n').filter(line => line.trim());
      for (const line of lines) {
        const response = JSON.parse(line);
        if (response.id === 2) {
          console.log('✅ Tool call successful!');
          console.log('Analysis result preview:', JSON.stringify(response.result, null, 2).substring(0, 200) + '...');
          return;
        }
      }
    } catch (error) {
      // Continue collecting data
    }
  });
}

// Check if server is built
import { access } from 'fs/promises';

async function main() {
  try {
    await access(join(__dirname, '../dist/index.js'));
    testMCPServer();
  } catch (error) {
    console.log('❌ Server not built. Please run "npm run build" first.');
    console.log('Building now...');
    
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: join(__dirname, '..'),
      stdio: 'inherit'
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Build successful! Starting test...\n');
        testMCPServer();
      } else {
        console.log('❌ Build failed');
      }
    });
  }
}

main();
