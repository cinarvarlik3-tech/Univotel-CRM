/**
 * Reads the raw HTTP request body as a UTF-8 string.
 * Required for HMAC verification before JSON.parse (Cloudflare Workers compatible).
 */
import type { NextApiRequest } from 'next';

/**
 * Consumes the request stream and returns the full body string.
 * @param req - Next.js API request with bodyParser disabled.
 * @returns Raw request body.
 */
export async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });
    req.on('end', () => resolve());
    req.on('error', reject);
  });

  if (chunks.length === 0 && typeof req.body === 'string') {
    return req.body;
  }

  return Buffer.concat(chunks).toString('utf8');
}
