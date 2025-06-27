import { typescriptTool } from './typescript.js';
import { javascriptTool } from './javascript.js';
import { pythonTool } from './python.js';
import { goTool } from './go.js';
import { makeTool, listMakeCommandsTool } from './make.js';
import { npmTool, listNpmScriptsTool, installNpmDepsTool, uninstallNpmDepsTool } from './npm.js';
import { gitTool } from './git.js';

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
]; 