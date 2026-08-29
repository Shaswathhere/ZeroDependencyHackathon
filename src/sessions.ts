import * as crypto from 'node:crypto';
import { MiddlewareFn } from './middleware.js';
import { NodeDepRequest } from './router.js';
import { NodeDepResponseWithCookies, CookieOptions } from './cookies.js';

export interface SessionOptions {
  secret: string;
  name?: string;
  cookie?: CookieOptions;
}

/**
 * Signs a value using HMAC SHA-256.
 */
function sign(value: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(value);
  return `${value}.${hmac.digest('base64url')}`;
}

/**
 * Verifies and unsigns a value using HMAC SHA-256.
 * Returns null if signature is invalid.
 */
function unsign(signedValue: string, secret: string): string | null {
  const lastDotIndex = signedValue.lastIndexOf('.');
  if (lastDotIndex === -1) return null;
  
  const value = signedValue.slice(0, lastDotIndex);
  const signature = signedValue.slice(lastDotIndex + 1);
  
  const expectedSignature = crypto.createHmac('sha256', secret).update(value).digest('base64url');
  
  if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return value;
  }
  return null;
}

/**
 * Crypto-signed session management middleware.
 * Stores session data in a signed cookie (stateless, no memory store).
 * Replaces: express-session / cookie-session.
 */
export function session(options: SessionOptions): MiddlewareFn {
  const secret = options.secret;
  const sessionName = options.name || 'nodep.sid';
  const cookieOptions = options.cookie || { httpOnly: true, path: '/', sameSite: 'Lax' };

  if (!secret) {
    throw new Error('Session secret is required');
  }

  return (req, res, next) => {
    const customReq = req as NodeDepRequest;
    const customRes = res as NodeDepResponseWithCookies;
    
    // Ensure cookies are parsed
    if (!customReq.cookies) {
      customReq.cookies = {};
    }

    const signedSession = customReq.cookies[sessionName];
    let sessionData = {};

    if (signedSession) {
      const unsigned = unsign(signedSession, secret);
      if (unsigned) {
        try {
          sessionData = JSON.parse(unsigned);
        } catch (e) {
          // invalid JSON in session cookie
        }
      }
    }

    customReq.session = sessionData;

    // We need to monkey-patch res.end (or writeHead) to save the session before sending headers
    const originalEnd = res.end;
    
    // Override res.end to serialize and sign session before finalizing
    res.end = function (this: any, chunk?: any, encoding?: any, cb?: () => void) {
      // Serialize session
      const sessionString = JSON.stringify(customReq.session || {});
      const signedString = sign(sessionString, secret);
      
      customRes.cookie(sessionName, signedString, cookieOptions);
      
      return originalEnd.call(this, chunk, encoding, cb);
    } as any;

    next();
  };
}
