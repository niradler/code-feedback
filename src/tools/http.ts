import { z } from 'zod';
import axios from 'axios';
import { zodToJsonSchema } from 'zod-to-json-schema';

const httpInputSchema = z.object({
    url: z.string(),
    method: z.string().optional(),
    headers: z.record(z.string()).optional(),
    data: z.string().optional(),
    timeout: z.number().default(30000),
});

type HttpInput = z.infer<typeof httpInputSchema>;

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

export const httpTool = {
    name: 'http',
    description: 'Make HTTP requests (GET, POST, etc.) and return the response.',
    inputSchema: zodToJsonSchema(httpInputSchema),
    async run(args: unknown) {
        const parseResult = httpInputSchema.safeParse(args);
        if (!parseResult.success) {
            return { success: false, errors: parseResult.error.errors.map(e => `Validation error: ${e.path.join('.')} - ${e.message}`), warnings: [], output: '' };
        }
        const { url, method = 'GET', headers = {}, data, timeout }: HttpInput = parseResult.data;
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
        try {
            const response = await axios({
                url,
                method,
                headers,
                data,
                timeout,
                validateStatus: () => true
            });
            return {
                success: response.status >= 200 && response.status < 300,
                errors: response.status >= 400 ? [`HTTP error: ${response.status}`] : [],
                warnings: [],
                output: typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
            };
        } catch (error: any) {
            return { success: false, errors: [error.message], warnings: [], output: '' };
        }
    },
};