import { typescriptTool } from './typescript.js';
import { javascriptTool } from './javascript.js';
import { pythonTool } from './python.js';
import { goTool } from './go.js';
import { makeTool, listMakeCommandsTool } from './make.js';
import { npmTool, listNpmScriptsTool, installNpmDepsTool, uninstallNpmDepsTool } from './npm.js';
import { gitTool } from './git.js';
import { uvInitTool, uvAddTool, uvRunTool, uvLockTool, uvSyncTool, uvVenvTool } from './uv.js';
import { curlTool } from './curl.js';
import { dockerTool } from './docker.js';
import { editorTool } from './editor.js';

export const allTools = [
    typescriptTool,
    javascriptTool,
    pythonTool,
    goTool,
    makeTool,
    listMakeCommandsTool,
    npmTool,
    listNpmScriptsTool,
    installNpmDepsTool,
    uninstallNpmDepsTool,
    gitTool,
    uvInitTool,
    uvAddTool,
    uvRunTool,
    uvLockTool,
    uvSyncTool,
    uvVenvTool,
    curlTool,
    dockerTool,
    editorTool,
];

export function registerTools(server: { registerTool: (tool: any) => void }) {
    for (const tool of allTools) {
        server.registerTool(tool);
    }
}

export { listNpmScriptsTool } from './npm.js'; 