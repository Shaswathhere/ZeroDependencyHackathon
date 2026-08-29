import * as http from 'node:http';

export type RequestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void | Promise<void>;

export interface Route {
  method: string;
  path: string;
  handler: RequestHandler;
}

export class Router {
  private routes: Route[] = [];

  private addRoute(method: string, path: string, handler: RequestHandler) {
    this.routes.push({ method: method.toUpperCase(), path, handler });
  }

  public get(path: string, handler: RequestHandler) {
    this.addRoute('GET', path, handler);
  }

  public post(path: string, handler: RequestHandler) {
    this.addRoute('POST', path, handler);
  }

  public put(path: string, handler: RequestHandler) {
    this.addRoute('PUT', path, handler);
  }

  public delete(path: string, handler: RequestHandler) {
    this.addRoute('DELETE', path, handler);
  }

  public patch(path: string, handler: RequestHandler) {
    this.addRoute('PATCH', path, handler);
  }

  public all(path: string, handler: RequestHandler) {
    this.addRoute('ALL', path, handler);
  }

  /**
   * Attempts to handle the request. Returns true if a route was found, false otherwise.
   */
  public handle(req: http.IncomingMessage, res: http.ServerResponse): boolean {
    // We use a dummy base URL here just to cleanly extract the pathname.
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const method = (req.method || 'GET').toUpperCase();

    for (const route of this.routes) {
      if ((route.method === method || route.method === 'ALL') && route.path === pathname) {
        route.handler(req, res);
        return true;
      }
    }
    
    return false; // Route not found
  }
}
