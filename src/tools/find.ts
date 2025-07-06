import { spawn } from 'child_process';
import { platform } from 'os';

export const find = {
    name: 'find',
    description: 'Search files/folders using ripgrep (rg) with regex patterns. Supports pattern, case sensitivity, file globs, context lines, and more. Respects .gitignore.',
    inputSchema: {
        type: 'object',
        properties: {
            pattern: { type: 'string', description: 'Regex pattern to search for' },
            path: { type: 'string', description: 'Directory or file path to search in', optional: true },
            caseSensitive: { type: 'boolean', description: 'Case sensitive search', optional: true },
            glob: { type: 'string', description: 'File glob to include', optional: true },
            context: { type: 'number', description: 'Number of context lines', optional: true },
            maxCount: { type: 'number', description: 'Maximum number of results', optional: true },
            additionalArgs: { type: 'array', items: { type: 'string' }, description: 'Additional ripgrep arguments', optional: true },
        },
        required: ['pattern']
    },
    async run(args: any) {
        const { pattern, path = '.', caseSensitive, glob, context, maxCount, additionalArgs } = args;
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
        rgArgs.push(pattern);
        rgArgs.push(path);
        return new Promise((resolve) => {
            const proc = spawn('rg', rgArgs);
            let output = '';
            let error = '';
            proc.stdout.on('data', (data) => { output += data.toString(); });
            proc.stderr.on('data', (data) => { error += data.toString(); });
            proc.on('close', (code) => {
                if (code === 0 || (code === 1 && output)) {
                    resolve({ success: true, errors: [], warnings: [], output });
                } else {
                    resolve({ success: false, errors: [error || 'ripgrep failed'], warnings: [], output });
                }
            });
        });
    },
}; 