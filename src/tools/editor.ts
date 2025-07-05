import { z } from 'zod';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import Config from '../config/index.js';
import ignore from 'ignore';

// Helper: Recursively list files/folders up to 8 levels, .gitignore-aware
async function listFiles(dir: string, ig: ReturnType<typeof ignore>, level = 0, maxLevel = 8): Promise<any[]> {
    if (level > maxLevel) return [];
    const entries: any[] = [];
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
        const fullPath = join(dir, dirent.name);
        const relPath = fullPath.replace(resolve(dir) + '/', '');
        if (ig.ignores(relPath)) continue;
        if (dirent.isDirectory()) {
            entries.push({ type: 'dir', name: dirent.name, path: fullPath, children: await listFiles(fullPath, ig, level + 1, maxLevel) });
        } else {
            entries.push({ type: 'file', name: dirent.name, path: fullPath });
        }
    }
    return entries;
}

const editOpSchema = z.object({
    filePath: z.string(),
    ops: z.array(z.object({
        type: z.enum(['replace', 'add', 'remove']),
        start: z.number().optional(),
        end: z.number().optional(),
        line: z.number().optional(),
        content: z.string().optional(),
    }))
});

export const editorTool = {
    name: 'editor',
    description: 'File system editor: list, read, edit, copy, move, remove files/folders, .gitignore-aware, multi-file, line-based ops',
    inputSchema: {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['list', 'read', 'edit', 'copy', 'move', 'remove'], description: 'Action to perform' },
            target: { type: 'string', description: 'Target file or directory path' },
            destination: { type: 'string', description: 'Destination path (for copy/move)', optional: true },
            edits: { type: 'array', items: editOpSchema, description: 'Array of file edit operations', optional: true },
        },
        required: ['action', 'target']
    },
    async run(args: any) {
        const { action, target, destination, edits } = args;
        if (!Config.getInstance().isPathAllowed(target)) {
            return { success: false, errors: ['Path not allowed'], warnings: [], output: '' };
        }
        try {
            switch (action) {
                case 'list': {
                    // .gitignore-aware listing
                    const gitignorePath = join(target, '.gitignore');
                    let ig = ignore();
                    try {
                        const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
                        ig = ignore().add(gitignoreContent);
                    } catch { /* ignore missing .gitignore */ }
                    const files = await listFiles(target, ig);
                    return { success: true, errors: [], warnings: [], output: files };
                }
                case 'read': {
                    const content = await fs.readFile(target, 'utf-8');
                    return { success: true, errors: [], warnings: [], output: content };
                }
                case 'edit': {
                    if (!Array.isArray(edits)) return { success: false, errors: ['Missing edits array'], warnings: [], output: '' };
                    for (const edit of edits) {
                        if (!Config.getInstance().isPathAllowed(edit.filePath)) {
                            return { success: false, errors: [`Edit path not allowed: ${edit.filePath}`], warnings: [], output: '' };
                        }
                        const lines = (await fs.readFile(edit.filePath, 'utf-8')).split('\n');
                        for (const op of edit.ops) {
                            if (op.type === 'replace' && op.start !== undefined && op.end !== undefined && op.content !== undefined) {
                                lines.splice(op.start, op.end - op.start + 1, ...op.content.split('\n'));
                            } else if (op.type === 'add' && op.line !== undefined && op.content !== undefined) {
                                lines.splice(op.line, 0, ...op.content.split('\n'));
                            } else if (op.type === 'remove' && op.start !== undefined && op.end !== undefined) {
                                lines.splice(op.start, op.end - op.start + 1);
                            }
                        }
                        await fs.writeFile(edit.filePath, lines.join('\n'));
                    }
                    return { success: true, errors: [], warnings: [], output: 'Edits applied' };
                }
                case 'copy': {
                    if (!destination || !Config.getInstance().isPathAllowed(destination)) {
                        return { success: false, errors: ['Destination path not allowed'], warnings: [], output: '' };
                    }
                    await fs.copyFile(target, destination);
                    return { success: true, errors: [], warnings: [], output: 'File copied' };
                }
                case 'move': {
                    if (!destination || !Config.getInstance().isPathAllowed(destination)) {
                        return { success: false, errors: ['Destination path not allowed'], warnings: [], output: '' };
                    }
                    await fs.rename(target, destination);
                    return { success: true, errors: [], warnings: [], output: 'File moved' };
                }
                case 'remove': {
                    await fs.rm(target, { recursive: true, force: true });
                    return { success: true, errors: [], warnings: [], output: 'Removed' };
                }
                default:
                    return { success: false, errors: ['Unknown action'], warnings: [], output: '' };
            }
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)], warnings: [], output: '' };
        }
    },
};
