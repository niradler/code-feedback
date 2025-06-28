# Code Feedback MCP Server

A powerful, open-source Model Context Protocol (MCP) server for automated, multi-language code feedback, validation, and project analysis. Designed for developers, teams, and LLM-powered workflows to ensure code quality, correctness, and maintainability across diverse languages and build systems.

---

## Why Code Feedback MCP?

Modern codebases are polyglot and complex. Automated, language-agnostic feedback is essential for:

- **Catching errors early** (before code review or CI)
- **Standardizing quality** across languages and teams
- **Empowering LLMs and tools** to validate, lint, build, and analyze code safely
- **Reducing manual review time** and improving developer confidence

**Code Feedback MCP** provides a secure, extensible, and LLM-friendly API for code validation, linting, building, and analysis—out of the box.

---

## Key Features

- Multi-language file validation (TypeScript, JavaScript, Python, Go)
- Project-level build/test integration (npm, Make)
- Dependency management for npm projects
- Git command execution
- Secure, path-restricted file and command access
- Structured, machine-readable JSON responses
- Advanced prompt system for code review, analysis, and more
- Cross-platform: Windows, macOS, Linux

---

## How It Works

The MCP server exposes a set of tools and prompts via a simple API. You can:

- Validate and lint code files
- Build and test projects
- Manage dependencies
- Run git commands
- Request advanced code review, analysis, and suggestions via prompts

All actions are path-restricted for security and return structured results for easy integration with LLMs, editors, or CI systems.

---

## Installation

**Requirements:**

- Node.js 18+
- Language-specific tools (TypeScript, Python, Go, etc.) installed and in your PATH
- Project-level configs (e.g., `tsconfig.json`, `Makefile`, `package.json`) as needed

**Install dependencies and build:**

```bash
npm install
npm run build
```

---

## Configuration

Configure allowed paths and server settings in `mcp-config.json`:

```json
{
  "mcpServers": {
    "code-feedback": {
      "command": "npx",
      "args": ["-y", "code-feedback"],
      "env": {
        "MCP_ALLOWED_PATHS": "C:/Projects"
      }
    }
  }
}
```

- `MCP_ALLOWED_PATHS` restricts file/command access for security.

---

## Usage

### Start the Server

```bash
npm start
```

Or with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector ./dist/start-server.js
```

### Example: Validate a TypeScript File

Send a request to the server (via HTTP, CLI, or SDK):

```json
{
  "tool": "validate_typescript_file",
  "args": { "filePath": "./examples/example-good.ts" }
}
```

**Response:**

```json
{
  "success": true,
  "errors": [],
  "warnings": [],
  "output": "...TypeScript compiler output..."
}
```

### Example: Run an npm Script

```json
{
  "tool": "run_npm_script",
  "args": { "projectPath": "./examples", "scriptName": "test" }
}
```

### Example: Use a Prompt for Code Review

```json
{
  "prompt": "code-review",
  "args": { "filePath": "./examples/example-good.js", "focus": "performance" }
}
```

**Response:**

```json
{
  "feedback": "...comprehensive review, suggestions, and best practices..."
}
```

---

## Available Tools

- `validate_typescript_file`: Validate and compile a TypeScript file, checking for syntax and type errors.
- `validate_javascript_file`: Validate JavaScript file syntax using Node.js.
- `validate_python_file`: Validate Python file with syntax checking and optional linting (pylint, flake8, black, mypy).
- `validate_go_file`: Validate Go source file with compilation and formatting checks, and optionally run Go tests.
- `run_make_command`: Run Make commands (e.g., make, make build, make test).
- `list_make_commands`: List available make targets/commands from a Makefile.
- `run_npm_script`: Run any npm script defined in package.json (e.g., test, lint, build).
- `list_npm_scripts`: List all available npm scripts in a project.
- `install_npm_deps`: Install npm dependencies (packages) in a project.
- `uninstall_npm_deps`: Uninstall npm dependencies from a project.
- `run_git_command`: Run git commands (status, diff, log, branch, checkout, commit, add, push, pull, merge, reset, or custom).

All tools accept file/project paths and relevant options. Responses are structured as:

```json
{
  "success": true/false,
  "errors": ["error messages"],
  "warnings": ["warning messages"],
  "output": "command output",
  "details": { "command": "...", "exitCode": 0, "duration": 1234 }
}
```

---

## Prompt System

Request advanced code review, analysis, and guidance using prompts:

- **code-review**: Comprehensive code review with feedback and suggestions
- **code-analysis**: Analyze code structure, complexity, and potential issues
- **refactor-suggestions**: Refactoring suggestions for improved code quality
- **bug-detection**: Detect potential bugs and issues
- **documentation-review**: Review and suggest improvements for code documentation
- **test-coverage-analysis**: Analyze test coverage and suggest missing test cases
- **security-audit**: Security audit and vulnerability identification
- **performance-analysis**: Performance analysis and optimization suggestions
- **coding-task-with-mcp**: Guide for completing a coding task using MCP tools and best practices

Each prompt returns actionable, structured feedback for your code.

---

## When to Use Code Feedback MCP

- After generating or editing code (especially LLM-generated code)
- Before code review or CI to catch issues early
- To automate code quality checks in multi-language projects
- For continuous feedback in editor integrations or bots
- To standardize code review and analysis across teams

---

## Best Practices

- Always validate code with MCP tools after editing or generating code
- Use build and test tools to ensure your code works as expected
- Use prompts for in-depth review, analysis, and improvement suggestions
- Manage dependencies proactively to keep your project clean and up to date
- Reuse existing code and abstractions where possible
- Write modular, generic code to maximize reusability
- Avoid code duplication and hardcoding
- Document the integration and usage of MCP clearly
- Test thoroughly using MCP tools and prompts

---

## Contributing

We welcome contributions! To add a new tool or prompt:

- Fork the repo and create a feature branch
- Add your tool in `src/tools/` or prompt in `src/prompts/`
- Write tests in `tests/`
- Run `npm run lint` and `npm run test`
- Open a pull request with a clear description

---

## Troubleshooting & FAQ

- Ensure all required tools are installed and in your PATH
- Use `npm run test` to verify your setup
- For permission issues, check script/file permissions and environment
- If you see "Path not allowed", update `MCP_ALLOWED_PATHS` in your config
- For more help, see the code and examples in the repo

---

## License

[MIT](LICENSE) (or specify your license here)

---

For more, see the code, configuration, and examples in this repository.
