# STDLIB.md — Zero Dependency Substitutions

This document explains how **NoDep** replaces every common npm dependency with
Node.js standard library APIs. The goal: a fully functional web framework with
`"dependencies": {}` in `package.json`.

---

## Table of Contents

1. [HTTP Server](#1-http-server)
2. [Routing & Path Matching](#2-routing--path-matching)
3. [Middleware Pipeline](#3-middleware-pipeline)
4. [Body Parsing](#4-body-parsing)
5. [Query String Parsing](#5-query-string-parsing)
6. [Response Helpers](#6-response-helpers)
7. [Static File Serving](#7-static-file-serving)
8. [Cookie Parsing](#8-cookie-parsing)
9. [Session Management](#9-session-management)
10. [Error Handling](#10-error-handling)
11. [File-Based Persistence (Demo)](#11-file-based-persistence-demo)

---

## 1. HTTP Server

| npm Package | NoDep Replacement |
|---|---|
| `express` | `node:http` |

**How it works:** `http.createServer(handler)` is Node's built-in HTTP server.
NoDep wraps it inside the `Application` class so that the public API mirrors
Express:

```typescript
// express
import express from 'express';
const app = express();

// nodep
import { createApp } from './src/index.js';
const app = createApp();
```

**Node.js module used:** `node:http`

---

## 2. Routing & Path Matching

| npm Package | NoDep Replacement |
|---|---|
| `express` router | Custom `Router` class |
| `path-to-regexp` | `RegExp` + `String.replace()` |

**How it works:** `compilePath()` in `src/path-matcher.ts` converts an Express-style
pattern like `/users/:id` into a `RegExp`. Named `:params` are extracted using
capture groups `([^/]+)`. `matchPath()` runs the regex and maps capture groups
back to param names.

```typescript
// path-to-regexp (npm)
import { pathToRegexp } from 'path-to-regexp';

// nodep
import { compilePath, matchPath } from './path-matcher.js';
const { regex, keys } = compilePath('/users/:id');
```

**Node.js APIs used:** `RegExp`, `String.prototype.replace()`

---

## 3. Middleware Pipeline

| npm Package | NoDep Replacement |
|---|---|
| `express` middleware chain | `composeMiddleware()` in `src/middleware.ts` |

**How it works:** `composeMiddleware` iterates a stack of functions. If a
middleware calls `next()` without an argument, the next regular middleware runs.
If `next(err)` is called, the pipeline skips regular middleware and looks for an
error middleware with 4 arguments `(err, req, res, next)`. This mirrors Express's
middleware model exactly.

**Node.js APIs used:** `Function.prototype.length`, `Promise.resolve()`

---

## 4. Body Parsing

| npm Package | NoDep Replacement |
|---|---|
| `express.json()` / `body-parser` | `json()` in `src/body-parser.ts` |
| `express.urlencoded()` | `urlencoded()` in `src/body-parser.ts` |

**How it works:** The raw HTTP request is a `Readable` stream. NoDep reads it
chunk-by-chunk into a `Buffer` using `req.on('data')` / `req.on('end')`, then
parses it with `JSON.parse()` or `URLSearchParams`.

```typescript
// body-parser (npm)
import bodyParser from 'body-parser';
app.use(bodyParser.json());

// nodep
import { json } from './src/index.js';
app.use(json());
```

**Node.js APIs used:** `node:stream` (readable stream events), `Buffer`,
`JSON.parse()`, `URLSearchParams`

---

## 5. Query String Parsing

| npm Package | NoDep Replacement |
|---|---|
| `qs` | `parseQuery()` in `src/query-parser.ts` |

**How it works:** Node's built-in `URL` class can parse a full URL string and
expose search params via `url.searchParams`. NoDep iterates those entries into
a plain `req.query` object.

```typescript
// qs (npm)
import qs from 'qs';
const query = qs.parse(req.url.split('?')[1]);

// nodep
const url = new URL(req.url, 'http://localhost');
req.query = Object.fromEntries(url.searchParams.entries());
```

**Node.js APIs used:** `URL`, `URLSearchParams`

---

## 6. Response Helpers

| npm Package | NoDep Replacement |
|---|---|
| Express's `res.json()` | `enhanceResponse()` in `src/response.ts` |
| Express's `res.status()` | Same |
| Express's `res.send()` | Same |
| Express's `res.redirect()` | Same |

**How it works:** NoDep augments the native `http.ServerResponse` object with
additional methods at request time. `res.json()` stringifies the payload with
`JSON.stringify` and sets the `Content-Type: application/json` header.
`res.status()` sets `res.statusCode` and returns `this` for chaining.

**Node.js APIs used:** `JSON.stringify()`, `http.ServerResponse`

---

## 7. Static File Serving

| npm Package | NoDep Replacement |
|---|---|
| `serve-static` | `serveStatic()` in `src/static.ts` |

**How it works:** `serveStatic()` resolves the requested URL pathname to a file
on disk using `path.resolve()`. It uses `fs.stat()` to check if the file exists,
then pipes it to the response with `fs.createReadStream()`. MIME types are
looked up in a hardcoded dictionary keyed on file extension.

```typescript
// serve-static (npm)
import serveStatic from 'serve-static';
app.use(serveStatic('./public'));

// nodep
import { serveStatic } from './src/index.js';
app.use(serveStatic('./public'));
```

**Security:** NoDep validates that the resolved path always stays within the
root directory to block directory traversal attacks (`../../etc/passwd`).

**Node.js APIs used:** `node:fs` (`stat`, `createReadStream`, `existsSync`),
`node:path` (`resolve`, `normalize`, `join`, `extname`)

---

## 8. Cookie Parsing

| npm Package | NoDep Replacement |
|---|---|
| `cookie-parser` | `cookieParser()` in `src/cookies.ts` |

**How it works:** The `Cookie` request header is a semicolon-delimited string.
NoDep splits it on `;`, then splits each pair on `=` to extract name/value
pairs. Values are URL-decoded using `decodeURIComponent`. `res.cookie()` builds
a `Set-Cookie` header string with all standard options.

```typescript
// cookie-parser (npm)
import cookieParser from 'cookie-parser';
app.use(cookieParser());

// nodep
import { cookieParser } from './src/index.js';
app.use(cookieParser());
```

**Node.js APIs used:** `String.prototype.split()`, `decodeURIComponent()`,
`encodeURIComponent()`, `Date.prototype.toUTCString()`

---

## 9. Session Management

| npm Package | NoDep Replacement |
|---|---|
| `express-session` | `session()` in `src/sessions.ts` |
| `cookie-session` | Same |

**How it works:** NoDep implements **stateless, signed cookie sessions**. The
session object (`req.session`) is JSON serialized and signed with an HMAC
SHA-256 signature using the provided `secret`. Verification uses
`crypto.timingSafeEqual()` to prevent timing attacks. The signed value is
stored in a cookie on the client. There is no server-side session store needed.

```typescript
// express-session (npm)
import session from 'express-session';
app.use(session({ secret: 'my-secret', resave: false, saveUninitialized: true }));

// nodep
import { session } from './src/index.js';
app.use(session({ secret: 'my-secret' }));
```

**Node.js APIs used:** `node:crypto` (`createHmac`, `timingSafeEqual`, `Buffer`)

---

## 10. Error Handling

| npm Package | NoDep Replacement |
|---|---|
| `http-errors` | `createHttpError()` in `src/error-handlers.ts` |

**How it works:** `createHttpError(statusCode, message)` creates a standard
`Error` object with a `.statusCode` property attached. The global `errorHandler`
middleware inspects this property to determine the HTTP status code to send
in the JSON error response.

```typescript
// http-errors (npm)
import createError from 'http-errors';
throw createError(404, 'Not found');

// nodep
import { createHttpError } from './src/index.js';
throw createHttpError(404, 'Not found');
```

**Node.js APIs used:** Native `Error`, `JSON.stringify()`

---

## 11. File-Based Persistence (Demo)

| npm Package | NoDep Replacement |
|---|---|
| `mongoose` / `sequelize` / `sqlite3` | `fs.readFileSync` / `fs.writeFileSync` |
| `lowdb` | Custom `store.ts` in `demo/` |

**How it works:** The demo Todo application uses a simple `data.json` file as
its database. `getTodos()` reads and parses the file. `saveTodos()` stringifies
and writes back to disk. For a hackathon / prototype scenario, this eliminates
any database setup entirely.

**Node.js APIs used:** `node:fs` (`readFileSync`, `writeFileSync`, `existsSync`),
`JSON.parse()`, `JSON.stringify()`, `Date.now()`

---

## Zero Dependency Verification

```bash
# Verify no runtime dependencies are installed
cat package.json | grep '"dependencies"'
# Expected: "dependencies": {}

# List what IS installed (only devDependencies)
npm ls --depth=0
# Expected: only typescript and @types/node
```
