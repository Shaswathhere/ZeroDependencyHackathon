import * as fs from 'node:fs';
import * as path from 'node:path';
import { MiddlewareFn } from './middleware.js';
import { NodeDepRequest } from './router.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Middleware to serve static files from a given root directory.
 * Replaces: serve-static
 */
export function serveStatic(rootPath: string): MiddlewareFn {
  const absoluteRoot = path.resolve(rootPath);

  return (req, res, next) => {
    // Only serve GET and HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(url.pathname);
    
    // Resolve the requested file path safely to prevent directory traversal
    const requestedPath = path.normalize(path.join(absoluteRoot, pathname));
    
    // Ensure the resolved path is still inside the root directory
    if (!requestedPath.startsWith(absoluteRoot)) {
      return next();
    }

    fs.stat(requestedPath, (err, stats) => {
      if (err) {
        // File not found or inaccessible, pass to next middleware/router
        return next();
      }

      if (stats.isDirectory()) {
        // If it's a directory, try to serve index.html
        const indexPath = path.join(requestedPath, 'index.html');
        fs.stat(indexPath, (indexErr, indexStats) => {
          if (indexErr || !indexStats.isFile()) {
            return next();
          }
          serveFile(indexPath, indexStats, req, res);
        });
        return;
      }

      if (stats.isFile()) {
        serveFile(requestedPath, stats, req, res);
      } else {
        next();
      }
    });
  };
}

function serveFile(filePath: string, stats: fs.Stats, req: any, res: any) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', stats.size);

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Error reading file');
    }
  });
  
  stream.pipe(res);
}
