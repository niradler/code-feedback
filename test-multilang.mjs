#!/usr/bin/env node

// Comprehensive test script for multi-language MCP server
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { access } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MCPTester {
  constructor() {
    this.serverProcess = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async startServer() {
    console.log('🚀 Starting MCP Server...');

    this.serverProcess = spawn('node', ['./dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.serverProcess.stderr.on('data', (data) => {
      console.log('Server:', data.toString().trim());
    });

    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    return this.serverProcess;
  }

  async sendRequest(request) {
    return new Promise((resolve, reject) => {
      let responseData = '';

      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      const dataHandler = (data) => {
        responseData += data.toString();

        try {
          const lines = responseData.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              clearTimeout(timeout);
              this.serverProcess.stdout.removeListener('data', dataHandler);
              resolve(response);
              return;
            }
          }
        } catch (error) {
          // Continue collecting data
        }
      };

      this.serverProcess.stdout.on('data', dataHandler);
      this.serverProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`\n🧪 Running test: ${testName}`);
      await testFunction();
      console.log(`✅ PASSED: ${testName}`);
      this.testResults.passed++;
      this.testResults.tests.push({ name: testName, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ FAILED: ${testName} - ${error.message}`);
      this.testResults.failed++;
      this.testResults.tests.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  async testListTools() {
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };

    const response = await this.sendRequest(request);

    if (!response.result || !response.result.tools) {
      throw new Error('No tools returned');
    }

    const expectedTools = [
      'validate_typescript_file',
      'validate_javascript_file',
      'validate_python_file',
      'validate_go_file',
      'lint_file',
      'run_make_command',
      'run_gradle_command',
      'run_maven_command',
      'run_cargo_command',
      'run_dotnet_command',
      'run_npm_script',
      'run_custom_command',
      'analyze_code_file'
    ];

    const toolNames = response.result.tools.map(tool => tool.name);

    for (const expectedTool of expectedTools) {
      if (!toolNames.includes(expectedTool)) {
        throw new Error(`Missing tool: ${expectedTool}`);
      }
    }

    console.log(`   Found ${toolNames.length} tools`);
  }

  async testAnalyzeTypeScript() {
    const request = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'analyze_code_file',
        arguments: {
          filePath: join(__dirname, '../examples/example.ts')
        }
      }
    };

    const response = await this.sendRequest(request);

    if (!response.result?.content?.[0]?.text) {
      throw new Error('No analysis result');
    }

    const analysis = JSON.parse(response.result.content[0].text);

    if (analysis.fileInfo.language !== 'typescript') {
      throw new Error(`Expected typescript, got ${analysis.fileInfo.language}`);
    }

    console.log(`   Analyzed ${analysis.fileInfo.lines} lines of TypeScript`);
  }

  async testAnalyzePython() {
    const request = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'analyze_code_file',
        arguments: {
          filePath: join(__dirname, '../examples/example.py')
        }
      }
    };

    const response = await this.sendRequest(request);

    if (!response.result?.content?.[0]?.text) {
      throw new Error('No analysis result');
    }

    const analysis = JSON.parse(response.result.content[0].text);

    if (analysis.fileInfo.language !== 'python') {
      throw new Error(`Expected python, got ${analysis.fileInfo.language}`);
    }

    console.log(`   Analyzed ${analysis.fileInfo.lines} lines of Python`);
  }

  async testAnalyzeGo() {
    const request = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'analyze_code_file',
        arguments: {
          filePath: join(__dirname, '../examples/example.go')
        }
      }
    };

    const response = await this.sendRequest(request);

    if (!response.result?.content?.[0]?.text) {
      throw new Error('No analysis result');
    }

    const analysis = JSON.parse(response.result.content[0].text);

    if (analysis.fileInfo.language !== 'go') {
      throw new Error(`Expected go, got ${analysis.fileInfo.language}`);
    }

    console.log(`   Analyzed ${analysis.fileInfo.lines} lines of Go`);
  }

  async testAnalyzeRust() {
    const request = {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'analyze_code_file',
        arguments: {
          filePath: join(__dirname, '../examples/example.rs')
        }
      }
    };

    const response = await this.sendRequest(request);

    if (!response.result?.content?.[0]?.text) {
      throw new Error('No analysis result');
    }

    const analysis = JSON.parse(response.result.content[0].text);

    if (analysis.fileInfo.language !== 'rust') {
      throw new Error(`Expected rust, got ${analysis.fileInfo.language}`);
    }

    console.log(`   Analyzed ${analysis.fileInfo.lines} lines of Rust`);
  }

  async testAnalyzeJava() {
    const request = {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'analyze_code_file',
        arguments: {
          filePath: join(__dirname, '../examples/Example.java')
        }
      }
    };

    const response = await this.sendRequest(request);

    if (!response.result?.content?.[0]?.text) {
      throw new Error('No analysis result');
    }

    const analysis = JSON.parse(response.result.content[0].text);

    if (analysis.fileInfo.language !== 'java') {
      throw new Error(`Expected java, got ${analysis.fileInfo.language}`);
    }

    console.log(`   Analyzed ${analysis.fileInfo.lines} lines of Java`);
  }

  async testAnalyzeCSharp() {
    const request = {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'analyze_code_file',
        arguments: {
          filePath: join(__dirname, '../examples/Program.cs')
        }
      }
    };

    const response = await this.sendRequest(request);

    if (!response.result?.content?.[0]?.text) {
      throw new Error('No analysis result');
    }

    const analysis = JSON.parse(response.result.content[0].text);

    if (analysis.fileInfo.language !== 'csharp') {
      throw new Error(`Expected csharp, got ${analysis.fileInfo.language}`);
    }

    console.log(`   Analyzed ${analysis.fileInfo.lines} lines of C#`);
  }

  async testMakeCommand() {
    const request = {
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'run_make_command',
        arguments: {
          projectPath: join(__dirname, '../examples'),
          target: 'help'
        }
      }
    };

    const response = await this.sendRequest(request);

    if (!response.result?.content?.[0]?.text) {
      throw new Error('No make result');
    }

    const result = JSON.parse(response.result.content[0].text);
    console.log(`   Make command executed with exit code: ${result.details?.exitCode || 'unknown'}`);
  }

  async testCustomCommand() {
    const request = {
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: {
        name: 'run_custom_command',
        arguments: {
          command: process.platform === 'win32' ? 'echo Hello MCP' : 'echo "Hello MCP"',
          workingDirectory: '.'
        }
      }
    };

    const response = await this.sendRequest(request);

    if (!response.result?.content?.[0]?.text) {
      throw new Error('No custom command result');
    }

    const result = JSON.parse(response.result.content[0].text);

    if (!result.success) {
      throw new Error('Custom command failed');
    }

    console.log(`   Custom command output: ${result.output.trim()}`);
  }

  async runAllTests() {
    console.log('🔧 Multi-Language MCP Server Test Suite');
    console.log('='.repeat(50));

    try {
      await this.startServer();

      // Core functionality tests
      await this.runTest('List Tools', () => this.testListTools());

      // Multi-language analysis tests
      await this.runTest('Analyze TypeScript', () => this.testAnalyzeTypeScript());
      await this.runTest('Analyze Python', () => this.testAnalyzePython());
      await this.runTest('Analyze Go', () => this.testAnalyzeGo());
      await this.runTest('Analyze Rust', () => this.testAnalyzeRust());
      await this.runTest('Analyze Java', () => this.testAnalyzeJava());
      await this.runTest('Analyze C#', () => this.testAnalyzeCSharp());

      // Build system tests
      await this.runTest('Make Command', () => this.testMakeCommand());
      await this.runTest('Custom Command', () => this.testCustomCommand());

    } finally {
      if (this.serverProcess) {
        this.serverProcess.kill();
      }
    }

    // Print results
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);

    if (this.testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
    }

    console.log('\n🎉 Test suite complete!');
    return this.testResults.failed === 0;
  }
}

// Check if server is built and run tests
async function main() {
  try {
    await access('./dist/index.js');
  } catch (error) {
    console.log('❌ Server not built. Please run "npm run build" first.');
    process.exit(1);
  }

  const tester = new MCPTester();
  const success = await tester.runAllTests();

  process.exit(success ? 0 : 1);
}

main().catch(console.error);
