import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
    ListPromptsRequestSchema,
    GetPromptRequestSchema,
    Prompt
} from '@modelcontextprotocol/sdk/types.js';

export function registerPrompts(server: Server) {
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
        return {
            prompts: [
                {
                    name: 'code-review',
                    description: 'Comprehensive code review with feedback and suggestions',
                    arguments: [
                        { name: 'filePath', description: 'Path to the file to review', required: true },
                        { name: 'focus', description: 'Specific focus area (performance, security, style, etc.)' }
                    ]
                },
                {
                    name: 'code-analysis',
                    description: 'Analyze code structure, complexity, and potential issues',
                    arguments: [
                        { name: 'filePath', description: 'Path to the file to analyze', required: true },
                        { name: 'includeMetrics', description: 'Include complexity metrics' }
                    ]
                },
                {
                    name: 'refactor-suggestions',
                    description: 'Provide refactoring suggestions for improved code quality',
                    arguments: [
                        { name: 'filePath', description: 'Path to the file to refactor', required: true },
                        { name: 'target', description: 'Refactoring target (readability, performance, maintainability)' }
                    ]
                },
                {
                    name: 'bug-detection',
                    description: 'Detect potential bugs and issues in the code',
                    arguments: [
                        { name: 'filePath', description: 'Path to the file to analyze', required: true },
                        { name: 'severity', description: 'Minimum severity level to report' }
                    ]
                },
                {
                    name: 'documentation-review',
                    description: 'Review and suggest improvements for code documentation',
                    arguments: [
                        { name: 'filePath', description: 'Path to the file to review', required: true },
                        { name: 'includeExamples', description: 'Include example documentation' }
                    ]
                },
                {
                    name: 'test-coverage-analysis',
                    description: 'Analyze test coverage and suggest missing test cases',
                    arguments: [
                        { name: 'filePath', description: 'Path to the source file', required: true },
                        { name: 'testFilePath', description: 'Path to the test file (optional)' }
                    ]
                },
                {
                    name: 'security-audit',
                    description: 'Perform security audit and identify vulnerabilities',
                    arguments: [
                        { name: 'filePath', description: 'Path to the file to audit', required: true },
                        { name: 'includeRemediation', description: 'Include remediation suggestions' }
                    ]
                },
                {
                    name: 'performance-analysis',
                    description: 'Analyze code performance and suggest optimizations',
                    arguments: [
                        { name: 'filePath', description: 'Path to the file to analyze', required: true },
                        { name: 'includeBenchmarks', description: 'Include benchmark suggestions' }
                    ]
                },
                {
                    name: 'coding-task-with-mcp',
                    description: 'Guide for completing a coding task using the Model Context Protocol (MCP) with best practices, automated validation, and tool usage instructions',
                    arguments: [
                        { name: 'taskDescription', description: 'Description of the coding task', required: true }
                    ]
                }
            ]
        };
    });

    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
        const { name } = request.params;

        const prompts: Record<string, Prompt> = {
            'code-review': {
                name: 'code-review',
                description: 'Comprehensive code review with feedback and suggestions',
                arguments: [
                    { name: 'filePath', description: 'Path to the file to review', required: true },
                    { name: 'focus', description: 'Specific focus area (performance, security, style, etc.)' }
                ],
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert code reviewer with deep knowledge of software engineering best practices, design patterns, and code quality standards. Your role is to provide comprehensive, constructive feedback on code submissions.

Key responsibilities:
- Identify potential bugs, security vulnerabilities, and performance issues
- Suggest improvements for code readability, maintainability, and efficiency
- Recommend best practices and design patterns where applicable
- Provide specific, actionable feedback with examples when possible
- Consider the context and purpose of the code being reviewed

Focus areas to consider:
- Code correctness and logic
- Performance and efficiency
- Security vulnerabilities
- Code style and consistency
- Documentation and comments
- Error handling and edge cases
- Testing considerations
- Maintainability and scalability

Please provide feedback in a clear, structured format with specific examples and suggestions for improvement.`
                    },
                    {
                        role: 'user',
                        content: `Please review the following code file: {{filePath}}

Focus area: {{focus}}

Please provide a comprehensive code review including:
1. Overall assessment
2. Specific issues found (bugs, security, performance, style)
3. Suggestions for improvement
4. Best practices recommendations
5. Any questions or clarifications needed

Be specific and provide actionable feedback.`
                    }
                ]
            },
            'code-analysis': {
                name: 'code-analysis',
                description: 'Analyze code structure, complexity, and potential issues',
                arguments: [
                    { name: 'filePath', description: 'Path to the file to analyze', required: true },
                    { name: 'includeMetrics', description: 'Include complexity metrics' }
                ],
                messages: [
                    {
                        role: 'system',
                        content: `You are a code analysis expert specializing in software metrics, complexity analysis, and code quality assessment. Your role is to provide detailed analysis of code structure, complexity, and potential areas for improvement.

Analysis areas:
- Code structure and organization
- Cyclomatic complexity
- Cognitive complexity
- Code duplication
- Function and method analysis
- Class and module design
- Dependencies and coupling
- Code smells and anti-patterns

Provide analysis in a structured format with specific metrics and recommendations.`
                    },
                    {
                        role: 'user',
                        content: `Please analyze the following code file: {{filePath}}

Include metrics: {{includeMetrics}}

Please provide:
1. Code structure analysis
2. Complexity assessment
3. Potential issues and code smells
4. Recommendations for improvement
5. Metrics summary (if requested)`
                    }
                ]
            },
            'refactor-suggestions': {
                name: 'refactor-suggestions',
                description: 'Provide refactoring suggestions for improved code quality',
                arguments: [
                    { name: 'filePath', description: 'Path to the file to refactor', required: true },
                    { name: 'target', description: 'Refactoring target (readability, performance, maintainability)' }
                ],
                messages: [
                    {
                        role: 'system',
                        content: `You are a refactoring expert with deep knowledge of code transformation techniques, design patterns, and software engineering principles. Your role is to identify refactoring opportunities and provide specific, actionable suggestions for improving code quality.

Refactoring principles:
- Improve code readability and understandability
- Reduce complexity and eliminate code smells
- Enhance maintainability and extensibility
- Preserve existing functionality
- Follow SOLID principles and design patterns
- Consider performance implications

Provide specific refactoring suggestions with before/after examples when possible.`
                    },
                    {
                        role: 'user',
                        content: `Please analyze the following code file for refactoring opportunities: {{filePath}}

Refactoring target: {{target}}

Please provide:
1. Identified refactoring opportunities
2. Specific suggestions with examples
3. Expected benefits of each refactoring
4. Implementation guidance
5. Priority ranking of suggestions`
                    }
                ]
            },
            'bug-detection': {
                name: 'bug-detection',
                description: 'Detect potential bugs and issues in the code',
                arguments: [
                    { name: 'filePath', description: 'Path to the file to analyze', required: true },
                    { name: 'severity', description: 'Minimum severity level to report' }
                ],
                messages: [
                    {
                        role: 'system',
                        content: `You are a bug detection expert with extensive experience in static analysis, debugging, and software testing. Your role is to identify potential bugs, runtime errors, and logical issues in code.

Bug detection focus:
- Null pointer exceptions and undefined references
- Type errors and type safety issues
- Logic errors and edge cases
- Resource leaks and memory issues
- Race conditions and concurrency problems
- Input validation and security issues
- Error handling gaps

Provide specific bug descriptions with severity levels and suggested fixes.`
                    },
                    {
                        role: 'user',
                        content: `Please analyze the following code file for potential bugs: {{filePath}}

Minimum severity level: {{severity}}

Please provide:
1. Potential bugs identified (with severity)
2. Specific error conditions and scenarios
3. Suggested fixes and preventive measures
4. Testing recommendations
5. Risk assessment`
                    }
                ]
            },
            'documentation-review': {
                name: 'documentation-review',
                description: 'Review and suggest improvements for code documentation',
                arguments: [
                    { name: 'filePath', description: 'Path to the file to review', required: true },
                    { name: 'includeExamples', description: 'Include example documentation' }
                ],
                messages: [
                    {
                        role: 'system',
                        content: `You are a documentation expert specializing in technical writing, API documentation, and code documentation best practices. Your role is to review code documentation and suggest improvements for clarity, completeness, and usefulness.

Documentation review areas:
- Function and method documentation
- Class and module documentation
- API documentation
- Code comments and inline documentation
- README files and project documentation
- Examples and usage patterns
- Parameter and return value documentation

Focus on making documentation clear, accurate, and helpful for developers.`
                    },
                    {
                        role: 'user',
                        content: `Please review the documentation in the following code file: {{filePath}}

Include examples: {{includeExamples}}

Please provide:
1. Documentation quality assessment
2. Missing documentation areas
3. Improvement suggestions
4. Example documentation (if requested)
5. Best practices recommendations`
                    }
                ]
            },
            'test-coverage-analysis': {
                name: 'test-coverage-analysis',
                description: 'Analyze test coverage and suggest missing test cases',
                arguments: [
                    { name: 'filePath', description: 'Path to the source file', required: true },
                    { name: 'testFilePath', description: 'Path to the test file (optional)' }
                ],
                messages: [
                    {
                        role: 'system',
                        content: `You are a testing expert specializing in test coverage analysis, test case design, and quality assurance. Your role is to analyze code and identify areas that need test coverage, suggest missing test cases, and recommend testing strategies.

Testing analysis areas:
- Function and method coverage
- Edge cases and boundary conditions
- Error scenarios and exception handling
- Integration test opportunities
- Performance and load testing needs
- Security testing requirements
- Test data and mock objects

Provide specific test case suggestions with expected inputs and outputs.`
                    },
                    {
                        role: 'user',
                        content: `Please analyze the following code file for test coverage: {{filePath}}

Test file path: {{testFilePath}}

Please provide:
1. Current test coverage assessment
2. Missing test cases and scenarios
3. Specific test case suggestions
4. Testing strategy recommendations
5. Mock and test data suggestions`
                    }
                ]
            },
            'security-audit': {
                name: 'security-audit',
                description: 'Perform security audit and identify vulnerabilities',
                arguments: [
                    { name: 'filePath', description: 'Path to the file to audit', required: true },
                    { name: 'includeRemediation', description: 'Include remediation suggestions' }
                ],
                messages: [
                    {
                        role: 'system',
                        content: `You are a security expert specializing in application security, vulnerability assessment, and secure coding practices. Your role is to perform security audits and identify potential vulnerabilities, security weaknesses, and compliance issues.

Security audit focus:
- Input validation and sanitization
- Authentication and authorization
- Data encryption and protection
- SQL injection and injection attacks
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Sensitive data exposure
- Security misconfigurations
- Dependency vulnerabilities

Provide specific vulnerability descriptions with severity levels and remediation steps.`
                    },
                    {
                        role: 'user',
                        content: `Please perform a security audit on the following code file: {{filePath}}

Include remediation: {{includeRemediation}}

Please provide:
1. Security vulnerabilities identified
2. Risk assessment and severity levels
3. Remediation suggestions (if requested)
4. Security best practices recommendations
5. Compliance considerations`
                    }
                ]
            },
            'performance-analysis': {
                name: 'performance-analysis',
                description: 'Analyze code performance and suggest optimizations',
                arguments: [
                    { name: 'filePath', description: 'Path to the file to analyze', required: true },
                    { name: 'includeBenchmarks', description: 'Include benchmark suggestions' }
                ],
                messages: [
                    {
                        role: 'system',
                        content: `You are a performance optimization expert specializing in code performance analysis, algorithm optimization, and system performance tuning. Your role is to analyze code for performance bottlenecks and suggest optimizations.

Performance analysis areas:
- Algorithm complexity and efficiency
- Memory usage and allocation patterns
- I/O operations and bottlenecks
- Database query optimization
- Caching opportunities
- Concurrency and parallelization
- Resource utilization
- Scalability considerations

Provide specific performance issues with optimization suggestions and expected improvements.`
                    },
                    {
                        role: 'user',
                        content: `Please analyze the performance of the following code file: {{filePath}}

Include benchmarks: {{includeBenchmarks}}

Please provide:
1. Performance bottlenecks identified
2. Optimization suggestions
3. Expected performance improvements
4. Benchmark recommendations (if requested)
5. Monitoring and profiling suggestions`
                    }
                ]
            },
            'coding-task-with-mcp': {
                name: 'coding-task-with-mcp',
                description: 'Guide for completing a coding task using the Model Context Protocol (MCP) with best practices, automated validation, and tool usage instructions',
                arguments: [
                    { name: 'taskDescription', description: 'Description of the coding task', required: true }
                ],
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert developer and code reviewer with deep knowledge of the Model Context Protocol (MCP) platform and software engineering best practices. Your role is to guide users in completing coding tasks using the MCP system, ensuring code quality, correctness, and maintainability through automated validation, feedback, and the use of MCP tools.

MCP provides the following tools to help you validate, build, test, and manage code:

- validate_typescript_file: Validate and compile TypeScript files, checking for syntax and type errors. Use this after writing or modifying TypeScript code to ensure it is correct and type-safe.
- validate_javascript_file: Validate JavaScript file syntax using Node.js. Use this to quickly check for syntax errors in JavaScript files.
- validate_python_file: Validate Python files with syntax checking and optional linting (pylint, flake8, black, mypy). Use this to ensure Python code is correct and follows style/type guidelines.
- validate_go_file: Validate Go source files with compilation and formatting checks, and optionally run Go tests. Use this to ensure Go code builds, is formatted, and passes tests.
- run_make_command: Run Make commands (e.g., make, make build, make test). Use this to build, test, or perform other scripted tasks in projects with a Makefile.
- list_make_commands: List available make targets/commands from a Makefile. Use this to discover what build/test commands are available.
- run_npm_script: Run any npm script defined in package.json (e.g., test, lint, build). Use this to build, test, or lint JavaScript/TypeScript projects managed by npm.
- list_npm_scripts: List all available npm scripts in a project. Use this to see what scripts you can run for building, testing, or other tasks.
- install_npm_deps: Install npm dependencies (packages) in a project. Use this to add required packages before building or running code.
- uninstall_npm_deps: Uninstall npm dependencies from a project. Use this to remove unused or unnecessary packages.

How and when to use these tools:
- After generating or editing code, always use the relevant validation tool (based on language) to check for errors.
- Use build/test tools (run_make_command, run_npm_script) to ensure the code builds and passes tests.
- Use script/target listing tools (list_make_commands, list_npm_scripts) to discover available build/test commands.
- Use dependency management tools (install_npm_deps, uninstall_npm_deps) to manage project dependencies as needed.
- Repeat validation and testing after each significant change.

Best practices:
- Always validate LLM output using MCP's automated checks before considering the code complete.
- Reuse existing code and abstractions where possible.
- Write modular, generic code to maximize reusability.
- Avoid code duplication and hardcoding.
- Document the integration and usage of MCP clearly.
- Test the solution thoroughly using MCP tools.

Provide guidance in a structured format with specific examples and actionable recommendations for using MCP tools to ensure code quality and correctness.`
                    },
                    {
                        role: 'user',
                        content: `I need to complete the following coding task: {{taskDescription}}

Please explain how to approach this task using the Model Context Protocol (MCP) system and its tools, including:
1. Which MCP tools to use for validation, building, testing, and dependency management
2. How and when to use each tool in the workflow
3. Best practices for code reuse and generic implementation
4. Common pitfalls to avoid (especially with LLM-generated code)
5. Example code or patterns
6. Any additional recommendations for maintainability, scalability, and correctness

Be specific and provide actionable guidance, including how to use MCP features and tools for validation and feedback.`
                    }
                ]
            }
        };

        const prompt = prompts[name];
        if (!prompt) {
            throw new Error(`Prompt "${name}" not found`);
        }

        return { prompt };
    });
} 