#!/usr/bin/env node

/**
 * Simple test to verify MCP server tools/list functionality
 */

import { spawn } from 'child_process';

async function testToolsList() {
  console.log('🧪 Testing MCP Server tools/list...');
  
  try {
    // Set environment variable for allowed paths
    const testDir = process.cwd();
    
    // Start the MCP server
    const serverProcess = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, MCP_ALLOWED_PATHS: testDir }
    });
    
    let output = '';
    let errorOutput = '';
    
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log('📤 Server stdout:', data.toString().trim());
    });
    
    serverProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.log('📡 Server stderr:', data.toString().trim());
    });
    
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test: List tools
    console.log('\\n🔍 Sending tools/list request...');
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };
    
    serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\\n');
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Clean up
    serverProcess.kill('SIGTERM');
    
    console.log('\\n📊 Test Results:');
    console.log('='.repeat(50));
    console.log('Server stderr output:');
    console.log(errorOutput);
    console.log('='.repeat(50));
    console.log('Server stdout output:');
    console.log(output);
    console.log('='.repeat(50));
    
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
    
    // Check for JSON responses in stdout
    const lines = output.split('\\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        if (response.result && response.result.tools) {
          console.log('✅ Received valid tools/list response');
          console.log(`📋 Found ${response.result.tools.length} tools:`);
          response.result.tools.forEach((tool, index) => {
            console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
          });
        }
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
    
    console.log('\\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testToolsList().catch(console.error);
