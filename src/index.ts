import * as http from 'node:http';
import { Router, RequestHandler } from './router.js';
import { MiddlewareFn, ErrorMiddlewareFn, composeMiddleware } from './middleware.js';

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
    // First run all global middleware, then dispatch to router
    composeMiddleware(this.stack, req, res, (err) => {
      if (err) {
        // Unhandled error from global middleware
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end(`Internal Server Error: ${err.message}`);
        return;
      }

      const handled = this.router.handle(req, res, (err) => {
        if (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end(`Internal Server Error: ${err.message}`);
        }
      });

      if (!handled) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Not Found');
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
