import { resolve } from 'path';

// Get allowed paths from environment or use sensible defaults
const getAllowedPathsFromEnv = (): string[] => {
  const envPaths = process.env.MCP_ALLOWED_PATHS;

  if (envPaths) {
    return envPaths.split(',').map(path => path.trim()).filter(path => path.length > 0);
  }

  return [];
};

const allowedPaths = getAllowedPathsFromEnv();

/**
 * Check if a given path is within the allowed directories
 */
export function isPathAllowed(targetPath: string): boolean {
  if (!targetPath) {
    return false;
  }

  try {
    const absTarget = resolve(targetPath);

    // Check against each allowed path
    const isAllowed = allowedPaths.some(basePath => {
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
      console.error(`[MCP] Allowed paths: ${allowedPaths.map(p => resolve(p)).join(', ')}`);
    }

    return isAllowed;
  } catch (error) {
    console.error(`[MCP] Error checking path permissions for ${targetPath}:`, error);
    return false;
  }
}

/**
 * Get the list of allowed paths
 */
export function getAllowedPaths(): string[] {
  return allowedPaths.slice();
}

/**
 * Get the resolved allowed paths for debugging
 */
export function getResolvedAllowedPaths(): string[] {
  return allowedPaths.map(path => {
    try {
      return resolve(path);
    } catch (error) {
      console.error(`[MCP] Error resolving path ${path}:`, error);
      return path;
    }
  });
} 