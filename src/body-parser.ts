import * as http from 'node:http';
import { Buffer } from 'node:buffer';
import { MiddlewareFn } from './middleware.js';
import { NodeDepRequest } from './router.js';
import { createHttpError } from './error-handlers.js';

export interface BodyParserOptions {
  /** Maximum body size in bytes (default: 1MB = 1048576) */
  limit?: number;
}

/**
 * Reads the entire incoming request stream as a Buffer.
 */
export function readBody(req: http.IncomingMessage, limit = 1024 * 1024): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytesRead = 0;

    req.on('data', (chunk: Buffer) => {
      bytesRead += chunk.length;
      if (bytesRead > limit) {
        req.destroy();
        return reject(createHttpError(413, 'Payload Too Large'));
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', (err: Error) => {
      reject(err);
    });
  });
}

/**
 * JSON body parser middleware.
 * Replaces: body-parser.json()
 * Uses only: Node.js Buffer and JSON.parse.
 */
export function json(options: BodyParserOptions = {}): MiddlewareFn {
  const limit = options.limit ?? 1024 * 1024; // 1MB default

  return async (req, _res, next) => {
    const customReq = req as NodeDepRequest;
    if (customReq.body !== undefined) {
      return next();
    }

    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      return next();
    }

    try {
      const buffer = await readBody(req, limit);
      customReq.rawBody = buffer;
      const text = buffer.toString('utf-8').trim();

      if (text.length === 0) {
        customReq.body = {};
        return next();
      }

      customReq.body = JSON.parse(text);
      next();
    } catch (err: unknown) {
      if (err instanceof Error) {
        next(err);
      } else {
        next(createHttpError(400, 'Invalid JSON payload'));
      }
    }
  };
}

/**
 * URL-encoded form body parser middleware.
 * Replaces: body-parser.urlencoded()
 * Uses only: Node.js Buffer and URLSearchParams.
 */
export function urlencoded(options: BodyParserOptions = {}): MiddlewareFn {
  const limit = options.limit ?? 1024 * 1024; // 1MB default

  return async (req, _res, next) => {
    const customReq = req as NodeDepRequest;
    if (customReq.body !== undefined) {
      return next();
    }

    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('application/x-www-form-urlencoded')) {
      return next();
    }

    try {
      const buffer = await readBody(req, limit);
      customReq.rawBody = buffer;
      const text = buffer.toString('utf-8');

      const searchParams = new URLSearchParams(text);
      const parsedBody: Record<string, string> = {};
      for (const [key, value] of searchParams.entries()) {
        parsedBody[key] = value;
      }

      customReq.body = parsedBody;
      next();
    } catch (err: unknown) {
      if (err instanceof Error) {
        next(err);
      } else {
        next(createHttpError(400, 'Invalid form payload'));
      }
    }
  };
}
