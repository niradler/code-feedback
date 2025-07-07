import { typescriptTool } from './typescript.js';
import { javascriptTool } from './javascript.js';
import { pythonTool } from './python.js';
import { goTool } from './go.js';
import { makeTool, listMakeCommandsTool } from './make.js';
import { npmTool, listNpmScriptsTool, checkNpmDependencyTool } from './npm.js';
import { gitTool } from './git.js';
import { uvInitTool, uvAddTool, uvRunTool, uvLockTool, uvSyncTool, uvVenvTool } from './uv.js';
import { httpTool } from './http.js';
import { dockerTool } from './docker.js';
import { editor } from './editor.js';
import { filesystem } from './filesystem.js';
import { find } from './find.js';

export const allTools = [
    typescriptTool,
    javascriptTool,
    pythonTool,
    goTool,
    makeTool,
    listMakeCommandsTool,
    npmTool,
    listNpmScriptsTool,
    checkNpmDependencyTool,
    gitTool,
    uvInitTool,
    uvAddTool,
    uvRunTool,
    uvLockTool,
    uvSyncTool,
    uvVenvTool,
    httpTool,
    dockerTool,
    editor,
    filesystem,
    find,
];

export function registerTools(server: { registerTool: (tool: any) => void }) {
    for (const tool of allTools) {
        server.registerTool(tool);
    }
}

export { listNpmScriptsTool } from './npm.js';
export { checkNpmDependencyTool } from './npm.js';
export { npmTool } from './npm.js'; 