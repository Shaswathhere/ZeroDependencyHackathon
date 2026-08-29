import * as http from 'node:http';

export type NextFunction = (err?: Error) => void;

export type MiddlewareFn<
  Req = http.IncomingMessage,
  Res = http.ServerResponse
> = (
  req: Req,
  res: Res,
  next: NextFunction
) => void | Promise<void>;

export type ErrorMiddlewareFn<
  Req = http.IncomingMessage,
  Res = http.ServerResponse
> = (
  err: Error,
  req: Req,
  res: Res,
  next: NextFunction
) => void | Promise<void>;

export type Handler<Req = any, Res = any> =
  | MiddlewareFn<Req, Res>
  | ErrorMiddlewareFn<Req, Res>
  | ((req: Req, res: Res) => void | Promise<void>);

/**
 * Composes an array of middleware functions into a single executor.
 * Calls each middleware in order. If a middleware calls next(err), it
 * skips to the next error-handling middleware (4-argument function).
 * Replaces: express middleware chain.
 */
export function composeMiddleware(
  stack: Handler[],
  req: http.IncomingMessage,
  res: http.ServerResponse,
  finalHandler: (err?: Error) => void
): void {
  let index = 0;

  function next(err?: Error): void {
    if (index >= stack.length) {
      return finalHandler(err);
    }

    const fn = stack[index++];

    try {
      if (err) {
        // If there's an error, look for an error-handling middleware (4 args)
        if (fn.length === 4) {
          Promise.resolve((fn as ErrorMiddlewareFn)(err, req, res, next)).catch(next);
        } else {
          // Skip normal middleware when there's an error
          next(err);
        }
      } else {
        // Normal middleware (3 args or 2 args)
        if (fn.length < 4) {
          Promise.resolve((fn as MiddlewareFn)(req, res, next)).catch(next);
        } else {
          next(); // Skip error middleware when there's no error
        }
      }
    } catch (thrown) {
      next(thrown instanceof Error ? thrown : new Error(String(thrown)));
    }
  }

  next();
}
