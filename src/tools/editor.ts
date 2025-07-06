import { z } from 'zod';
import { promises as fs } from 'fs';
import Config from '../config/index.js';

const editActionSchema = z.object({
    type: z.enum(['replace', 'add', 'remove', 'replaceAll']),
    start: z.number().optional(),
    end: z.number().optional(),
    line: z.number().optional(),
    content: z.string().optional(),
});

export const editor = {
    name: 'editor',
    description: 'File editor: full-file CRUD (create, read, update, delete) and multi-line edits via array of edits.',
    inputSchema: {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['read', 'edit', 'delete', 'create'], description: 'Action to perform' },
            file_path: { type: 'string', description: 'Target file path' },
            edits: {
                type: 'array',
                items: editActionSchema,
                description: 'Array of file line edits',
                optional: true
            },
            content: { type: 'string', description: 'Content to create file', optional: true },
        },
        required: ['action', 'file_path']
    },
    async run(args: any) {
        const { action, file_path, edits, content } = args;
        if (!Config.getInstance().isPathAllowed(file_path)) {
            return { success: false, errors: ['Path not allowed'], warnings: [], output: '' };
        }
        try {
            switch (action) {
                case 'read': {
                    const fileContent = await fs.readFile(file_path, 'utf-8');
                    return { success: true, errors: [], warnings: [], output: fileContent };
                }
                case 'create': {
                    if (typeof content !== 'string') {
                        return { success: false, errors: ['Missing content for create'], warnings: [], output: '' };
                    }
                    await fs.writeFile(file_path, content);
                    return { success: true, errors: [], warnings: [], output: 'File created' };
                }
                case 'delete': {
                    await fs.rm(file_path, { force: true });
                    return { success: true, errors: [], warnings: [], output: 'File deleted' };
                }
                case 'update':
                case 'edit': {
                    if (!Array.isArray(edits)) return { success: false, errors: ['Missing edits array'], warnings: [], output: '' };
                    let lines: string[] = [];
                    try {
                        lines = (await fs.readFile(file_path, 'utf-8')).split('\n');
                    } catch (e: any) {
                        if (e.code === 'ENOENT') {
                            lines = [];
                        } else {
                            throw e;
                        }
                    }
                    for (const act of edits) {
                        if (act.type === 'replace' && act.start !== undefined && act.end !== undefined && act.content !== undefined) {
                            lines.splice(act.start, act.end - act.start + 1, ...act.content.split('\n'));
                        } else if (act.type === 'add' && act.line !== undefined && act.content !== undefined) {
                            lines.splice(act.line, 0, ...act.content.split('\n'));
                        } else if (act.type === 'remove' && act.start !== undefined && act.end !== undefined) {
                            lines.splice(act.start, act.end - act.start + 1);
                        } else if (act.type === 'replaceAll' && act.content !== undefined) {
                            lines = act.content.split('\n');
                        }
                    }
                    await fs.writeFile(file_path, lines.join('\n'));
                    return { success: true, errors: [], warnings: [], output: 'Edits applied' };
                }
                default:
                    return { success: false, errors: ['Unknown action'], warnings: [], output: '' };
            }
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)], warnings: [], output: '' };
        }
    },
};

