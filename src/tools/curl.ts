import { z } from 'zod';
import { runCommand } from '../utils/command.js';
import { URL } from 'url';

const curlInputSchema = z.object({
    url: z.string(),
    method: z.string().optional(),
    headers: z.record(z.string()).optional(),
    data: z.string().optional(),
    timeout: z.number().default(30000),
});

type CurlInput = z.infer<typeof curlInputSchema>;

function isLocalhostOrLocalIp(hostname: string): boolean {
    if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.endsWith('.localhost') ||
        hostname.includes('localhost:')
    ) {
        return true;
    }
    const ipv4 = /^127\.(?:[0-9]{1,3}\.){2}[0-9]{1,3}$/;
    const ipv6 = /^::1$/;
    const localRange = /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./;
    if (ipv4.test(hostname) || ipv6.test(hostname) || localRange.test(hostname)) {
        return true;
    }
    return false;
}

export const curlTool = {
    name: 'curl',
    description: 'Make HTTP requests to localhost or local IPs using curl',
    inputSchema: {
        type: 'object',
        properties: {
            url: { type: 'string', description: 'The URL to request (must be localhost or local IP)' },
            method: { type: 'string', description: 'HTTP method (default: GET)' },
            headers: { type: 'object', additionalProperties: { type: 'string' }, description: 'Request headers' },
            data: { type: 'string', description: 'Request body (for POST/PUT)' },
            timeout: { type: 'number', description: 'Timeout in milliseconds (default: 30000)', default: 30000 }
        },
        required: ['url']
    },
    async run(args: unknown) {
        const parseResult = curlInputSchema.safeParse(args);
        if (!parseResult.success) {
            return { success: false, errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')} - ${e.message}`), warnings: [], output: '' };
        }
        const { url, method = 'GET', headers = {}, data, timeout }: CurlInput = parseResult.data;
        let hostname = '';
        try {
            const parsed = new URL(url);
            hostname = parsed.hostname;
        } catch {
            return { success: false, errors: ['Invalid URL'], warnings: [], output: '' };
        }
        if (!isLocalhostOrLocalIp(hostname)) {
            return { success: false, errors: ['Only localhost and local IPs are allowed'], warnings: [], output: '' };
        }
        let curlCmd = `curl -X ${method} --max-time ${Math.ceil(timeout / 1000)} --silent --show-error`;
        for (const [key, value] of Object.entries(headers)) {
            curlCmd += ` -H "${key}: ${value}"`;
        }
        if (data) {
            curlCmd += ` --data "${data.replace(/"/g, '\\"')}"`;
        }
        curlCmd += ` "${url}"`;
        try {
            const result = await runCommand(curlCmd, { timeout });
            return { success: result.exitCode === 0, errors: result.stderr ? [result.stderr] : [], warnings: [], output: result.stdout };
        } catch (error: unknown) {
            return { success: false, errors: [error instanceof Error ? error.message : String(error)], warnings: [], output: '' };
        }
    },
};