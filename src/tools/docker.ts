import { z } from 'zod';
import { runCommand } from '../utils/command.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

const dockerInputSchema = z.object({
    command: z.enum(['ps', 'run', 'stop', 'rm', 'rmi', 'inspect']),
    args: z.array(z.string()).optional(),
});

type DockerInput = z.infer<typeof dockerInputSchema>;

async function isContainerRunning(containerId: string): Promise<boolean> {
    const result = await runCommand(`docker inspect -f '{{.State.Running}}' ${containerId}`);
    return result.stdout.trim() === 'true';
}

export const dockerTool = {
    name: 'docker',
    description: 'Run Docker commands (build, run, stop, etc.) in a project directory.',
    inputSchema: zodToJsonSchema(dockerInputSchema),
    async run(args: unknown) {
        const parseResult = dockerInputSchema.safeParse(args);
        if (!parseResult.success) {
            return { success: false, errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')}: ${e.message}`), warnings: [], output: '' };
        }
        const { command, args: dockerArgs = [] }: DockerInput = parseResult.data;
        let dockerCmd = 'docker';
        const errors: string[] = [];
        if (command === 'rm' && dockerArgs.length > 0) {
            for (const containerId of dockerArgs) {
                if (await isContainerRunning(containerId)) {
                    errors.push(`Refusing to delete running container: ${containerId}`);
                }
            }
            if (errors.length > 0) {
                return { success: false, errors, warnings: [], output: '' };
            }
        }
        if (command === 'ps') {
            dockerCmd += ' ps ' + dockerArgs.join(' ') + ' --format json';
        } else if (command === 'inspect') {
            dockerCmd += ' inspect ' + dockerArgs.join(' ') + ' --format json';
        } else if (command === 'run') {
            dockerCmd += ' run ' + dockerArgs.join(' ');
        } else if (command === 'stop') {
            dockerCmd += ' stop ' + dockerArgs.join(' ');
        } else if (command === 'rm') {
            dockerCmd += ' rm ' + dockerArgs.join(' ');
        } else if (command === 'rmi') {
            dockerCmd += ' rmi ' + dockerArgs.join(' ');
        }
        try {
            const result = await runCommand(dockerCmd);
            return { success: result.exitCode === 0, errors: result.stderr ? [result.stderr] : [], warnings: [], output: result.stdout };
        } catch (error: any) {
            return { success: false, errors: [error.message || String(error)], warnings: [], output: '' };
        }
    },
};
