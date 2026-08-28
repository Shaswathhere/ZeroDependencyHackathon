import * as http from 'node:http';

export class Application {
  private server: http.Server;

  constructor() {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    // Basic fallback for unhandled requests until routing is implemented
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not Found');
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
