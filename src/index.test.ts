import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as http from 'node:http';
import { createApp, json, urlencoded, NodeDepRequest, NodeDepResponse } from './index.js';

describe('NoDep Phase 3 - Request & Response Enhancements', () => {
  let app: ReturnType<typeof createApp>;
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    app = createApp();

    // Global body parsers
    app.use(json());
    app.use(urlencoded());

    // Test routes
    app.get('/test-query', (req: NodeDepRequest, res: NodeDepResponse) => {
      res.status(200).json({ query: req.query });
    });

    app.post('/test-json', (req: NodeDepRequest, res: NodeDepResponse) => {
      res.status(201).json({ received: req.body });
    });

    app.post('/test-form', (req: NodeDepRequest, res: NodeDepResponse) => {
      res.status(200).json({ form: req.body });
    });

    app.get('/test-send', (_req: NodeDepRequest, res: NodeDepResponse) => {
      res.send('<h1>Hello NoDep</h1>');
    });

    app.get('/test-redirect', (_req: NodeDepRequest, res: NodeDepResponse) => {
      res.redirect('/target', 301);
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });
  });

  after(() => {
    server.close();
  });

  test('Query parameters are correctly parsed into req.query', async () => {
    const res = await fetch(`${baseUrl}/test-query?search=nodep&sort=desc&page=1`);
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.deepStrictEqual(data.query, { search: 'nodep', sort: 'desc', page: '1' });
  });

  test('JSON body parser correctly parses JSON payload into req.body', async () => {
    const payload = { title: 'Zero Dependency', stars: 100 };
    const res = await fetch(`${baseUrl}/test-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json() as any;
    assert.deepStrictEqual(data.received, payload);
  });

  test('URL-encoded form body parser correctly parses form data', async () => {
    const formBody = new URLSearchParams({ username: 'shaswath', role: 'admin' }).toString();
    const res = await fetch(`${baseUrl}/test-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.deepStrictEqual(data.form, { username: 'shaswath', role: 'admin' });
  });

  test('res.send() sets HTML content-type and sends body', async () => {
    const res = await fetch(`${baseUrl}/test-send`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/html/);
    const text = await res.text();
    assert.strictEqual(text, '<h1>Hello NoDep</h1>');
  });

  test('res.redirect() sets status and Location header', async () => {
    const res = await fetch(`${baseUrl}/test-redirect`, { redirect: 'manual' });
    assert.strictEqual(res.status, 301);
    assert.strictEqual(res.headers.get('location'), '/target');
  });
});
