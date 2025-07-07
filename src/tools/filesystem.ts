import { z } from 'zod';
import { promises as fs } from 'fs';
import { dirname, resolve, isAbsolute, join } from 'path';
import Config from '../config/index.js';
import { randomBytes } from 'crypto';
import { minimatch } from 'minimatch';
import { zodToJsonSchema } from 'zod-to-json-schema';

// --- Secure Path Validation ---
async function validatePath(p: string): Promise<string> {
    if (!Config.getInstance().isPathAllowed(p)) {
        throw new Error(`Access denied: path not allowed (${p})`);
    }
    const abs = isAbsolute(p) ? resolve(p) : resolve(process.cwd(), p);
    try {
        const real = await fs.realpath(abs);
        if (!Config.getInstance().isPathAllowed(real)) {
            throw new Error(`Access denied: real path not allowed (${real})`);
        }
        return real;
    } catch (e: any) {
        if (e.code === 'ENOENT') {
            // For new files, check parent dir
            const parent = dirname(abs);
            const realParent = await fs.realpath(parent);
            if (!Config.getInstance().isPathAllowed(realParent)) {
                throw new Error(`Access denied: parent dir not allowed (${realParent})`);
            }
            return abs;
        }
        throw e;
    }
}

// --- Forgiving LLM misspellings ---
function normalizeOpType(type: string): string {
    const action = type.toLowerCase();
    if (action.includes('read')) return 'readFile';
    if (action.includes('file') && action.includes('info')) return 'getFileInfo';
    if (action.includes('list') && action.includes('size')) return 'listDirectoryWithSizes';
    if (action.includes('list')) return 'listDirectory';
    if (action.includes('tree')) return 'directoryTree';
    if (action.includes('copy')) return 'copy';
    if (action.includes('move')) return 'move';
    if (action.includes('delete') || action.includes('remove') || action.includes('rm')) return 'delete';
    if (action.includes('create') && action.includes('file')) return 'createFile';
    if (action.includes('create') && (action.includes('dir') || action.includes('folder'))) return 'createDirectory';
    return type;
}

// --- Zod Schemas ---
const fsOpSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('delete'),
        path: z.string().describe('Path or glob pattern to file/folder to delete.'),
    }),
    z.object({
        type: z.literal('createFile'),
        path: z.string().describe('Path to file to create.'),
        content: z.string().optional().describe('File content. Defaults to empty.'),
    }),
    z.object({
        type: z.literal('createDirectory'),
        path: z.string().describe('Path to directory to create.'),
    }),
    z.object({
        type: z.literal('move'),
        source: z.string().describe('Source file/folder path.'),
        destination: z.string().describe('Destination file/folder path.'),
    }),
    z.object({
        type: z.literal('copy'),
        source: z.string().describe('Source file/folder path.'),
        destination: z.string().describe('Destination file/folder path.'),
    }),
    z.object({
        type: z.literal('readFile'),
        path: z.string().describe('Path to file to read.'),
        encoding: z.string().optional().describe('File encoding, default utf-8.'),
    }),
    z.object({
        type: z.literal('listDirectory'),
        path: z.string().describe('Path to directory to list. Lists both files and directories, each prefixed with [FILE] or [DIR].'),
    }),
    z.object({
        type: z.literal('listDirectoryWithSizes'),
        path: z.string().describe('Path to directory to list with sizes.'),
    }),
    z.object({
        type: z.literal('directoryTree'),
        path: z.string().describe('Path to directory to get tree view.'),
        maxDepth: z.number().optional().describe('Max recursion depth.'),
    }),
    z.object({
        type: z.literal('getFileInfo'),
        path: z.string().describe('Path to file or directory to stat.'),
    }),
]);

const inputSchema = z.object({
    ops: z.array(fsOpSchema).describe('Array of file/folder operations to perform.'),
});

// --- Helper functions ---
async function* walk(dir: string, base: string = dir): AsyncGenerator<string> {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        yield fullPath;
        if (entry.isDirectory()) {
            yield* walk(fullPath, base);
        }
    }
}

async function getDirectoryTree(dir: string, maxDepth = 10, depth = 0): Promise<any> {
    if (depth > maxDepth) return null;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return await Promise.all(entries.map(async entry => {
        const entryPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            return {
                name: entry.name,
                type: 'directory',
                children: await getDirectoryTree(entryPath, maxDepth, depth + 1)
            };
        } else {
            return {
                name: entry.name,
                type: 'file'
            };
        }
    }));
}

async function getFileInfo(path: string) {
    const stats = await fs.stat(path);
    return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        permissions: stats.mode.toString(8).slice(-3),
    };
}

