import * as http from 'node:http';
import { MiddlewareFn, ErrorMiddlewareFn, composeMiddleware } from './middleware.js';

export type RequestHandler = MiddlewareFn;

export interface Route {
  method: string;
  path: string;
  handlers: (MiddlewareFn | ErrorMiddlewareFn)[];
}

export class Router {
  private routes: Route[] = [];

  private addRoute(method: string, path: string, ...handlers: (MiddlewareFn | ErrorMiddlewareFn)[]) {
    this.routes.push({ method: method.toUpperCase(), path, handlers });
  }

  public get(path: string, ...handlers: (MiddlewareFn | ErrorMiddlewareFn)[]) {
    this.addRoute('GET', path, ...handlers);
  }

  public post(path: string, ...handlers: (MiddlewareFn | ErrorMiddlewareFn)[]) {
    this.addRoute('POST', path, ...handlers);
  }

  public put(path: string, ...handlers: (MiddlewareFn | ErrorMiddlewareFn)[]) {
    this.addRoute('PUT', path, ...handlers);
  }

  public delete(path: string, ...handlers: (MiddlewareFn | ErrorMiddlewareFn)[]) {
    this.addRoute('DELETE', path, ...handlers);
  }

  public patch(path: string, ...handlers: (MiddlewareFn | ErrorMiddlewareFn)[]) {
    this.addRoute('PATCH', path, ...handlers);
  }

  public all(path: string, ...handlers: (MiddlewareFn | ErrorMiddlewareFn)[]) {
    this.addRoute('ALL', path, ...handlers);
  }

  /**
   * Attempts to handle the request by composing matched route handlers.
   * Returns true if a route was found, false otherwise.
   */
  public handle(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    done: (err?: Error) => void
  ): boolean {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const method = (req.method || 'GET').toUpperCase();

    for (const route of this.routes) {
      if ((route.method === method || route.method === 'ALL') && route.path === pathname) {
        composeMiddleware(route.handlers, req, res, done);
        return true;
      }
    }

    return false; // Route not found
  }
}
