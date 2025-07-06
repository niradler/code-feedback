import { z } from 'zod';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import Config from '../config/index.js';

const fsOpSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('delete'),
        path: z.string(),
    }),
    z.object({
        type: z.literal('createFile'),
        path: z.string(),
        content: z.string().optional(),
    }),
    z.object({
        type: z.literal('createFolder'),
        path: z.string(),
    }),
    z.object({
        type: z.literal('move'),
        source: z.string(),
        destination: z.string(),
    }),
    z.object({
        type: z.literal('copy'),
        source: z.string(),
        destination: z.string(),
    }),
]);

export const editor_filesystem = {
    name: 'editor_filesystem',
    description: 'Multi-file/folder CRUD: delete multiple files/folders, create multiple files/folders, move/copy files/folders, create nested folders. No file content editing.',
    inputSchema: {
        type: 'object',
        properties: {
            ops: { type: 'array', items: fsOpSchema, description: 'Array of file/folder operations' },
        },
        required: ['ops']
    },
    async run(args: any) {
        const { ops } = args;
        try {
            for (const op of ops) {
                if (op.type === 'delete') {
                    if (!Config.getInstance().isPathAllowed(op.path)) continue;
                    await fs.rm(op.path, { recursive: true, force: true });
                } else if (op.type === 'createFile') {
                    if (!Config.getInstance().isPathAllowed(op.path)) continue;
                    await fs.mkdir(dirname(op.path), { recursive: true });
                    await fs.writeFile(op.path, op.content || '');
                } else if (op.type === 'createFolder') {
                    if (!Config.getInstance().isPathAllowed(op.path)) continue;
                    await fs.mkdir(op.path, { recursive: true });
                } else if (op.type === 'move') {
                    if (!Config.getInstance().isPathAllowed(op.source) || !Config.getInstance().isPathAllowed(op.destination)) continue;
                    await fs.mkdir(dirname(op.destination), { recursive: true });
                    await fs.rename(op.source, op.destination);
                } else if (op.type === 'copy') {
                    if (!Config.getInstance().isPathAllowed(op.source) || !Config.getInstance().isPathAllowed(op.destination)) continue;
                    await fs.mkdir(dirname(op.destination), { recursive: true });
                    await fs.copyFile(op.source, op.destination);
                }
            }
            return { success: true, errors: [], warnings: [], output: 'Filesystem operations completed' };
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)], warnings: [], output: '' };
        }
    },
}; 