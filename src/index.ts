import * as http from 'node:http';
import { Router, RequestHandler } from './router.js';

export class Application {
  private server: http.Server;
  private router: Router;

  constructor() {
    this.router = new Router();
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });
  }

  public get(path: string, handler: RequestHandler) { this.router.get(path, handler); }
  public post(path: string, handler: RequestHandler) { this.router.post(path, handler); }
  public put(path: string, handler: RequestHandler) { this.router.put(path, handler); }
  public delete(path: string, handler: RequestHandler) { this.router.delete(path, handler); }
  public patch(path: string, handler: RequestHandler) { this.router.patch(path, handler); }
  public all(path: string, handler: RequestHandler) { this.router.all(path, handler); }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const handled = this.router.handle(req, res);
    if (!handled) {
      // Basic fallback for unhandled requests
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Not Found');
    }
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
