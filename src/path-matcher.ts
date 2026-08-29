/**
 * Utilities for matching URL paths against route patterns that include
 * named parameters (e.g. /users/:id/posts/:postId).
 *
 * Replaces: express path-to-regexp dependency.
 * Uses only: Node.js built-in string/regex APIs.
 */

export interface MatchResult {
  params: Record<string, string>;
}

/**
 * Compiles a route pattern into a RegExp and captures param names.
 *
 * Examples:
 *   /users/:id          →  /^\/users\/([^/]+)\/?$/
 *   /posts/:id/comments →  /^\/posts\/([^/]+)\/comments\/?$/
 *   /health             →  /^\/health\/?$/
 */
export function compilePath(pattern: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];

  // Escape special regex chars except for `:param` segments and `/`
  const regexStr = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape regex special chars
    .replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, key: string) => {
      keys.push(key);
      return '([^/]+)'; // match any non-slash sequence
    });

  // Allow optional trailing slash
  const regex = new RegExp(`^${regexStr}\\/?$`);
  return { regex, keys };
}

/**
 * Tests a pathname against a compiled route pattern.
 * Returns a MatchResult with extracted params on success, or null on failure.
 */
export function matchPath(
  pathname: string,
  regex: RegExp,
  keys: string[]
): MatchResult | null {
  const match = regex.exec(pathname);
  if (!match) return null;

  const params: Record<string, string> = {};
  keys.forEach((key, i) => {
    params[key] = decodeURIComponent(match[i + 1]);
  });

  return { params };
}
