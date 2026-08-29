import * as http from 'node:http';
import { Buffer } from 'node:buffer';

/**
 * Extended ServerResponse with NoDep response helpers.
 * Replaces: express res.json(), res.status(), res.send(), res.redirect()
 * Uses only: Node.js built-in http module.
 */
export interface NodeDepResponse extends http.ServerResponse {
  /**
   * Sets the HTTP status code and returns `this` for chaining.
   * Usage: res.status(404).json({ error: 'Not Found' })
   */
  status(code: number): this;

  /**
   * Serialises `data` to JSON, sets Content-Type and sends.
   * Replaces: express res.json()
   */
  json(data: unknown): void;

  /**
   * Sends a plain-text or HTML string body.
   * Replaces: express res.send()
   */
  send(body: string, contentType?: string): void;

  /**
   * Redirects the client to `url` with an optional status (default 302).
   * Replaces: express res.redirect()
   */
  redirect(url: string, statusCode?: number): void;
}

/**
 * Augments a raw ServerResponse with NoDep helper methods.
 * Called once per request inside the server bootstrap.
 * Replaces: express's response prototype patching.
 */
export function enhanceResponse(res: http.ServerResponse): NodeDepResponse {
  const r = res as NodeDepResponse;

  r.status = function (this: http.ServerResponse, code: number) {
    this.statusCode = code;
    return this as NodeDepResponse;
  };

  r.json = function (this: http.ServerResponse, data: unknown) {
    const body = JSON.stringify(data);
    if (!this.hasHeader('Content-Type')) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    this.setHeader('Content-Length', Buffer.byteLength(body));
    this.end(body);
  };

  r.send = function (this: http.ServerResponse, body: string, contentType = 'text/html; charset=utf-8') {
    if (!this.hasHeader('Content-Type')) {
      this.setHeader('Content-Type', contentType);
    }
    this.setHeader('Content-Length', Buffer.byteLength(body));
    this.end(body);
  };

  r.redirect = function (this: http.ServerResponse, url: string, statusCode = 302) {
    this.statusCode = statusCode;
    this.setHeader('Location', url);
    this.end();
  };

  return r;
}