// --- Main Tool ---
export const filesystem = {
    name: 'filesystem',
    description: `Secure, LLM-friendly multi-file/folder CRUD and query tool for the filesystem.\n
**Features:**\n- Batch delete, create, move, copy, read, stat, search, and directory tree operations.\n- All paths are validated against allowed directories and checked for symlink attacks.\n- File creation uses atomic write (temp file + rename) for safety.\n- Pattern/glob support for batch operations (delete, search).\n- Forgives common LLM misspellings (e.g., str_read → readFile, include → readFile).\n- Returns a detailed result for each operation.\n- Schema is self-describing and exported as JSON schema.\n\n**listDirectory**: Lists both files and directories in the specified path, each entry prefixed with [FILE] or [DIR].\n\n**Examples:**\n\nDelete all .log files in logs:\n{\n  "ops": [ { "type": "delete", "path": "logs/*.log" } ]\n}\n\nRead a file:\n{\n  "ops": [ { "type": "readFile", "path": "README.md" } ]\n}\n\nMove a file:\n{\n  "ops": [ { "type": "move", "source": "foo.txt", "destination": "bar.txt" } ]\n}\n\nList directory with sizes:\n{\n  "ops": [ { "type": "listDirectoryWithSizes", "path": "." } ]\n}\n\nGet directory tree:\n{\n  "ops": [ { "type": "directoryTree", "path": ".", "maxDepth": 2 } ]\n}\n`,
    inputSchema: zodToJsonSchema(inputSchema),
    async run(args: any) {
        const { ops } = args;
        const results: any[] = [];
        for (const opRaw of ops) {
            const op = { ...opRaw, type: normalizeOpType(opRaw.type) };
            const result: any = { type: op.type, input: opRaw, success: false };
            try {
                if (op.type === 'delete') {
                    // Support glob delete
                    const base = dirname(op.path);
                    const pattern = op.path;
                    let deleted = 0;
                    for await (const file of walk(base)) {
                        if (minimatch(file, pattern, { matchBase: true })) {
                            const path = await validatePath(file);
                            await fs.rm(path, { recursive: true, force: true });
                            deleted++;
                        }
                    }
                    result.success = true;
                    result.message = `Deleted ${deleted} files/folders matching ${pattern}`;
                } else if (op.type === 'createFile') {
                    const path = await validatePath(op.path);
                    await fs.mkdir(dirname(path), { recursive: true });
                    const tempPath = `${path}.${randomBytes(8).toString('hex')}.tmp`;
                    await fs.writeFile(tempPath, op.content || '', 'utf-8');
                    await fs.rename(tempPath, path);
                    result.success = true;
                    result.message = `Created file ${path}`;
                } else if (op.type === 'createDirectory') {
                    const path = await validatePath(op.path);
                    await fs.mkdir(path, { recursive: true });
                    result.success = true;
                    result.message = `Created directory ${path}`;
                } else if (op.type === 'move') {
                    const src = await validatePath(op.source);
                    const dst = await validatePath(op.destination);
                    await fs.mkdir(dirname(dst), { recursive: true });
                    await fs.rename(src, dst);
                    result.success = true;
                    result.message = `Moved ${src} to ${dst}`;
                } else if (op.type === 'copy') {
                    const src = await validatePath(op.source);
                    const dst = await validatePath(op.destination);
                    await fs.mkdir(dirname(dst), { recursive: true });
                    await fs.copyFile(src, dst);
                    result.success = true;
                    result.message = `Copied ${src} to ${dst}`;
                } else if (op.type === 'readFile') {
                    const path = await validatePath(op.path);
                    const encoding = op.encoding || 'utf-8';
                    const content = await fs.readFile(path, encoding);
                    result.success = true;
                    result.message = `Read file ${path}`;
                    result.output = content;
                } else if (op.type === 'listDirectory') {
                    const path = await validatePath(op.path);
                    const entries = await fs.readdir(path, { withFileTypes: true });
                    result.success = true;
                    result.output = entries.map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n');
                } else if (op.type === 'listDirectoryWithSizes') {
                    const path = await validatePath(op.path);
                    const entries = await fs.readdir(path, { withFileTypes: true });
                    const detailed = await Promise.all(entries.map(async e => {
                        const entryPath = join(path, e.name);
                        const stats = await fs.stat(entryPath);
                        return {
                            name: e.name,
                            isDirectory: e.isDirectory(),
                            size: stats.size,
                            mtime: stats.mtime
                        };
                    }));
                    result.success = true;
                    result.output = detailed.map(e => `${e.isDirectory ? '[DIR]' : '[FILE]'} ${e.name.padEnd(30)} ${e.isDirectory ? '' : e.size}`).join('\n');
                } else if (op.type === 'directoryTree') {
                    const path = await validatePath(op.path);
                    const maxDepth = op.maxDepth || 10;
                    const tree = await getDirectoryTree(path, maxDepth);
                    result.success = true;
                    result.output = JSON.stringify(tree, null, 2);
                } else if (op.type === 'getFileInfo') {
                    const path = await validatePath(op.path);
                    const info = await getFileInfo(path);
                    result.success = true;
                    result.output = info;
                } else {
                    throw new Error(`Unknown operation type: ${op.type}`);
                }
            } catch (e: any) {
                result.success = false;
                result.error = e.message || String(e);
            }
            results.push(result);
        }
        return {
            success: results.every(r => r.success),
            results,
            output: results.map(r => r.message || r.error).join('\n'),
        };
    },
}; 