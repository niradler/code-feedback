#!/usr/bin/env node

/**
 * Test script to verify MCP server functionality
 */

import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const testDir = process.cwd();
const testFile = join(testDir, 'test-example.ts');

// Create a test TypeScript file
const testTypeScriptCode = `
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: "John",
  age: 30
};

console.log(user.name);
`;

async function testMCPServer() {
  console.log('🧪 Testing MCP Server...');
  
  try {
    // Create test file
    writeFileSync(testFile, testTypeScriptCode);
    console.log('✅ Created test TypeScript file');
    
    // Set environment variable for allowed paths
    process.env.MCP_ALLOWED_PATHS = testDir;
    
    // Start the MCP server
    const serverProcess = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, MCP_ALLOWED_PATHS: testDir }
    });
    
    let output = '';
    let errorOutput = '';
    
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    serverProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.log('📡 Server log:', data.toString().trim());
    });
    
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 1: List tools
    console.log('\\n🔍 Test 1: Listing available tools...');
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };
    
    serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\\n');
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Call TypeScript validation tool
    console.log('\\n🔍 Test 2: Calling TypeScript validation tool...');
    const callToolRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'validate_typescript_file',
        arguments: {
          filePath: testFile
        }
      }
    };
    
    serverProcess.stdin.write(JSON.stringify(callToolRequest) + '\\n');
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Clean up
    serverProcess.kill('SIGTERM');
    
    console.log('\\n📊 Test Results:');
    console.log('Server output:', output);
    
    if (errorOutput.includes('Code Feedback MCP Server started successfully')) {
      console.log('✅ Server started successfully');
    } else {
      console.log('❌ Server startup failed');
    }
    
    if (errorOutput.includes('Available tools:')) {
      console.log('✅ Tools loaded successfully');
    } else {
      console.log('❌ Tools loading failed');
    }
    
    console.log('\\n🎉 MCP Server test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up test file
    if (existsSync(testFile)) {
      unlinkSync(testFile);
      console.log('🧹 Cleaned up test file');
    }
  }
}

// Run the test
testMCPServer().catch(console.error);
