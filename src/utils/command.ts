import { exec } from 'child_process';
import { promisify } from 'util';

/**
 * Enhanced command execution utility with proper error handling
 */
export function runCommand(
  command: string,
  options: {
    cwd?: string;
    timeout?: number;
    env?: Record<string, string>;
    maxBuffer?: number;
  } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number; duration: number }> {
  const {
    cwd = process.cwd(),
    timeout = 30000,
    env = {},
    maxBuffer = 1024 * 1024 // 1MB default
  } = options;

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    console.error(`[MCP] Executing command: ${command}`);
    console.error(`[MCP] Working directory: ${cwd}`);

    const child = exec(
      command,
      {
        cwd,
        timeout,
        maxBuffer,
        env: { ...process.env, ...env }
      },
      (error, stdout, stderr) => {
        const duration = Date.now() - startTime;

        console.error(`[MCP] Command completed in ${duration}ms`);

        // Even if there's an error, we want to capture the output
        const result = {
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: error ? (error as any).code || 1 : 0,
          duration,
        };

        if (error) {
          console.error(`[MCP] Command failed with exit code ${result.exitCode}:`, error.message);
          if (stderr) {
            console.error(`[MCP] Command stderr:`, stderr);
          }
        }

        resolve(result);
      }
    );

    // Handle other types of errors (spawn errors, etc.)
    child.on('error', (error) => {
      const duration = Date.now() - startTime;
      console.error(`[MCP] Command spawn error:`, error);

      reject({
        error,
        stdout: '',
        stderr: error.message,
        exitCode: 1,
        duration,
      });
    });

    // Handle timeout
    child.on('exit', (code, signal) => {
      if (signal === 'SIGTERM') {
        console.error(`[MCP] Command timed out after ${timeout}ms`);
      }
    });
  });
}

/**
 * Simple command execution for basic tasks
 */
export const execAsync = promisify(exec);

/**
 * Check if a command exists in the system PATH
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    const testCommand = process.platform === 'win32'
      ? `where ${command}`
      : `which ${command}`;

    const result = await runCommand(testCommand, { timeout: 5000 });
    return result.exitCode === 0;
  } catch {
    return false;
  }
} 