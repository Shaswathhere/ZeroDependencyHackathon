import * as http from 'node:http';
import { MiddlewareFn, ErrorMiddlewareFn, composeMiddleware } from './middleware.js';
import { compilePath, matchPath } from './path-matcher.js';

export type RequestHandler = MiddlewareFn;

export interface Route {
  method: string;
  pattern: string;
  regex: RegExp;
  keys: string[];
  handlers: (MiddlewareFn | ErrorMiddlewareFn)[];
}

export class Router {
  private routes: Route[] = [];

  private addRoute(method: string, pattern: string, ...handlers: (MiddlewareFn | ErrorMiddlewareFn)[]) {
    const { regex, keys } = compilePath(pattern);
    this.routes.push({ method: method.toUpperCase(), pattern, regex, keys, handlers });
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
   * Attempts to handle the request by matching path params and composing route handlers.
   * Attaches parsed params to req.params.
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
      if (route.method !== method && route.method !== 'ALL') continue;

      const match = matchPath(pathname, route.regex, route.keys);
      if (!match) continue;

      // Attach parsed path params to the request object
      (req as NodeDepRequest).params = match.params;

      composeMiddleware(route.handlers, req, res, done);
      return true;
    }

    return false; // No matching route found
  }
}

/**
 * Extended IncomingMessage with NoDep-specific fields.
 * We augment the native type rather than wrapping it.
 */
export interface NodeDepRequest extends http.IncomingMessage {
  params: Record<string, string>;
  query: Record<string, string>;
}
