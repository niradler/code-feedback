import { resolve } from 'path';

class Config {
    private static instance: Config;
    private allowedPaths: string[];

    private constructor() {
        this.allowedPaths = this.getAllowedPathsFromEnv();
    }

    public static getInstance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }
        return Config.instance;
    }

    private getAllowedPathsFromEnv(): string[] {
        const envPaths = process.env.MCP_ALLOWED_PATHS;
        if (envPaths) {
            return envPaths.split(',').map(path => path.trim()).filter(path => path.length > 0);
        }
        return [];
    }

    public isPathAllowed(targetPath: string): boolean {
        if (!targetPath) {
            return false;
        }
        try {
            const absTarget = resolve(targetPath);
            const isAllowed = this.allowedPaths.some(basePath => {
                try {
                    const absBase = resolve(basePath);
                    return absTarget.startsWith(absBase);
                } catch (error) {
                    console.error(`[MCP] Error resolving base path ${basePath}:`, error);
                    return false;
                }
            });
            if (!isAllowed) {
                console.error(`[MCP] Path access denied: ${absTarget}`);
                console.error(`[MCP] Allowed paths: ${this.allowedPaths.map(p => resolve(p)).join(', ')}`);
            }
            return isAllowed;
        } catch (error) {
            console.error(`[MCP] Error checking path permissions for ${targetPath}:`, error);
            return false;
        }
    }

    public addAllowedPaths(paths: string[]): void {
        this.allowedPaths.push(...paths);
    }

    public getAllowedPaths(): string[] {
        return this.allowedPaths.slice();
    }

    public getResolvedAllowedPaths(): string[] {
        return this.allowedPaths.map(path => {
            try {
                return resolve(path);
            } catch (error) {
                console.error(`[MCP] Error resolving path ${path}:`, error);
                return path;
            }
        });
    }
}

export default Config;