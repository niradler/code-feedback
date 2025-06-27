#!/usr/bin/env node

/**
 * Test MCP server with proper initialization sequence
 */

import { spawn } from 'child_process';

async function testMCPProtocol() {
  console.log('🧪 Testing MCP Protocol Implementation...');
  
  try {
    const testDir = process.cwd();
    
    // Start the MCP server
    const serverProcess = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, MCP_ALLOWED_PATHS: testDir }
    });
    
    let responses = [];
    let errorOutput = '';
    
    serverProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\\n').filter(line => line.trim());
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          responses.push(response);
          console.log('📤 Received response:', JSON.stringify(response, null, 2));
        } catch (e) {
          // Non-JSON output
          console.log('📤 Non-JSON output:', line);
        }
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.log('📡 Server log:', data.toString().trim());
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 1: Initialize (this is typically the first thing an MCP client does)
    console.log('\\n🔄 Step 1: Sending initialize request...');
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: {
            listChanged: true
          },
          sampling: {}
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    };
    
    serverProcess.stdin.write(JSON.stringify(initRequest) + '\\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: List tools
    console.log('\\n🔄 Step 2: Sending tools/list request...');
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };
    
    serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Call a tool
    console.log('\\n🔄 Step 3: Sending tools/call request...');
    const callToolRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'validate_javascript_file',
        arguments: {
          filePath: './package.json'  // This will fail but should give us a proper error
        }
      }
    };
    
    serverProcess.stdin.write(JSON.stringify(callToolRequest) + '\\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clean up
    serverProcess.kill('SIGTERM');
    
    console.log('\\n📊 Test Results:');
    console.log('='.repeat(60));
    console.log(`Total responses received: ${responses.length}`);
    
    responses.forEach((response, index) => {
      console.log(`\\nResponse ${index + 1}:`);
      console.log(JSON.stringify(response, null, 2));
    });
    
    console.log('\\n' + '='.repeat(60));
    
    // Analyze results
    if (responses.length === 0) {
      console.log('❌ No responses received - server may not be handling JSON-RPC properly');
    } else {
      console.log('✅ Server is responding to JSON-RPC requests');
      
      const toolsListResponse = responses.find(r => r.id === 2);
      if (toolsListResponse && toolsListResponse.result && toolsListResponse.result.tools) {
        console.log(`✅ tools/list works - found ${toolsListResponse.result.tools.length} tools`);
      } else {
        console.log('❌ tools/list response not found or malformed');
      }
      
      const toolCallResponse = responses.find(r => r.id === 3);
      if (toolCallResponse) {
        if (toolCallResponse.error) {
          console.log('✅ tools/call error handling works');
        } else if (toolCallResponse.result) {
          console.log('✅ tools/call execution works');
        }
      } else {
        console.log('❌ tools/call response not found');
      }
    }
    
    console.log('\\n🎉 Protocol test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMCPProtocol().catch(console.error);
