#!/usr/bin/env node

// Setup script for Code Feedback MCP Server
import { spawn } from 'child_process';
import { access } from 'fs/promises';

console.log('🚀 Setting up Code Feedback MCP Server...\n');

async function runCommand(command, args, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkNodeModules() {
  try {
    await access('./node_modules');
    console.log('✅ node_modules exists');
    return true;
  } catch {
    console.log('📦 node_modules not found, will install dependencies');
    return false;
  }
}

async function setup() {
  try {
    // Check if dependencies are installed
    const hasNodeModules = await checkNodeModules();
    
    if (!hasNodeModules) {
      console.log('\n📦 Installing dependencies...');
      await runCommand('npm', ['install']);
      console.log('✅ Dependencies installed\n');
    }

    // Build the project
    console.log('🔨 Building TypeScript project...');
    await runCommand('npm', ['run', 'build']);
    console.log('✅ Build completed\n');

    // Run tests
    console.log('🧪 Running tests...');
    await runCommand('npm', ['test']);
    
    console.log('\n🎉 Setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Use the MCP server: npm start');
    console.log('2. Configure your MCP client with: mcp-config.json');
    console.log('3. Check examples in the examples/ directory');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setup();
