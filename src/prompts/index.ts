import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
    ListPromptsRequestSchema,
    GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

// Practical, workflow-oriented prompts
const prompts = [
    {
        name: 'find-imports',
        description: 'Find all files that import a specific package using the find tool',
        arguments: [
            { name: 'packageName', description: 'Name of the package to search for in import statements', required: true },
            { name: 'path', description: 'Directory or file path to search in', required: false }
        ]
    },
    {
        name: 'commit-changes',
        description: 'Show git diff and commit all staged changes with a message generated from the diff using the git tool',
        arguments: [
            { name: 'repoPath', description: 'Path to the git repository', required: true }
        ]
    },
    {
        name: 'install-and-audit',
        description: 'Install a new npm dependency and check for vulnerabilities using npm install and npm audit',
        arguments: [
            { name: 'projectPath', description: 'Path to the project directory', required: true },
            { name: 'packageName', description: 'Name of the package to install', required: true },
            { name: 'isDev', description: 'Install as dev dependency', required: false }
        ]
    },
    {
        name: 'format-python-directory',
        description: 'Format all Python files in a directory using the python tool (black)',
        arguments: [
            { name: 'directory', description: 'Directory containing Python files', required: true }
        ]
    },
    {
        name: 'build-and-test',
        description: 'Build and test the project using make or npm tools',
        arguments: [
            { name: 'projectPath', description: 'Path to the project directory', required: true },
            { name: 'buildTool', description: 'Tool to use: make or npm', required: true }
        ]
    },
    {
        name: 'list-docker-containers',
        description: 'List all running Docker containers using the docker tool',
        arguments: []
    },
    {
        name: 'validate-typescript-file',
        description: 'Validate a TypeScript file for syntax and type errors',
        arguments: [
            { name: 'filePath', description: 'Path to the TypeScript file', required: true }
        ]
    }
];

// Prompt handlers for each tool
const promptHandlers: Record<string, (args: any) => { messages: any[] }> = {
    'find-imports': ({ packageName, path }) => ({
        messages: [
            {
                role: 'system',
                content: `To find all files that import the package '${packageName}', use the find tool with a regex pattern like "import.*${packageName}" or "require(['"']${packageName}['"'])". This helps you locate all usages before refactoring or upgrading.`
            },
            {
                role: 'user',
                content: `Find all files importing '${packageName}' in path: ${path || '.'}`
            }
        ]
    }),
    'commit-changes': ({ repoPath }) => ({
        messages: [
            {
                role: 'system',
                content: `To commit changes, first use the git tool to show the diff of staged changes (git diff --cached). Review the diff and write a concise, descriptive commit message summarizing the changes. Then call git commit with the generated message. Do not use a generic message; base the message on the actual changes.`
            },
            {
                role: 'user',
                content: `Show staged changes and generate a commit message for repo: ${repoPath}. Then commit all staged changes with that message.`
            }
        ]
    }),
    'install-and-audit': ({ projectPath, packageName, isDev }) => ({
        messages: [
            {
                role: 'system',
                content: `To add a new dependency and check for vulnerabilities, use npm install to add '${packageName}' (with --save-dev if dev), then run npm audit to check for security issues.`
            },
            {
                role: 'user',
                content: `Install package: ${packageName}\nProject: ${projectPath}\nDev: ${isDev ? 'yes' : 'no'}\nThen run npm audit.`
            }
        ]
    }),
    'format-python-directory': ({ directory }) => ({
        messages: [
            {
                role: 'system',
                content: `To format all Python files in a directory, use the python tool with the 'black' linter and fix=true for each .py file in the directory.`
            },
            {
                role: 'user',
                content: `Format all Python files in directory: ${directory}`
            }
        ]
    }),
    'build-and-test': ({ projectPath, buildTool }) => ({
        messages: [
            {
                role: 'system',
                content: `To build and test the project, use the appropriate tool: 'make' (run 'make build' and 'make test') or 'npm' (run 'npm run build' and 'npm test').`
            },
            {
                role: 'user',
                content: `Build and test project at: ${projectPath}\nTool: ${buildTool}`
            }
        ]
    }),
    'list-docker-containers': () => ({
        messages: [
            {
                role: 'system',
                content: `To list all running Docker containers, use the docker tool with the 'ps' command.`
            },
            {
                role: 'user',
                content: `List all running Docker containers.`
            }
        ]
    }),
    'validate-typescript-file': ({ filePath }) => ({
        messages: [
            {
                role: 'system',
                content: `To validate a TypeScript file, use the typescript tool to check for syntax and type errors before merging or deploying.`
            },
            {
                role: 'user',
                content: `Validate TypeScript file: ${filePath}`
            }
        ]
    })
};

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