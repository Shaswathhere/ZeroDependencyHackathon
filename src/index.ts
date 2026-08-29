import * as http from 'node:http';
import { Router, RequestHandler } from './router.js';
import { MiddlewareFn, ErrorMiddlewareFn, composeMiddleware } from './middleware.js';
import { notFoundHandler, errorHandler, NodeDepError } from './error-handlers.js';

export class Application {
  private server: http.Server;
  private router: Router;
  /** Global middleware stack — runs before route handlers */
  private stack: (MiddlewareFn | ErrorMiddlewareFn)[] = [];

  constructor() {
    this.router = new Router();
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });
  }

  /**
   * Register global middleware (Express-style app.use()).
   * Replaces: express middleware registration.
   */
  public use(...fns: (MiddlewareFn | ErrorMiddlewareFn)[]) {
    this.stack.push(...fns);
  }

  public get(path: string, ...handlers: (MiddlewareFn | ErrorMiddlewareFn)[]) { this.router.get(path, ...handlers); }
  public post(path: string, ...handlers: (MiddlewareFn | ErrorMiddlewareFn)[]) { this.router.post(path, ...handlers); }
  public put(path: string, ...handlers: (MiddlewareFn | ErrorMiddlewareFn)[]) { this.router.put(path, ...handlers); }
  public delete(path: string, ...handlers: (MiddlewareFn | ErrorMiddlewareFn)[]) { this.router.delete(path, ...handlers); }
  public patch(path: string, ...handlers: (MiddlewareFn | ErrorMiddlewareFn)[]) { this.router.patch(path, ...handlers); }
  public all(path: string, ...handlers: (MiddlewareFn | ErrorMiddlewareFn)[]) { this.router.all(path, ...handlers); }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    // 1. Run global middleware stack
    composeMiddleware(this.stack, req, res, (globalErr) => {
      if (globalErr) {
        // Global middleware threw — send to error handler immediately
        return errorHandler(globalErr, req, res, () => {});
      }

      // 2. Try to dispatch to a matching route
      const handled = this.router.handle(req, res, (routeErr) => {
        if (routeErr) {
          // A route handler threw — send to error handler
          errorHandler(routeErr, req, res, () => {});
        }
      });

      // 3. If no route matched, trigger 404 handler
      if (!handled) {
        notFoundHandler(req, res, () => {});
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

// Re-export convenience helpers so users only need one import
export { createHttpError } from './error-handlers.js';
export type { NodeDepError } from './error-handlers.js';
export type { RequestHandler };
