import * as http from 'node:http';
import { Router, RequestHandler, NodeDepRequest } from './router.js';
import { Handler, composeMiddleware, MiddlewareFn, ErrorMiddlewareFn } from './middleware.js';
import { notFoundHandler, errorHandler, NodeDepError } from './error-handlers.js';
import { enhanceResponse, NodeDepResponse } from './response.js';
import { parseQuery, queryParser } from './query-parser.js';
import { json, urlencoded, readBody, BodyParserOptions } from './body-parser.js';

export class Application {
  private server: http.Server;
  private router: Router;
  /** Global middleware stack — runs before route handlers */
  private stack: Handler<NodeDepRequest, NodeDepResponse>[] = [];

  constructor() {
    this.router = new Router();
    this.server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
      this.handleRequest(req, res);
    });
  }

  /**
   * Register global middleware (Express-style app.use()).
   * Replaces: express middleware registration.
   */
  public use(...fns: Handler<NodeDepRequest, NodeDepResponse>[]) {
    this.stack.push(...fns);
  }

  public get(path: string, ...handlers: Handler<NodeDepRequest, NodeDepResponse>[]) { this.router.get(path, ...handlers); }
  public post(path: string, ...handlers: Handler<NodeDepRequest, NodeDepResponse>[]) { this.router.post(path, ...handlers); }
  public put(path: string, ...handlers: Handler<NodeDepRequest, NodeDepResponse>[]) { this.router.put(path, ...handlers); }
  public delete(path: string, ...handlers: Handler<NodeDepRequest, NodeDepResponse>[]) { this.router.delete(path, ...handlers); }
  public patch(path: string, ...handlers: Handler<NodeDepRequest, NodeDepResponse>[]) { this.router.patch(path, ...handlers); }
  public all(path: string, ...handlers: Handler<NodeDepRequest, NodeDepResponse>[]) { this.router.all(path, ...handlers); }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    // 1. Enhance request with query params and default params
    const customReq = req as NodeDepRequest;
    if (!customReq.params) {
      customReq.params = {};
    }
    parseQuery(customReq);

    // 2. Enhance response with status, json, send, redirect helpers
    const customRes = enhanceResponse(res);

    // 3. Run global middleware stack
    composeMiddleware(this.stack, customReq, customRes, (globalErr) => {
      if (globalErr) {
        // Global middleware threw — send to error handler immediately
        return errorHandler(globalErr, customReq, customRes, () => {});
      }

      // 4. Try to dispatch to a matching route
      const handled = this.router.handle(customReq, customRes, (routeErr) => {
        if (routeErr) {
          // A route handler threw — send to error handler
          errorHandler(routeErr, customReq, customRes, () => {});
        }
      });

      // 5. If no route matched, trigger 404 handler
      if (!handled) {
        notFoundHandler(customReq, customRes, () => {});
      }
    });
  }

  /**
   * Starts the HTTP server listening for connections.
   * @param port The port to listen on
   * @param callback Optional callback invoked when the server starts
   */
  public listen(port: number, callback?: () => void): http.Server {
    return this.server.listen(port, callback);
  }
}

// Export a factory function similar to Express
export function createApp() {
  return new Application();
}

// Re-export core types and helpers
export { createHttpError } from './error-handlers.js';
export { enhanceResponse } from './response.js';
export { json, urlencoded, readBody } from './body-parser.js';
export { queryParser, parseQuery } from './query-parser.js';
export { composeMiddleware } from './middleware.js';
export { Router } from './router.js';

export type { NodeDepError } from './error-handlers.js';
export type { NodeDepRequest, RequestHandler } from './router.js';
export type { NodeDepResponse } from './response.js';
export type { Handler, MiddlewareFn, ErrorMiddlewareFn, NextFunction } from './middleware.js';
export type { BodyParserOptions } from './body-parser.js';
