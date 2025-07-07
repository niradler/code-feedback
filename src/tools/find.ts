import { spawn } from 'child_process';
import { platform } from 'os';
import { statSync } from 'fs';
import { dirname, resolve } from 'path';

export const find = {
    name: 'find',
    description: `Powerful file and text search using ripgrep (rg). Supports advanced regex patterns, file globs, context lines, and more. Respects .gitignore. 

Use cases:
- Find all usages of a function or variable in a codebase
- Search for TODO or FIXME comments across all source files
- Locate files matching a pattern (e.g., '*.test.js')
- Extract code snippets with context for review or LLM input

Examples:
- Find all 'TODO' comments in .js files:
  { pattern: 'TODO', glob: '*.js' }
- Search for 'myFunction' in the 'src' directory, case-insensitive, with 2 lines of context:
  { pattern: 'myFunction', path: 'src', caseSensitive: false, context: 2 }
- Get results as structured JSON for LLM processing:
  { pattern: 'error', outputMode: 'json' }

Defaults:
- maxCount: 100 (limits results to avoid overwhelming output)
- outputMode: 'json' (returns structured output for easy parsing)
- path: '.' (searches current directory)
- Ignores common dependency folders (node_modules, site-packages, .venv, dist, build, etc.) by default

See ripgrep documentation for advanced pattern syntax and options.`,
    inputSchema: {
        type: 'object',
        properties: {
            pattern: { type: 'string', description: 'Regex pattern to search for' },
            path: { type: 'string', description: 'Directory or file path to search in. Defaults to current directory (".")', optional: true, default: '.' },
            caseSensitive: { type: 'boolean', description: 'Case sensitive search. Defaults to true.', optional: true, default: true },
            glob: { type: 'string', description: 'File glob to include (e.g., "*.js"). Only files matching this glob will be searched.', optional: true },
            context: { type: 'number', description: 'Number of context lines to include before/after each match. Defaults to 0.', optional: true, default: 0 },
            maxCount: { type: 'number', description: 'Maximum number of results to return. Defaults to 100.', optional: true, default: 100 },
            additionalArgs: { type: 'array', items: { type: 'string' }, description: 'Additional ripgrep arguments (advanced usage).', optional: true },
            outputMode: { type: 'string', enum: ['text', 'json'], description: 'Output mode: "json" (default, structured output) or "text" (raw ripgrep output).', optional: true, default: 'json' },
        },
        required: ['pattern']
    },
    async run(args: any) {
        const { pattern, path = '.', caseSensitive, glob, context, maxCount, additionalArgs, outputMode = 'text' } = args;
        // Check if rg is installed
        function checkRgInstalled() {
            return new Promise((resolve) => {
                const proc = spawn('rg', ['--version']);
                proc.on('exit', (code) => resolve(code === 0));
                proc.on('error', () => resolve(false));
            });
        }
        async function installRg() {
            if (platform() === 'win32') {
                return new Promise((resolve, reject) => {
                    const proc = spawn('scoop', ['install', 'ripgrep']);
                    proc.on('exit', (code) => code === 0 ? resolve(true) : reject(new Error('Failed to install ripgrep')));
                    proc.on('error', reject);
                });
            } else {
                return new Promise((resolve, reject) => {
                    const proc = spawn('brew', ['install', 'ripgrep']);
                    proc.on('exit', (code) => code === 0 ? resolve(true) : reject(new Error('Failed to install ripgrep')));
                    proc.on('error', reject);
                });
            }
        }
        if (!(await checkRgInstalled())) {
            await installRg();
        }
        const rgArgs: string[] = [];
        if (caseSensitive === false) rgArgs.push('-i');
        if (glob) rgArgs.push('-g', glob);
        if (context) rgArgs.push('-C', String(context));
        if (maxCount) rgArgs.push('-m', String(maxCount));
        if (additionalArgs) rgArgs.push(...additionalArgs);
        if (outputMode === 'json') rgArgs.push('--json');

        // By default, ignore common dependency folders unless user overrides
        const defaultIgnores = [
            'node_modules', 'site-packages', '.venv', 'venv', 'dist', 'build', '.mypy_cache', '.pytest_cache', '.tox', '.eggs', '.git', '.hg', '.svn', '.idea', '.vscode'
        ];
        const hasUserGlob = !!glob;
        const hasUserIncludeDeps = additionalArgs && additionalArgs.some((arg: string) => /node_modules|site-packages|venv|dist|build/.test(arg));
        if (!hasUserGlob && !hasUserIncludeDeps) {
            for (const folder of defaultIgnores) {
                rgArgs.push('--ignore-file');
                rgArgs.push(`!${folder}/`);
                rgArgs.push('-g');
                rgArgs.push(`!${folder}/**`);
            }
        }

        let spawnCwd = process.cwd();
        let searchTarget = '.';
        try {
            const stat = statSync(path);
            if (stat.isDirectory()) {
                spawnCwd = resolve(path);
                searchTarget = '.';
            } else if (stat.isFile()) {
                spawnCwd = dirname(resolve(path));
                searchTarget = resolve(path);
            }
        } catch {
            // fallback: treat as directory
            spawnCwd = resolve(path);
            searchTarget = '.';
        }
        rgArgs.push(pattern);
        rgArgs.push(searchTarget);
        return new Promise((resolve) => {
            const proc = spawn('rg', rgArgs, { cwd: spawnCwd });
            let output = '';
            let error = '';
            proc.stdout.on('data', (data) => { output += data.toString(); });
            proc.stderr.on('data', (data) => { error += data.toString(); });
            proc.on('close', (code) => {
                if (code === 0 || (code === 1 && output)) {
                    if (outputMode === 'json') {
                        // ripgrep outputs one JSON object per line
                        const lines = output.split('\n').filter(Boolean);
                        const jsonResults = lines.map(line => {
                            try { return JSON.parse(line); } catch { return null; }
                        }).filter(Boolean);
                        resolve({ success: true, errors: [], warnings: [], output: jsonResults });
                    } else {
                        resolve({ success: true, errors: [], warnings: [], output });
                    }
                } else {
                    resolve({ success: false, errors: [error || 'ripgrep failed'], warnings: [], output });
                }
            });
        });
    },
}; 