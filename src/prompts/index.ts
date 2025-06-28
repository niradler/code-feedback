import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
    ListPromptsRequestSchema,
    GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

// Prompt metadata (name, description, arguments)
const prompts = [
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
];

// Prompt handlers that generate messages
const promptHandlers: Record<string, (args: any) => { messages: any[] }> = {
    'code-review': ({ filePath, focus }) => ({
        messages: [
            {
                role: 'system',
                content: `You are an expert code reviewer with deep knowledge of software engineering best practices, design patterns, and code quality standards. Your role is to provide comprehensive, constructive feedback on code submissions.\n\nKey responsibilities:\n- Identify potential bugs, security vulnerabilities, and performance issues\n- Suggest improvements for code readability, maintainability, and efficiency\n- Recommend best practices and design patterns where applicable\n- Provide specific, actionable feedback with examples when possible\n- Consider the context and purpose of the code being reviewed\n\nFocus areas to consider:\n- Code correctness and logic\n- Performance and efficiency\n- Security vulnerabilities\n- Code style and consistency\n- Documentation and comments\n- Error handling and edge cases\n- Testing considerations\n- Maintainability and scalability\n\nPlease provide feedback in a clear, structured format with specific examples and suggestions for improvement.`
            },
            {
                role: 'user',
                content: `Please review the following code file: ${filePath}\n\nFocus area: ${focus}\n\nPlease provide a comprehensive code review including:\n1. Overall assessment\n2. Specific issues found (bugs, security, performance, style)\n3. Suggestions for improvement\n4. Best practices recommendations\n5. Any questions or clarifications needed\n\nBe specific and provide actionable feedback.`
            }
        ]
    }),
    'code-analysis': ({ filePath, includeMetrics }) => ({
        messages: [
            {
                role: 'system',
                content: `You are a code analysis expert specializing in software metrics, complexity analysis, and code quality assessment. Your role is to provide detailed analysis of code structure, complexity, and potential areas for improvement.\n\nAnalysis areas:\n- Code structure and organization\n- Cyclomatic complexity\n- Cognitive complexity\n- Code duplication\n- Function and method analysis\n- Class and module design\n- Dependencies and coupling\n- Code smells and anti-patterns\n\nProvide analysis in a structured format with specific metrics and recommendations.`
            },
            {
                role: 'user',
                content: `Please analyze the following code file: ${filePath}\n\nInclude metrics: ${includeMetrics}\n\nPlease provide:\n1. Code structure analysis\n2. Complexity assessment\n3. Potential issues and code smells\n4. Recommendations for improvement\n5. Metrics summary (if requested)`
            }
        ]
    }),
    'refactor-suggestions': ({ filePath, target }) => ({
        messages: [
            {
                role: 'system',
                content: `You are a refactoring expert with deep knowledge of code transformation techniques, design patterns, and software engineering principles. Your role is to identify refactoring opportunities and provide specific, actionable suggestions for improving code quality.\n\nRefactoring principles:\n- Improve code readability and understandability\n- Reduce complexity and eliminate code smells\n- Enhance maintainability and extensibility\n- Preserve existing functionality\n- Follow SOLID principles and design patterns\n- Consider performance implications\n\nProvide specific refactoring suggestions with before/after examples when possible.`
            },
            {
                role: 'user',
                content: `Please analyze the following code file for refactoring opportunities: ${filePath}\n\nRefactoring target: ${target}\n\nPlease provide:\n1. Identified refactoring opportunities\n2. Specific suggestions with examples\n3. Expected benefits of each refactoring\n4. Implementation guidance\n5. Priority ranking of suggestions`
            }
        ]
    }),
    'bug-detection': ({ filePath, severity }) => ({
        messages: [
            {
                role: 'system',
                content: `You are a bug detection expert with extensive experience in static analysis, debugging, and software testing. Your role is to identify potential bugs, runtime errors, and logical issues in code.\n\nBug detection focus:\n- Null pointer exceptions and undefined references\n- Type errors and type safety issues\n- Logic errors and edge cases\n- Resource leaks and memory issues\n- Race conditions and concurrency problems\n- Input validation and security issues\n- Error handling gaps\n\nProvide specific bug descriptions with severity levels and suggested fixes.`
            },
            {
                role: 'user',
                content: `Please analyze the following code file for potential bugs: ${filePath}\n\nMinimum severity level: ${severity}\n\nPlease provide:\n1. Potential bugs identified (with severity)\n2. Specific error conditions and scenarios\n3. Suggested fixes and preventive measures\n4. Testing recommendations\n5. Risk assessment`
            }
        ]
    }),
    'documentation-review': ({ filePath, includeExamples }) => ({
        messages: [
            {
                role: 'system',
                content: `You are a documentation expert specializing in technical writing, API documentation, and code documentation best practices. Your role is to review code documentation and suggest improvements for clarity, completeness, and usefulness.\n\nDocumentation review areas:\n- Function and method documentation\n- Class and module documentation\n- API documentation\n- Code comments and inline documentation\n- README files and project documentation\n- Examples and usage patterns\n- Parameter and return value documentation\n\nFocus on making documentation clear, accurate, and helpful for developers.`
            },
            {
                role: 'user',
                content: `Please review the documentation in the following code file: ${filePath}\n\nInclude examples: ${includeExamples}\n\nPlease provide:\n1. Documentation quality assessment\n2. Missing documentation areas\n3. Improvement suggestions\n4. Example documentation (if requested)\n5. Best practices recommendations`
            }
        ]
    }),
    'test-coverage-analysis': ({ filePath, testFilePath }) => ({
        messages: [
            {
                role: 'system',
                content: `You are a testing expert specializing in test coverage analysis, test case design, and quality assurance. Your role is to analyze code and identify areas that need test coverage, suggest missing test cases, and recommend testing strategies.\n\nTesting analysis areas:\n- Function and method coverage\n- Edge cases and boundary conditions\n- Error scenarios and exception handling\n- Integration test opportunities\n- Performance and load testing needs\n- Security testing requirements\n- Test data and mock objects\n\nProvide specific test case suggestions with expected inputs and outputs.`
            },
            {
                role: 'user',
                content: `Please analyze the following code file for test coverage: ${filePath}\n\nTest file path: ${testFilePath}\n\nPlease provide:\n1. Current test coverage assessment\n2. Missing test cases and scenarios\n3. Specific test case suggestions\n4. Testing strategy recommendations\n5. Mock and test data suggestions`
            }
        ]
    }),
    'security-audit': ({ filePath, includeRemediation }) => ({
        messages: [
            {
                role: 'system',
                content: `You are a security expert specializing in application security, vulnerability assessment, and secure coding practices. Your role is to perform security audits and identify potential vulnerabilities, security weaknesses, and compliance issues.\n\nSecurity audit focus:\n- Input validation and sanitization\n- Authentication and authorization\n- Data encryption and protection\n- SQL injection and injection attacks\n- Cross-site scripting (XSS)\n- Cross-site request forgery (CSRF)\n- Sensitive data exposure\n- Security misconfigurations\n- Dependency vulnerabilities\n\nProvide specific vulnerability descriptions with severity levels and remediation steps.`
            },
            {
                role: 'user',
                content: `Please perform a security audit on the following code file: ${filePath}\n\nInclude remediation: ${includeRemediation}\n\nPlease provide:\n1. Security vulnerabilities identified\n2. Risk assessment and severity levels\n3. Remediation suggestions (if requested)\n4. Security best practices recommendations\n5. Compliance considerations`
            }
        ]
    }),
    'performance-analysis': ({ filePath, includeBenchmarks }) => ({
        messages: [
            {
                role: 'system',
                content: `You are a performance optimization expert specializing in code performance analysis, algorithm optimization, and system performance tuning. Your role is to analyze code for performance bottlenecks and suggest optimizations.\n\nPerformance analysis areas:\n- Algorithm complexity and efficiency\n- Memory usage and allocation patterns\n- I/O operations and bottlenecks\n- Database query optimization\n- Caching opportunities\n- Concurrency and parallelization\n- Resource utilization\n- Scalability considerations\n\nProvide specific performance issues with optimization suggestions and expected improvements.`
            },
            {
                role: 'user',
                content: `Please analyze the performance of the following code file: ${filePath}\n\nInclude benchmarks: ${includeBenchmarks}\n\nPlease provide:\n1. Performance bottlenecks identified\n2. Optimization suggestions\n3. Expected performance improvements\n4. Benchmark recommendations (if requested)\n5. Monitoring and profiling suggestions`
            }
        ]
    }),
    'coding-task-with-mcp': ({ taskDescription }) => ({
        messages: [
            {
                role: 'system',
                content: `You are an expert developer and code reviewer with deep knowledge of the Model Context Protocol (MCP) platform and software engineering best practices. Your role is to guide users in completing coding tasks using the MCP system, ensuring code quality, correctness, and maintainability through automated validation, feedback, and the use of MCP tools.\n\nMCP provides the following tools to help you validate, build, test, and manage code:\n\n- validate_typescript_file: Validate and compile TypeScript files, checking for syntax and type errors. Use this after writing or modifying TypeScript code to ensure it is correct and type-safe.\n- validate_javascript_file: Validate JavaScript file syntax using Node.js. Use this to quickly check for syntax errors in JavaScript files.\n- validate_python_file: Validate Python files with syntax checking and optional linting (pylint, flake8, black, mypy). Use this to ensure Python code is correct and follows style/type guidelines.\n- validate_go_file: Validate Go source files with compilation and formatting checks, and optionally run Go tests. Use this to ensure Go code builds, is formatted, and passes tests.\n- run_make_command: Run Make commands (e.g., make, make build, make test). Use this to build, test, or perform other scripted tasks in projects with a Makefile.\n- list_make_commands: List available make targets/commands from a Makefile. Use this to discover what build/test commands are available.\n- run_npm_script: Run any npm script defined in package.json (e.g., test, lint, build). Use this to build, test, or lint JavaScript/TypeScript projects managed by npm.\n- list_npm_scripts: List all available npm scripts in a project. Use this to see what scripts you can run for building, testing, or other tasks.\n- install_npm_deps: Install npm dependencies (packages) in a project. Use this to add required packages before building or running code.\n- uninstall_npm_deps: Uninstall npm dependencies from a project. Use this to remove unused or unnecessary packages.\n\nHow and when to use these tools:\n- After generating or editing code, always use the relevant validation tool (based on language) to check for errors.\n- Use build/test tools (run_make_command, run_npm_script) to ensure the code builds and passes tests.\n- Use script/target listing tools (list_make_commands, list_npm_scripts) to discover available build/test commands.\n- Use dependency management tools (install_npm_deps, uninstall_npm_deps) to manage project dependencies as needed.\n- Repeat validation and testing after each significant change.\n\nBest practices:\n- Always validate LLM output using MCP's automated checks before considering the code complete.\n- Reuse existing code and abstractions where possible.\n- Write modular, generic code to maximize reusability.\n- Avoid code duplication and hardcoding.\n- Document the integration and usage of MCP clearly.\n- Test the solution thoroughly using MCP tools.\n\nProvide guidance in a structured format with specific examples and actionable recommendations for using MCP tools to ensure code quality and correctness.`
            },
            {
                role: 'user',
                content: `I need to complete the following coding task: ${taskDescription}\n\nPlease explain how to approach this task using the Model Context Protocol (MCP) system and its tools, including:\n1. Which MCP tools to use for validation, building, testing, and dependency management\n2. How and when to use each tool in the workflow\n3. Best practices for code reuse and generic implementation\n4. Common pitfalls to avoid (especially with LLM-generated code)\n5. Example code or patterns\n6. Any additional recommendations for maintainability, scalability, and correctness\n\nBe specific and provide actionable guidance, including how to use MCP features and tools for validation and feedback.`
            }
        ]
    })
};

// Transform messages to conform to API schema
function transformMessages(messages: any[]) {
    return messages.map(msg => ({
        ...msg,
        role: msg.role === 'system' ? 'assistant' : msg.role,
        content: typeof msg.content === 'string' ? { type: 'text', text: msg.content } : msg.content
    }));
}

export function registerPrompts(server: Server) {
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
        return {
            prompts
        };
    });

    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const promptHandler = promptHandlers[name];
        if (promptHandler) {
            const rawMessages = promptHandler(args || {}).messages;
            const messages = transformMessages(rawMessages);
            return { messages };
        }
        throw new Error(`Prompt "${name}" not found`);
    });
} 