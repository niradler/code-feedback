# Code Feedback MCP Server

A Model Context Protocol (MCP) server for LLM-driven, multi-language code feedback. Validate, lint, build, and analyze code across TypeScript, JavaScript, Python, Go, and major build systems (npm, Make, and more).

## Features

- Multi-language file validation, linting, and formatting
- Project-level build/test integration (npm, Make, Gradle, Maven, Cargo, .NET)
- Custom command execution with environment control
- Cross-platform: Windows, macOS, Linux
- Secure, path-restricted file and command access
- Structured, LLM-friendly JSON responses

## Supported Languages & Build Systems

- **Languages:** TypeScript, JavaScript, Python, Go
- **Build Tools:** npm/yarn, Make

## Installation

```bash
npm install
npm run build
```

## Usage

Start the server:

```bash
npm start
```

Or run with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector ./dist/start-server.js
```

## Available Tools (API)

- `validate_typescript_file`, `validate_javascript_file`, `validate_python_file`, `validate_go_file`
- `lint_file` (ESLint for JS/TS)
- `run_make_command`, `run_gradle_command`, `run_maven_command`, `run_cargo_command`, `run_dotnet_command`, `run_npm_script`, `run_custom_command`
- `analyze_code_file` (structure, imports, exports, metrics)

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

## Configuration & Requirements

- Node.js 18+
- Language-specific tools (TypeScript, Python, Go, Rust, Java, .NET, etc.) installed and in PATH
- Project-level configs (tsconfig.json, Makefile, build.gradle, etc.) as needed

## Development

```bash
npm run dev      # Watch mode
npm run lint     # Lint code
npm run test     # Run tests
```

## Troubleshooting

- Ensure all required tools are installed and in PATH
- Use `npm run test` to verify setup
- For permission issues, check script/file permissions and environment

## Contributing

Add new tools in `src/tools/`, write tests, and open a PR.

---

For more, see the code and examples in the repo.
