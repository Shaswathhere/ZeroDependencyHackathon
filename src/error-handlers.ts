import * as http from 'node:http';
import { MiddlewareFn, ErrorMiddlewareFn } from './middleware.js';

/**
 * Built-in 404 handler middleware.
 * Register this last via app.use() so it only fires when no route matched.
 * Replaces: express's default 404 behaviour.
 */
export const notFoundHandler: MiddlewareFn = (
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  _next
) => {
  if (res.writableEnded) return; // already responded
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: 'Not Found', status: 404 }));
};

/**
 * Built-in global error handler middleware (4-argument signature).
 * Register this last via app.use() — Express convention.
 * Replaces: express's default error handler.
 */
export const errorHandler: ErrorMiddlewareFn = (
  err: Error,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  _next
) => {
  if (res.writableEnded) return;

  const status = (err as NodeDepError).status ?? 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[NoDep Error] ${req.method ?? ''} ${req.url ?? ''} — ${status}: ${message}`);

  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: message, status }));
};

/**
 * Helper to create an error with an HTTP status code attached.
 * Usage: throw createHttpError(403, 'Forbidden');
 */
export function createHttpError(status: number, message: string): NodeDepError {
  const err = new Error(message) as NodeDepError;
  err.status = status;
  return err;
}

export interface NodeDepError extends Error {
  status?: number;
}
