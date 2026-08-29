import * as http from 'node:http';
import { MiddlewareFn } from './middleware.js';
import { NodeDepRequest } from './router.js';

/**
 * Parses query parameters from req.url and populates req.query.
 * Replaces: express / qs / querystring packages.
 * Uses only: Node.js standard URL / URLSearchParams APIs.
 */
export function queryParser(): MiddlewareFn {
  return (req, _res, next) => {
    parseQuery(req);
    next();
  };
}

/**
 * Helper to extract query parameters directly from an IncomingMessage.
 */
export function parseQuery(req: http.IncomingMessage): Record<string, string> {
  const customReq = req as NodeDepRequest;
  if (customReq.query) {
    return customReq.query;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const query: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    query[key] = value;
  }

  customReq.query = query;
  return query;
}
