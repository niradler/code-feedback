import { z } from 'zod';
import { promises as fs } from 'fs';
import Config from '../config/index.js';
import * as diffLib from 'diff';
import { zodToJsonSchema } from 'zod-to-json-schema';

const editActionSchema = z.discriminatedUnion('mode', [
    z.object({
        mode: z.literal('line'),
        type: z.enum(['replace', 'add', 'remove', 'replaceAll']),
        start: z.number().optional(),
        end: z.number().optional(),
        content: z.string().optional(),
    }),
    z.object({
        mode: z.literal('content'),
        oldText: z.string(),
        newText: z.string(),
    })
]);

function normalizeLineEndings(str: string) {
    return str.replace(/\r\n|\r/g, '\n');
}

function createUnifiedDiff(oldStr: string, newStr: string, filePath: string) {
    return diffLib.createPatch(filePath, oldStr, newStr, '', '');
}

async function applyUnifiedEdits(
    filePath: string,
    edits: Array<any>
): Promise<string> {
    const content = normalizeLineEndings(await fs.readFile(filePath, 'utf-8'));
    let lines = content.split('\n');
    let modifiedContent = content;
    for (const edit of edits) {
        if (edit.mode === 'content') {
            const normalizedOld = normalizeLineEndings(edit.oldText);
            const normalizedNew = normalizeLineEndings(edit.newText);
            if (modifiedContent.includes(normalizedOld)) {
                modifiedContent = modifiedContent.replace(normalizedOld, normalizedNew);
                continue;
            }
            const oldLines = normalizedOld.split('\n');
            const contentLines = modifiedContent.split('\n');
            let matchFound = false;
            for (let i = 0; i <= contentLines.length - oldLines.length; i++) {
                const potentialMatch = contentLines.slice(i, i + oldLines.length);
                const isMatch = oldLines.every((oldLine, j) => {
                    const contentLine = potentialMatch[j];
                    if (typeof contentLine === 'undefined') return false;
                    return oldLine.trim() === contentLine.trim();
                });
                if (isMatch) {
                    const originalIndent = ((contentLines[i] ?? '').match(/^\s*/)?.[0]) || '';
                    const newLines = normalizedNew.split('\n').map((line, j) => {
                        if (j === 0) return originalIndent + line.trimStart();
                        const oldIndent = typeof oldLines[j] === 'string' ? oldLines[j].match(/^\s*/)?.[0] || '' : '';
                        const newIndent = line.match(/^\s*/)?.[0] || '';
                        if (oldIndent && newIndent) {
                            const relativeIndent = newIndent.length - oldIndent.length;
                            return originalIndent + ' '.repeat(Math.max(0, relativeIndent)) + line.trimStart();
                        }
                        return line;
                    });
                    contentLines.splice(i, oldLines.length, ...newLines);
                    modifiedContent = contentLines.join('\n');
                    matchFound = true;
                    break;
                }
            }
            if (!matchFound) {
                throw new Error(`Could not find exact match for edit:\n${edit.oldText}`);
            }
        } else if (edit.mode === 'line') {
            if (!Array.isArray(lines)) lines = modifiedContent.split('\n');
            if (edit.type === 'replace' && edit.start !== undefined && edit.end !== undefined && edit.content !== undefined) {
                lines.splice(edit.start, edit.end - edit.start + 1, ...edit.content.split('\n'));
            } else if (edit.type === 'add' && edit.start !== undefined && edit.content !== undefined) {
                lines.splice(edit.start, 0, ...edit.content.split('\n'));
            } else if (edit.type === 'remove' && edit.start !== undefined && edit.end !== undefined) {
                lines.splice(edit.start, edit.end - edit.start + 1);
            } else if (edit.type === 'replaceAll' && edit.content !== undefined) {
                lines = edit.content.split('\n');
            }
            modifiedContent = lines.join('\n');
        }
    }
    const diff = createUnifiedDiff(content, modifiedContent, filePath);
    return `${'`'.repeat(3)}diff\n${diff}${'`'.repeat(3)}\n\n`;
}

export const editor = {
    name: 'editor',
    description: 'Edit text files with line-based or content-matching edits. By default, each edit is treated as content-matching (mode: "content"), which is robust to line changes. In content mode, each edit replaces exact line sequences (oldText) with new content (newText). Returns a git-style diff showing the changes made. Only works within allowed directories. To use line-number-based edits, set mode: "line" and specify start/end (for replace/remove) or start (for add).',
    inputSchema: zodToJsonSchema(z.object({
        action: z.enum(['read', 'edit', 'delete', 'create']).describe('Action to perform: "read" to get file content, "create" to create a file, "delete" to remove a file, "edit" to apply edits.'),
        file_path: z.string().describe('Target file path (must be in allowed directories).'),
        edits: z.array(editActionSchema).describe('Array of edits. By default, each edit is treated as content-matching (mode: "content"). In content mode, each edit replaces exact line sequences (oldText) with new content (newText). Returns a git-style diff showing the changes made. For line-number-based edits, set mode: "line" and use type, start, end, content. For add, use start as the insertion index.').optional(),
        content: z.string().describe('Content to create file (for create action).').optional(),
    }).required({ action: true, file_path: true })),
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
                case 'edit': {
                    if (!Array.isArray(edits)) return { success: false, errors: ['Missing edits array'], warnings: [], output: '' };
                    // Default to mode: 'content' if not specified
                    const normalizedEdits = edits.map((edit: any) => {
                        if (!edit.mode) {
                            if (typeof edit.oldText === 'string' && typeof edit.newText === 'string') {
                                return { ...edit, mode: 'content' };
                            }
                            return { ...edit, mode: 'line' };
                        }
                        return edit;
                    });
                    const diff = await applyUnifiedEdits(file_path, normalizedEdits);
                    await fs.writeFile(file_path, normalizeLineEndings((await fs.readFile(file_path, 'utf-8')).split('\n').join('\n')));
                    return { success: true, errors: [], warnings: [], output: diff };
                }
                default:
                    return { success: false, errors: ['Unknown action'], warnings: [], output: '' };
            }
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)], warnings: [], output: '' };
        }
    },
};

