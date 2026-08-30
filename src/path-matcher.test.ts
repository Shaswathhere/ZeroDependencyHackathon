import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { compilePath, matchPath } from './path-matcher.js';

describe('compilePath()', () => {
  test('compiles a static path with no params', () => {
    const { regex, keys } = compilePath('/health');
    assert.deepStrictEqual(keys, []);
    assert.ok(regex.test('/health'));
    assert.ok(regex.test('/health/')); // optional trailing slash
    assert.ok(!regex.test('/health/extra'));
    assert.ok(!regex.test('/other'));
  });

  test('compiles a path with a single :param', () => {
    const { regex, keys } = compilePath('/users/:id');
    assert.deepStrictEqual(keys, ['id']);
    assert.ok(regex.test('/users/123'));
    assert.ok(regex.test('/users/abc'));
    assert.ok(!regex.test('/users/')); // empty segment not matched
    assert.ok(!regex.test('/users'));
  });

  test('compiles a path with multiple :params', () => {
    const { regex, keys } = compilePath('/posts/:postId/comments/:commentId');
    assert.deepStrictEqual(keys, ['postId', 'commentId']);
    assert.ok(regex.test('/posts/1/comments/42'));
    assert.ok(!regex.test('/posts/1/comments'));
  });

  test('escapes special regex characters in static segments', () => {
    const { regex } = compilePath('/api/v1.0/data');
    assert.ok(regex.test('/api/v1.0/data'));
    assert.ok(!regex.test('/api/v100/data')); // dot must be literal
  });
});

describe('matchPath()', () => {
  test('returns null for a non-matching path', () => {
    const { regex, keys } = compilePath('/users/:id');
    const result = matchPath('/posts/123', regex, keys);
    assert.strictEqual(result, null);
  });

  test('returns empty params for a static path match', () => {
    const { regex, keys } = compilePath('/health');
    const result = matchPath('/health', regex, keys);
    assert.ok(result !== null);
    assert.deepStrictEqual(result.params, {});
  });

  test('extracts a single param correctly', () => {
    const { regex, keys } = compilePath('/users/:id');
    const result = matchPath('/users/42', regex, keys);
    assert.ok(result !== null);
    assert.deepStrictEqual(result.params, { id: '42' });
  });

  test('extracts multiple params correctly', () => {
    const { regex, keys } = compilePath('/posts/:postId/comments/:commentId');
    const result = matchPath('/posts/10/comments/99', regex, keys);
    assert.ok(result !== null);
    assert.deepStrictEqual(result.params, { postId: '10', commentId: '99' });
  });

  test('decodes URI-encoded param values', () => {
    const { regex, keys } = compilePath('/search/:query');
    const result = matchPath('/search/hello%20world', regex, keys);
    assert.ok(result !== null);
    assert.strictEqual(result.params.query, 'hello world');
  });
});
