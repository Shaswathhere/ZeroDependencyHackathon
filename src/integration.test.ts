import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as http from 'node:http';
import { createApp, json, urlencoded, cookieParser, serveStatic, NodeDepRequest, NodeDepResponseWithCookies } from './index.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

// ─────────────────────────────────────────────────────────────────
// Suite 1: Router + Params
// ─────────────────────────────────────────────────────────────────
describe('Router - path matching and params', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    const app = createApp();

    app.get('/users/:id', (req: NodeDepRequest, res: NodeDepResponseWithCookies) => {
      res.json({ id: req.params.id });
    });

    app.get('/posts/:postId/comments/:commentId', (req: NodeDepRequest, res: NodeDepResponseWithCookies) => {
      res.json({ postId: req.params.postId, commentId: req.params.commentId });
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  after(() => server.close());

  test('extracts single path param', async () => {
    const res = await fetch(`${baseUrl}/users/42`);
    const data = await res.json() as any;
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.id, '42');
  });

  test('extracts multiple path params', async () => {
    const res = await fetch(`${baseUrl}/posts/10/comments/99`);
    const data = await res.json() as any;
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(data, { postId: '10', commentId: '99' });
  });

  test('returns 404 for unmatched route', async () => {
    const res = await fetch(`${baseUrl}/nonexistent`);
    assert.strictEqual(res.status, 404);
  });

  test('method matching - GET vs POST', async () => {
    const res = await fetch(`${baseUrl}/users/1`, { method: 'POST' });
    assert.strictEqual(res.status, 404); // POST /users/:id not registered
  });
});

// ─────────────────────────────────────────────────────────────────
// Suite 2: Cookies
// ─────────────────────────────────────────────────────────────────
describe('Cookie Parser + res.cookie()', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    const app = createApp();
    app.use(cookieParser());

    app.get('/set-cookie', (_req: NodeDepRequest, res: NodeDepResponseWithCookies) => {
      res.cookie('session', 'abc123', { httpOnly: true, path: '/' });
      res.json({ ok: true });
    });

    app.get('/read-cookie', (req: NodeDepRequest, res: NodeDepResponseWithCookies) => {
      res.json({ cookies: req.cookies });
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  after(() => server.close());

  test('res.cookie() sets Set-Cookie header', async () => {
    const res = await fetch(`${baseUrl}/set-cookie`);
    assert.strictEqual(res.status, 200);
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Set-Cookie header should be present');
    assert.ok(setCookie!.includes('session='));
    assert.ok(setCookie!.includes('HttpOnly'));
  });

  test('cookieParser() populates req.cookies', async () => {
    const res = await fetch(`${baseUrl}/read-cookie`, {
      headers: { 'Cookie': 'username=shaswath; theme=dark' }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.strictEqual(data.cookies.username, 'shaswath');
    assert.strictEqual(data.cookies.theme, 'dark');
  });
});

// ─────────────────────────────────────────────────────────────────
// Suite 3: Static File Serving
// ─────────────────────────────────────────────────────────────────
describe('serveStatic() middleware', () => {
  let server: http.Server;
  let baseUrl: string;
  let tmpDir: string;

  before(async () => {
    // Create a temporary directory with test files
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodep-static-'));
    fs.writeFileSync(path.join(tmpDir, 'hello.txt'), 'Hello Static!', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'data.json'), '{"ok":true}', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'index.html'), '<html><body>Home</body></html>', 'utf-8');

    const app = createApp();
    app.use(serveStatic(tmpDir));

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  after(() => {
    server.close();
    fs.rmSync(tmpDir, { recursive: true });
  });

  test('serves a .txt file with correct content-type', async () => {
    const res = await fetch(`${baseUrl}/hello.txt`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/plain'));
    const text = await res.text();
    assert.strictEqual(text, 'Hello Static!');
  });

  test('serves a .json file with correct content-type', async () => {
    const res = await fetch(`${baseUrl}/data.json`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('application/json'));
  });

  test('serves index.html for directory request', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));
    const text = await res.text();
    assert.ok(text.includes('Home'));
  });

  test('returns 404 for missing file', async () => {
    const res = await fetch(`${baseUrl}/does-not-exist.txt`);
    assert.strictEqual(res.status, 404);
  });

  test('blocks directory traversal attack', async () => {
    const res = await fetch(`${baseUrl}/../package.json`);
    // Should not successfully serve the file (404 or the static dir's content)
    assert.notStrictEqual(res.status, 200);
  });
});

// ─────────────────────────────────────────────────────────────────
// Suite 4: Error Handling
// ─────────────────────────────────────────────────────────────────
describe('Error Handling - createHttpError & global error middleware', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    const app = createApp();

    app.get('/throw-sync', (_req: NodeDepRequest, _res: NodeDepResponseWithCookies) => {
      throw new Error('sync error');
    });

    app.get('/throw-http', (_req: NodeDepRequest, _res: NodeDepResponseWithCookies, next: any) => {
      const { createHttpError } = require('./error-handlers.js');
      next(createHttpError(403, 'Forbidden resource'));
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  after(() => server.close());

  test('catches synchronous errors and returns 500', async () => {
    const res = await fetch(`${baseUrl}/throw-sync`);
    assert.strictEqual(res.status, 500);
    const data = await res.json() as any;
    assert.ok(data.message || data.error, 'Should contain error info');
  });
});
