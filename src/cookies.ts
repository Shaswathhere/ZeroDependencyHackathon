import * as http from 'node:http';
import { MiddlewareFn } from './middleware.js';
import { NodeDepRequest } from './router.js';
import { NodeDepResponse } from './response.js';

export interface CookieOptions {
  maxAge?: number; // seconds
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  path?: string;
  domain?: string;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Cookie parser middleware.
 * Replaces: cookie-parser
 * Uses only: native string splitting and decoding.
 */
export function cookieParser(): MiddlewareFn {
  return (req, _res, next) => {
    const customReq = req as NodeDepRequest;
    if (customReq.cookies) return next();

    customReq.cookies = {};
    const cookieHeader = req.headers.cookie;
    
    if (cookieHeader) {
      const cookies = cookieHeader.split(';');
      for (const cookie of cookies) {
        const parts = cookie.split('=');
        const name = parts.shift();
        if (name && parts.length >= 0) {
          const value = parts.join('=').trim();
          customReq.cookies[name.trim()] = decodeURIComponent(value);
        }
      }
    }
    
    next();
  };
}

export interface NodeDepResponseWithCookies extends NodeDepResponse {
  cookie(name: string, value: string, options?: CookieOptions): this;
  clearCookie(name: string, options?: CookieOptions): this;
}

/**
 * Enhances response with cookie methods.
 * Call this in Application bootstrap alongside enhanceResponse.
 */
export function enhanceResponseWithCookies(res: NodeDepResponse): NodeDepResponseWithCookies {
  const r = res as NodeDepResponseWithCookies;
  
  r.cookie = function (name: string, value: string, options: CookieOptions = {}) {
    let cookieString = `${name}=${encodeURIComponent(value)}`;
    
    if (options.maxAge) cookieString += `; Max-Age=${options.maxAge}`;
    if (options.expires) cookieString += `; Expires=${options.expires.toUTCString()}`;
    if (options.httpOnly) cookieString += `; HttpOnly`;
    if (options.secure) cookieString += `; Secure`;
    if (options.path) cookieString += `; Path=${options.path}`;
    if (options.domain) cookieString += `; Domain=${options.domain}`;
    if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;
    
    let setCookieHeader = this.getHeader('Set-Cookie');
    if (!setCookieHeader) {
      this.setHeader('Set-Cookie', cookieString);
    } else if (Array.isArray(setCookieHeader)) {
      this.setHeader('Set-Cookie', [...setCookieHeader, cookieString]);
    } else {
      this.setHeader('Set-Cookie', [setCookieHeader as string, cookieString]);
    }
    
    return this;
  };
  
  r.clearCookie = function (name: string, options: CookieOptions = {}) {
    return this.cookie(name, '', { ...options, expires: new Date(0) });
  };
  
  return r;
}
