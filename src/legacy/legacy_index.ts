#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { join, extname, dirname } from 'path';

// Types for our tool responses
interface CodeFeedback {
  success: boolean;
  errors: string[];
  warnings: string[];
  output?: string;
  details?: any;
}

class CodeFeedbackMCP {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'code-feedback-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'validate_typescript_file',
            description: 'Validate and compile a TypeScript file, checking for syntax and type errors',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the TypeScript file to validate',
                },
                tsConfigPath: {
                  type: 'string',
                  description: 'Optional path to tsconfig.json (defaults to searching up the directory tree)',
                },
              },
              required: ['filePath'],
            },
          },
          {
            name: 'lint_file',
            description: 'Run ESLint on a JavaScript/TypeScript file to check for code quality issues',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the file to lint',
                },
                fix: {
                  type: 'boolean',
                  description: 'Whether to automatically fix fixable issues',
                  default: false,
                },
                configPath: {
                  type: 'string',
                  description: 'Optional path to ESLint config file',
                },
              },
              required: ['filePath'],
            },
          },
          {
            name: 'validate_javascript_file',
            description: 'Validate JavaScript file syntax using Node.js',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the JavaScript file to validate',
                },
              },
              required: ['filePath'],
            },
          },
          {
            name: 'run_project_build',
            description: 'Run project build command (npm run build, yarn build, etc.) to validate project-wide changes',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory containing package.json',
                },
                buildCommand: {
                  type: 'string',
                  description: 'Build command to run (defaults to "npm run build")',
                  default: 'npm run build',
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds (default: 60000)',
                  default: 60000,
                },
              },
              required: ['projectPath'],
            },
          },
          {
            name: 'run_npm_script',
            description: 'Run any npm script defined in package.json (test, lint, etc.)',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory containing package.json',
                },
                scriptName: {
                  type: 'string',
                  description: 'Name of the npm script to run',
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds (default: 60000)',
                  default: 60000,
                },
              },
              required: ['projectPath', 'scriptName'],
            },
          },
          {
            name: 'validate_go_file',
            description: 'Validate Go source file with compilation and formatting checks',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the Go file to validate',
                },
                checkFormat: {
                  type: 'boolean',
                  description: 'Whether to check Go formatting with gofmt',
                  default: true,
                },
                runTests: {
                  type: 'boolean',
                  description: 'Whether to run Go tests if it\'s a test file',
                  default: false,
                },
              },
              required: ['filePath'],
            },
          },
          {
            name: 'validate_python_file',
            description: 'Validate Python file with syntax checking and optional linting',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the Python file to validate',
                },
                linter: {
                  type: 'string',
                  description: 'Linter to use (pylint, flake8, black)',
                  enum: ['pylint', 'flake8', 'black', 'mypy'],
                },
                fix: {
                  type: 'boolean',
                  description: 'Whether to auto-fix issues (works with black)',
                  default: false,
                },
              },
              required: ['filePath'],
            },
          },
          {
            name: 'run_make_command',
            description: 'Run Make commands (make, make build, make test, etc.)',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory containing Makefile',
                },
                target: {
                  type: 'string',
                  description: 'Make target to run (default: no target)',
                },
                makeArgs: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments for make command',
                  default: [],
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds (default: 60000)',
                  default: 60000,
                },
              },
              required: ['projectPath'],
            },
          },
          {
            name: 'run_gradle_command',
            description: 'Run Gradle commands (build, test, etc.)',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory containing build.gradle',
                },
                task: {
                  type: 'string',
                  description: 'Gradle task to run (build, test, clean, etc.)',
                  default: 'build',
                },
                gradleArgs: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments for gradle command',
                  default: [],
                },
                useWrapper: {
                  type: 'boolean',
                  description: 'Use gradle wrapper (./gradlew) if available',
                  default: true,
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds (default: 120000)',
                  default: 120000,
                },
              },
              required: ['projectPath'],
            },
          },
          {
            name: 'run_maven_command',
            description: 'Run Maven commands (compile, test, package, etc.)',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory containing pom.xml',
                },
                goal: {
                  type: 'string',
                  description: 'Maven goal to run (compile, test, package, etc.)',
                  default: 'compile',
                },
                mavenArgs: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments for maven command',
                  default: [],
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds (default: 120000)',
                  default: 120000,
                },
              },
              required: ['projectPath'],
            },
          },
          {
            name: 'run_cargo_command',
            description: 'Run Rust Cargo commands (build, test, clippy, etc.)',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory containing Cargo.toml',
                },
                command: {
                  type: 'string',
                  description: 'Cargo command to run (build, test, clippy, fmt, etc.)',
                  default: 'build',
                },
                cargoArgs: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments for cargo command',
                  default: [],
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds (default: 120000)',
                  default: 120000,
                },
              },
              required: ['projectPath'],
            },
          },
          {
            name: 'run_dotnet_command',
            description: 'Run .NET CLI commands (build, test, run, etc.)',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory containing .csproj or .sln',
                },
                command: {
                  type: 'string',
                  description: 'dotnet command to run (build, test, run, etc.)',
                  default: 'build',
                },
                dotnetArgs: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments for dotnet command',
                  default: [],
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds (default: 120000)',
                  default: 120000,
                },
              },
              required: ['projectPath'],
            },
          },
          {
            name: 'run_custom_command',
            description: 'Run any custom command in a specified directory',
            inputSchema: {
              type: 'object',
              properties: {
                command: {
                  type: 'string',
                  description: 'Command to execute',
                },
                workingDirectory: {
                  type: 'string',
                  description: 'Working directory for the command',
                  default: '.',
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds (default: 60000)',
                  default: 60000,
                },
                env: {
                  type: 'object',
                  description: 'Environment variables to set',
                  additionalProperties: { type: 'string' },
                  default: {},
                },
              },
              required: ['command'],
            },
          },
          {
            name: 'analyze_code_file',
            description: 'Comprehensive analysis of a code file including syntax, imports, and basic structure validation',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the code file to analyze',
                },
                language: {
                  type: 'string',
                  description: 'Programming language hint (auto-detected if not provided)',
                  enum: ['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'csharp'],
                },
              },
              required: ['filePath'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'validate_typescript_file':
            return await this.validateTypeScriptFile(args);
          case 'lint_file':
            return await this.lintFile(args);
          case 'validate_javascript_file':
            return await this.validateJavaScriptFile(args);
          case 'run_project_build':
            return await this.runProjectBuild(args);
          case 'run_npm_script':
            return await this.runNpmScript(args);
          case 'validate_go_file':
            return await this.validateGoFile(args);
          case 'validate_python_file':
            return await this.validatePythonFile(args);
          case 'run_make_command':
            return await this.runMakeCommand(args);
          case 'run_gradle_command':
            return await this.runGradleCommand(args);
          case 'run_maven_command':
            return await this.runMavenCommand(args);
          case 'run_cargo_command':
            return await this.runCargoCommand(args);
          case 'run_dotnet_command':
            return await this.runDotnetCommand(args);
          case 'run_custom_command':
            return await this.runCustomCommand(args);
          case 'analyze_code_file':
            return await this.analyzeCodeFile(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async validateTypeScriptFile(args: any): Promise<any> {
    const schema = z.object({
      filePath: z.string(),
      tsConfigPath: z.string().optional(),
    });

    const { filePath, tsConfigPath } = schema.parse(args);

    try {
      // Check if file exists
      await fs.access(filePath);

      // Find tsconfig.json if not provided
      const configPath = tsConfigPath || await this.findTsConfig(filePath);

      // Run TypeScript compiler
      const tscCommand = configPath
        ? `npx tsc --noEmit --project "${configPath}" "${filePath}"`
        : `npx tsc --noEmit "${filePath}"`;

      const result = await this.executeCommand(tscCommand, dirname(filePath));

      const feedback: CodeFeedback = {
        success: result.exitCode === 0,
        errors: [],
        warnings: [],
        output: result.stdout + result.stderr,
      };

      if (result.stderr) {
        const lines = result.stderr.split('\n');
        lines.forEach(line => {
          if (line.includes('error TS')) {
            feedback.errors.push(line.trim());
          } else if (line.includes('warning TS')) {
            feedback.warnings.push(line.trim());
          }
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(feedback, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error validating TypeScript file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async lintFile(args: any): Promise<any> {
    const schema = z.object({
      filePath: z.string(),
      fix: z.boolean().default(false),
      configPath: z.string().optional(),
    });

    const { filePath, fix, configPath } = schema.parse(args);

    try {
      await fs.access(filePath);

      let eslintCommand = `npx eslint "${filePath}" --format json`;
      if (fix) {
        eslintCommand += ' --fix';
      }
      if (configPath) {
        eslintCommand += ` --config "${configPath}"`;
      }

      const result = await this.executeCommand(eslintCommand, dirname(filePath));

      const feedback: CodeFeedback = {
        success: result.exitCode === 0,
        errors: [],
        warnings: [],
        output: result.stdout,
      };

      try {
        const eslintResults = JSON.parse(result.stdout);
        if (eslintResults.length > 0) {
          const fileResult = eslintResults[0];
          fileResult.messages.forEach((message: any) => {
            const formattedMessage = `Line ${message.line}, Column ${message.column}: ${message.message} (${message.ruleId})`;
            if (message.severity === 2) {
              feedback.errors.push(formattedMessage);
            } else if (message.severity === 1) {
              feedback.warnings.push(formattedMessage);
            }
          });
        }
      } catch {
        // If JSON parsing fails, treat stderr as errors
        if (result.stderr) {
          feedback.errors.push(result.stderr);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(feedback, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error linting file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async validateJavaScriptFile(args: any): Promise<any> {
    const schema = z.object({
      filePath: z.string(),
    });

    const { filePath } = schema.parse(args);

    try {
      await fs.access(filePath);

      const nodeCommand = `node --check "${filePath}"`;
      const result = await this.executeCommand(nodeCommand, dirname(filePath));

      const feedback: CodeFeedback = {
        success: result.exitCode === 0,
        errors: result.stderr ? [result.stderr] : [],
        warnings: [],
        output: result.stdout,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(feedback, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error validating JavaScript file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async runProjectBuild(args: any): Promise<any> {
    const schema = z.object({
      projectPath: z.string(),
      buildCommand: z.string().default('npm run build'),
      timeout: z.number().default(60000),
    });

    const { projectPath, buildCommand, timeout } = schema.parse(args);

    try {
      // Check if package.json exists
      await fs.access(join(projectPath, 'package.json'));

      const result = await this.executeCommand(buildCommand, projectPath, timeout);

      const feedback: CodeFeedback = {
        success: result.exitCode === 0,
        errors: result.stderr ? [result.stderr] : [],
        warnings: [],
        output: result.stdout,
        details: {
          command: buildCommand,
          exitCode: result.exitCode,
          duration: result.duration,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(feedback, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error running project build: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async runNpmScript(args: any): Promise<any> {
    const schema = z.object({
      projectPath: z.string(),
      scriptName: z.string(),
      timeout: z.number().default(60000),
    });

    const { projectPath, scriptName, timeout } = schema.parse(args);

    try {
      // Check if package.json exists and script is defined
      const packageJsonPath = join(projectPath, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      if (!packageJson.scripts || !packageJson.scripts[scriptName]) {
        throw new Error(`Script "${scriptName}" not found in package.json`);
      }

      const command = `npm run ${scriptName}`;
      const result = await this.executeCommand(command, projectPath, timeout);

      const feedback: CodeFeedback = {
        success: result.exitCode === 0,
        errors: result.stderr ? [result.stderr] : [],
        warnings: [],
        output: result.stdout,
        details: {
          script: packageJson.scripts[scriptName],
          command,
          exitCode: result.exitCode,
          duration: result.duration,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(feedback, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error running npm script: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async validateGoFile(args: any): Promise<any> {
    const schema = z.object({
      filePath: z.string(),
      checkFormat: z.boolean().default(true),
      runTests: z.boolean().default(false),
    });

    const { filePath, checkFormat, runTests } = schema.parse(args);

    try {
      await fs.access(filePath);

      const feedback: CodeFeedback = {
        success: true,
        errors: [],
        warnings: [],
        output: '',
      };

      // Check Go syntax/compilation
      try {
        const buildResult = await this.executeCommand(`go build -o /dev/null "${filePath}"`, dirname(filePath));
        feedback.output += `Build: ${buildResult.stdout}\n`;
        if (buildResult.exitCode !== 0) {
          feedback.success = false;
          feedback.errors.push(`Build failed: ${buildResult.stderr}`);
        }
      } catch (error) {
        feedback.success = false;
        feedback.errors.push(`Build error: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Check formatting
      if (checkFormat) {
        try {
          const fmtResult = await this.executeCommand(`gofmt -d "${filePath}"`, dirname(filePath));
          if (fmtResult.stdout.trim()) {
            feedback.warnings.push('File is not properly formatted. Run gofmt to fix.');
            feedback.output += `Format diff:\n${fmtResult.stdout}\n`;
          }
        } catch (error) {
          feedback.warnings.push(`Format check failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Run tests if it's a test file
      if (runTests && filePath.includes('_test.go')) {
        try {
          const testResult = await this.executeCommand(`go test -v "${filePath}"`, dirname(filePath));
          feedback.output += `Test: ${testResult.stdout}\n`;
          if (testResult.exitCode !== 0) {
            feedback.errors.push(`Tests failed: ${testResult.stderr}`);
            feedback.success = false;
          }
        } catch (error) {
          feedback.warnings.push(`Test execution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(feedback, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error validating Go file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async validatePythonFile(args: any): Promise<any> {
    const schema = z.object({
      filePath: z.string(),
      linter: z.enum(['pylint', 'flake8', 'black', 'mypy']).optional(),
      fix: z.boolean().default(false),
    });

    const { filePath, linter, fix } = schema.parse(args);

    try {
      await fs.access(filePath);

      const feedback: CodeFeedback = {
        success: true,
        errors: [],
        warnings: [],
        output: '',
      };

      // Basic syntax check
      try {
        const syntaxResult = await this.executeCommand(`python -m py_compile "${filePath}"`, dirname(filePath));
        if (syntaxResult.exitCode !== 0) {
          feedback.success = false;
          feedback.errors.push(`Syntax error: ${syntaxResult.stderr}`);
        } else {
          feedback.output += 'Syntax check: OK\n';
        }
      } catch (error) {
        feedback.success = false;
        feedback.errors.push(`Syntax check failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Run linter if specified
      if (linter && feedback.success) {
        try {
          let lintCommand = '';
          switch (linter) {
            case 'pylint':
              lintCommand = `pylint "${filePath}"`;
              break;
            case 'flake8':
              lintCommand = `flake8 "${filePath}"`;
              break;
            case 'black':
              lintCommand = fix ? `black "${filePath}"` : `black --check "${filePath}"`;
              break;
            case 'mypy':
              lintCommand = `mypy "${filePath}"`;
              break;
          }

          const lintResult = await this.executeCommand(lintCommand, dirname(filePath));
          feedback.output += `${linter}: ${lintResult.stdout}\n`;

          if (lintResult.exitCode !== 0) {
            if (linter === 'pylint' && lintResult.exitCode < 32) {
              // pylint exit codes < 32 are warnings/style issues
              feedback.warnings.push(`${linter} issues: ${lintResult.stdout}`);
            } else {
              feedback.errors.push(`${linter} errors: ${lintResult.stderr || lintResult.stdout}`);
              feedback.success = false;
            }
          }
        } catch (error) {
          feedback.warnings.push(`${linter} execution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(feedback, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error validating Python file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async runMakeCommand(args: any): Promise<any> {
    const schema = z.object({
      projectPath: z.string(),
      target: z.string().optional(),
      makeArgs: z.array(z.string()).default([]),
      timeout: z.number().default(60000),
    });

    const { projectPath, target, makeArgs, timeout } = schema.parse(args);

    try {
      // Check if Makefile exists
      await fs.access(join(projectPath, 'Makefile'));

      let command = 'make';
      if (target) {
        command += ` ${target}`;
      }
      if (makeArgs.length > 0) {
        command += ` ${makeArgs.join(' ')}`;
      }

      const result = await this.executeCommand(command, projectPath, timeout);

      const feedback: CodeFeedback = {
        success: result.exitCode === 0,
        errors: result.stderr ? [result.stderr] : [],
        warnings: [],
        output: result.stdout,
        details: {
          command,
          target: target || 'default',
          exitCode: result.exitCode,
          duration: result.duration,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(feedback, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error running make command: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async runGradleCommand(args: any): Promise<any> {
    const schema = z.object({
      projectPath: z.string(),
      task: z.string().default('build'),
      gradleArgs: z.array(z.string()).default([]),
      useWrapper: z.boolean().default(true),
      timeout: z.number().default(120000),
    });

    const { projectPath, task, gradleArgs, useWrapper, timeout } = schema.parse(args);

    try {
      // Check if build.gradle exists
      const hasBuildGradle = await fs.access(join(projectPath, 'build.gradle')).then(() => true).catch(() => false);
      const hasBuildGradleKts = await fs.access(join(projectPath, 'build.gradle.kts')).then(() => true).catch(() => false);

      if (!hasBuildGradle && !hasBuildGradleKts) {
        throw new Error('No build.gradle or build.gradle.kts found');
      }

      // Determine gradle command
      let gradleCmd = 'gradle';
      if (useWrapper) {
        const hasWrapper = await fs.access(join(projectPath, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')).then(() => true).catch(() => false);
        if (hasWrapper) {
          gradleCmd = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
        }
      }

      let command = `${gradleCmd} ${task}`;
      if (gradleArgs.length > 0) {
        command += ` ${gradleArgs.join(' ')}`;
      }

      const result = await this.executeCommand(command, projectPath, timeout);

      const feedback: CodeFeedback = {
        success: result.exitCode === 0,
        errors: result.stderr ? [result.stderr] : [],
        warnings: [],
        output: result.stdout,
        details: {
          command,
          task,
          gradleCommand: gradleCmd,
          exitCode: result.exitCode,
          duration: result.duration,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(feedback, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error running Gradle command: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async runMavenCommand(args: any): Promise<any> {
    const schema = z.object({
      projectPath: z.string(),
      goal: z.string().default('compile'),
      mavenArgs: z.array(z.string()).default([]),
      timeout: z.number().default(120000),
    });

    const { projectPath, goal, mavenArgs, timeout } = schema.parse(args);

    try {
      // Check if pom.xml exists
      await fs.access(join(projectPath, 'pom.xml'));

      let command = `mvn ${goal}`;
      if (mavenArgs.length > 0) {
        command += ` ${mavenArgs.join(' ')}`;
      }

      const result = await this.executeCommand(command, projectPath, timeout);

      const feedback: CodeFeedback = {
        success: result.exitCode === 0,
        errors: result.stderr ? [result.stderr] : [],
        warnings: [],
        output: result.stdout,
        details: {
          command,
          goal,
          exitCode: result.exitCode,
          duration: result.duration,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(feedback, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error running Maven command: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async runCargoCommand(args: any): Promise<any> {
    const schema = z.object({
      projectPath: z.string(),
      command: z.string().default('build'),
      cargoArgs: z.array(z.string()).default([]),
      timeout: z.number().default(120000),
    });

    const { projectPath, command, cargoArgs, timeout } = schema.parse(args);

    try {
      // Check if Cargo.toml exists
      await fs.access(join(projectPath, 'Cargo.toml'));

      let cargoCommand = `cargo ${command}`;
      if (cargoArgs.length > 0) {
        cargoCommand += ` ${cargoArgs.join(' ')}`;
      }

      const result = await this.executeCommand(cargoCommand, projectPath, timeout);

      const feedback: CodeFeedback = {
        success: result.exitCode === 0,
        errors: result.stderr ? [result.stderr] : [],
        warnings: [],
        output: result.stdout,
        details: {
          command: cargoCommand,
          cargoCommand: command,
          exitCode: result.exitCode,
          duration: result.duration,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(feedback, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error running Cargo command: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async runDotnetCommand(args: any): Promise<any> {
    const schema = z.object({
      projectPath: z.string(),
      command: z.string().default('build'),
      dotnetArgs: z.array(z.string()).default([]),
      timeout: z.number().default(120000),
    });

    const { projectPath, command, dotnetArgs, timeout } = schema.parse(args);

    try {
      // Check if .csproj or .sln exists
      const files = await fs.readdir(projectPath);
      const hasProject = files.some(file => file.endsWith('.csproj') || file.endsWith('.sln') || file.endsWith('.fsproj') || file.endsWith('.vbproj'));

      if (!hasProject) {
        throw new Error('No .NET project file (.csproj, .sln, .fsproj, .vbproj) found');
      }

      let dotnetCommand = `dotnet ${command}`;
      if (dotnetArgs.length > 0) {
        dotnetCommand += ` ${dotnetArgs.join(' ')}`;
      }

      const result = await this.executeCommand(dotnetCommand, projectPath, timeout);

      const feedback: CodeFeedback = {
        success: result.exitCode === 0,
        errors: result.stderr ? [result.stderr] : [],
        warnings: [],
        output: result.stdout,
        details: {
          command: dotnetCommand,
          dotnetCommand: command,
          exitCode: result.exitCode,
          duration: result.duration,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(feedback, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error running .NET command: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async runCustomCommand(args: any): Promise<any> {
    const schema = z.object({
      command: z.string(),
      workingDirectory: z.string().default('.'),
      timeout: z.number().default(60000),
      env: z.record(z.string()).default({}),
    });

    const { command, workingDirectory, timeout, env } = schema.parse(args);

    try {
      const result = await this.executeCommandWithEnv(command, workingDirectory, timeout, env);

      const feedback: CodeFeedback = {
        success: result.exitCode === 0,
        errors: result.stderr ? [result.stderr] : [],
        warnings: [],
        output: result.stdout,
        details: {
          command,
          workingDirectory,
          exitCode: result.exitCode,
          duration: result.duration,
          environment: env,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(feedback, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error running custom command: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async analyzeCodeFile(args: any): Promise<any> {
    const schema = z.object({
      filePath: z.string(),
      language: z.enum(['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'csharp']).optional(),
    });

    const { filePath, language } = schema.parse(args);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const ext = extname(filePath);
      const detectedLanguage = language || this.detectLanguage(ext);

      const analysis = {
        fileInfo: {
          path: filePath,
          extension: ext,
          size: content.length,
          lines: content.split('\n').length,
          language: detectedLanguage,
        },
        syntax: {
          valid: true,
          errors: [] as string[],
        },
        structure: {
          imports: [] as string[],
          exports: [] as string[],
          functions: [] as string[],
          classes: [] as string[],
          interfaces: [] as string[],
        },
      };

      // Language-specific syntax analysis
      switch (detectedLanguage) {
        case 'javascript':
        case 'typescript':
          await this.analyzeJavaScriptTypeScript(content, analysis, filePath);
          break;
        case 'python':
          await this.analyzePython(content, analysis, filePath);
          break;
        case 'go':
          await this.analyzeGo(content, analysis, filePath);
          break;
        case 'rust':
          await this.analyzeRust(content, analysis);
          break;
        case 'java':
          await this.analyzeJava(content, analysis);
          break;
        case 'csharp':
          await this.analyzeCSharp(content, analysis);
          break;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysis, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing code file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private detectLanguage(ext: string): string {
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.mjs': 'javascript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.hpp': 'cpp',
    };
    return langMap[ext] || 'unknown';
  }

  private async analyzeJavaScriptTypeScript(content: string, analysis: any, filePath: string): Promise<void> {
    // Syntax check for JavaScript
    if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
      try {
        const nodeResult = await this.executeCommand(`node --check "${filePath}"`, dirname(filePath));
        analysis.syntax.valid = nodeResult.exitCode === 0;
        if (nodeResult.stderr) {
          analysis.syntax.errors.push(nodeResult.stderr);
        }
      } catch (error) {
        analysis.syntax.valid = false;
        analysis.syntax.errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    // Structure analysis
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('import ') || (trimmed.startsWith('const ') && trimmed.includes('require('))) {
        analysis.structure.imports.push(`Line ${index + 1}: ${trimmed}`);
      }
      if (trimmed.startsWith('export ') || trimmed.includes('module.exports')) {
        analysis.structure.exports.push(`Line ${index + 1}: ${trimmed}`);
      }
      if (trimmed.includes('function ') || trimmed.includes('=>') ||
        trimmed.match(/^(async\s+)?function\s+\w+/) ||
        trimmed.match(/^\w+\s*:\s*(async\s+)?function/)) {
        analysis.structure.functions.push(`Line ${index + 1}: ${trimmed}`);
      }
      if (trimmed.startsWith('class ')) {
        analysis.structure.classes.push(`Line ${index + 1}: ${trimmed}`);
      }
      if (trimmed.startsWith('interface ')) {
        analysis.structure.interfaces.push(`Line ${index + 1}: ${trimmed}`);
      }
    });
  }

  private async analyzePython(content: string, analysis: any, filePath: string): Promise<void> {
    // Python syntax check
    try {
      const syntaxResult = await this.executeCommand(`python -m py_compile "${filePath}"`, dirname(filePath));
      analysis.syntax.valid = syntaxResult.exitCode === 0;
      if (syntaxResult.stderr) {
        analysis.syntax.errors.push(syntaxResult.stderr);
      }
    } catch (error) {
      analysis.syntax.valid = false;
      analysis.syntax.errors.push(error instanceof Error ? error.message : String(error));
    }

    // Structure analysis
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        analysis.structure.imports.push(`Line ${index + 1}: ${trimmed}`);
      }
      if (trimmed.startsWith('def ')) {
        analysis.structure.functions.push(`Line ${index + 1}: ${trimmed}`);
      }
      if (trimmed.startsWith('class ')) {
        analysis.structure.classes.push(`Line ${index + 1}: ${trimmed}`);
      }
    });
  }

  private async analyzeGo(content: string, analysis: any, filePath: string): Promise<void> {
    // Go syntax check
    try {
      const buildResult = await this.executeCommand(`go build -o /dev/null "${filePath}"`, dirname(filePath));
      analysis.syntax.valid = buildResult.exitCode === 0;
      if (buildResult.stderr) {
        analysis.syntax.errors.push(buildResult.stderr);
      }
    } catch (error) {
      analysis.syntax.valid = false;
      analysis.syntax.errors.push(error instanceof Error ? error.message : String(error));
    }

    // Structure analysis
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('import ')) {
        analysis.structure.imports.push(`Line ${index + 1}: ${trimmed}`);
      }
      if (trimmed.startsWith('func ')) {
        analysis.structure.functions.push(`Line ${index + 1}: ${trimmed}`);
      }
      if (trimmed.startsWith('type ') && trimmed.includes('struct')) {
        analysis.structure.classes.push(`Line ${index + 1}: ${trimmed}`);
      }
      if (trimmed.startsWith('type ') && trimmed.includes('interface')) {
        analysis.structure.interfaces.push(`Line ${index + 1}: ${trimmed}`);
      }
    });
  }

  private async analyzeRust(content: string, analysis: any): Promise<void> {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('use ') || trimmed.startsWith('extern crate')) {
        analysis.structure.imports.push(`Line ${index + 1}: ${trimmed}`);
      }
      if (trimmed.startsWith('fn ') || trimmed.startsWith('pub fn ')) {
        analysis.structure.functions.push(`Line ${index + 1}: ${trimmed}`);
      }
      if (trimmed.startsWith('struct ') || trimmed.startsWith('pub struct ')) {
        analysis.structure.classes.push(`Line ${index + 1}: ${trimmed}`);
      }
      if (trimmed.startsWith('trait ') || trimmed.startsWith('pub trait ')) {
        analysis.structure.interfaces.push(`Line ${index + 1}: ${trimmed}`);
      }
    });
  }

  private async analyzeJava(content: string, analysis: any): Promise<void> {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('import ')) {
        analysis.structure.imports.push(`Line ${index + 1}: ${trimmed}`);
      }
      if (trimmed.includes(' class ') || trimmed.startsWith('class ')) {
        analysis.structure.classes.push(`Line ${index + 1}: ${trimmed}`);
      }
      if (trimmed.includes(' interface ') || trimmed.startsWith('interface ')) {
        analysis.structure.interfaces.push(`Line ${index + 1}: ${trimmed}`);
      }
      if ((trimmed.includes('public ') || trimmed.includes('private ') || trimmed.includes('protected ')) &&
        (trimmed.includes('(') && trimmed.includes(')'))) {
        analysis.structure.functions.push(`Line ${index + 1}: ${trimmed}`);
      }
    });
  }

  private async analyzeCSharp(content: string, analysis: any): Promise<void> {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('using ')) {
        analysis.structure.imports.push(`Line ${index + 1}: ${trimmed}`);
      }
      if (trimmed.includes(' class ') || trimmed.startsWith('class ')) {
        analysis.structure.classes.push(`Line ${index + 1}: ${trimmed}`);
      }
      if (trimmed.includes(' interface ') || trimmed.startsWith('interface ')) {
        analysis.structure.interfaces.push(`Line ${index + 1}: ${trimmed}`);
      }
      if ((trimmed.includes('public ') || trimmed.includes('private ') || trimmed.includes('protected ')) &&
        (trimmed.includes('(') && trimmed.includes(')'))) {
        analysis.structure.functions.push(`Line ${index + 1}: ${trimmed}`);
      }
    });
  }

  private async findTsConfig(filePath: string): Promise<string | undefined> {
    let currentDir = dirname(filePath);

    while (currentDir !== dirname(currentDir)) { // Stop at root
      try {
        const tsConfigPath = join(currentDir, 'tsconfig.json');
        await fs.access(tsConfigPath);
        return tsConfigPath;
      } catch {
        currentDir = dirname(currentDir);
      }
    }

    return undefined;
  }

  private async executeCommand(command: string, cwd: string, timeout = 30000): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
  }> {
    return this.executeCommandWithEnv(command, cwd, timeout, {});
  }

  private async executeCommandWithEnv(command: string, cwd: string, timeout = 30000, env: Record<string, string> = {}): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
  }> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const mergedEnv = { ...process.env, ...env };
      const child = exec(command, { cwd, timeout, env: mergedEnv }, (error, stdout, stderr) => {
        const duration = Date.now() - startTime;

        if (error && (error.code as any) === 'ETIMEDOUT') {
          reject(new Error(`Command timed out after ${timeout}ms`));
          return;
        }

        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: error ? (error as any).code || 1 : 0,
          duration,
        });
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Code Feedback MCP Server v1.0.0 - Multi-language support (JS/TS/Python/Go/Rust/Java/C#/Make/Gradle/Maven/Cargo/.NET)');
  }
}

// Start the server
const server = new CodeFeedbackMCP();
server.run().catch(console.error);
