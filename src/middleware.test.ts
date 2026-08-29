import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { composeMiddleware } from './middleware.js';
import * as http from 'node:http';

// Helper to create a minimal mock req/res pair
function makeMockReqRes() {
  const req = {} as http.IncomingMessage;
  const res = {} as http.ServerResponse;
  return { req, res };
}

describe('composeMiddleware()', () => {
  test('calls a single middleware and then done()', (ctx, done) => {
    const { req, res } = makeMockReqRes();
    let middlewareCalled = false;

    const mw = (_req: any, _res: any, next: any) => {
      middlewareCalled = true;
      next();
    };

    composeMiddleware([mw], req, res, (err) => {
      assert.ok(middlewareCalled, 'middleware should have been called');
      assert.strictEqual(err, undefined, 'done should be called without error');
      done();
    });
  });

  test('calls multiple middlewares in order', (ctx, done) => {
    const { req, res } = makeMockReqRes();
    const callOrder: number[] = [];

    const mw1 = (_req: any, _res: any, next: any) => { callOrder.push(1); next(); };
    const mw2 = (_req: any, _res: any, next: any) => { callOrder.push(2); next(); };
    const mw3 = (_req: any, _res: any, next: any) => { callOrder.push(3); next(); };

    composeMiddleware([mw1, mw2, mw3], req, res, () => {
      assert.deepStrictEqual(callOrder, [1, 2, 3]);
      done();
    });
  });

  test('stops at middleware that does not call next()', (ctx, done) => {
    const { req, res } = makeMockReqRes();
    const callOrder: number[] = [];

    const mw1 = (_req: any, _res: any, next: any) => { callOrder.push(1); next(); };
    const mw2 = (_req: any, _res: any, _next: any) => { callOrder.push(2); /* no next() */ };
    const mw3 = (_req: any, _res: any, next: any) => { callOrder.push(3); next(); };

    // done should never be called since mw2 stopped the chain
    let doneCalled = false;
    composeMiddleware([mw1, mw2, mw3], req, res, () => { doneCalled = true; });

    // Use a small timeout to ensure the pipeline has settled
    setTimeout(() => {
      assert.deepStrictEqual(callOrder, [1, 2]);
      assert.strictEqual(doneCalled, false);
      done();
    }, 10);
  });

  test('passes error to done() when next(err) is called', (ctx, done) => {
    const { req, res } = makeMockReqRes();
    const boom = new Error('boom!');

    const mw1 = (_req: any, _res: any, next: any) => { next(boom); };

    composeMiddleware([mw1], req, res, (err) => {
      assert.strictEqual(err, boom);
      done();
    });
  });

  test('skips regular middlewares and invokes error middleware on error', (ctx, done) => {
    const { req, res } = makeMockReqRes();
    const boom = new Error('kaboom');
    const callOrder: string[] = [];

    const mw1 = (_req: any, _res: any, next: any) => { callOrder.push('mw1'); next(boom); };
    const mw2 = (_req: any, _res: any, next: any) => { callOrder.push('mw2'); next(); };
    // error middleware has 4 args
    const errMw = (err: any, _req: any, _res: any, next: any) => { callOrder.push('errMw'); next(err); };

    composeMiddleware([mw1, mw2, errMw], req, res, (err) => {
      assert.deepStrictEqual(callOrder, ['mw1', 'errMw']); // mw2 skipped
      assert.strictEqual(err, boom);
      done();
    });
  });
});
