# NoDep — A Zero-Dependency Full-Stack Web Framework

**Zero Dependency 2026 Hackathon — Track C: Web & Network**

> A minimal, genuinely usable web framework built entirely on Node.js standard library — no Express, no Fastify, no npm runtime packages. Routing, middleware, sessions, JSON parsing, and static file serving, all from `http`, `net`, `crypto`, and `fs`.

---

## 1. Problem Statement

Every Node.js web app pulls in Express or Fastify by default, without most developers ever seeing what those frameworks actually do under the hood — request parsing, routing trees, middleware composition, and session handling all happen inside someone else's dependency.

**NoDep** proves that Node's built-in `http` and `net` modules are sufficient to build a small, real framework: one with routing, middleware, JSON handling, cookies/sessions, and static file serving — capable of running a genuine demo application, not just a "hello world."

**Package(s) killed:** Express, and partially `cookie-parser` / `express-session` / `serve-static`.

---

## 2. Goals & Non-Goals

### Goals
- Ship a working framework with an ergonomic API (`app.get()`, `app.use()`, etc.)
- Support a real demo app on top of it (a small blog or todo API with a UI)
- Demonstrate deep stdlib usage: raw socket handling, manual HTTP parsing where useful, crypto-based session tokens
- Document every package substitution in `STDLIB.md`
- Hit the **Single File** bonus if scope allows (or keep the core framework in one file even if the demo app is separate)

### Non-Goals
- Not competing with Express on features — no plugin ecosystem, no templating engine (unless time allows as a stretch)
- Not implementing HTTP/2 or TLS termination from scratch — Node's `https` module (still stdlib) is fine to wrap
- Not building a production-grade framework — this is a craft demonstration, judged on clarity and correctness over completeness

---

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js (LTS) | Stdlib `http`/`net` is powerful enough for a full framework |
| Language | TypeScript, compiled with `tsc` (stdlib-shipped, dev-only) | Type safety; disclose as dev-only dependency in STDLIB.md |
| Core modules used | `http`, `net`, `url`, `querystring`, `crypto`, `fs`, `path`, `events`, `stream` | Covers routing, parsing, sessions, static files |
| Dependency manifest | `package.json` with empty `"dependencies"` | Required by rules |
| Dev-only deps (disclosed) | `typescript`, `@types/node` (build-time only, not runtime) | Permitted if disclosed in STDLIB.md |
| Node version | Node.js 20.x or 22.x LTS | Needed for `node:test`, stable `fetch`, and modern `crypto` APIs |
| Module system | ESM (`"type": "module"` in `package.json`) | Cleaner imports, no CommonJS/ESM interop friction |
| Build step | `tsc` compiles `src/` → `dist/`, single `npm run build` command | TypeScript is compiled, not run directly — Node doesn't execute `.ts` natively |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────┐
│              NoDep Framework              │
├─────────────┬─────────────┬───────────────┤
│   Router     │  Middleware  │   Sessions    │
│ (path match, │   (chain,    │  (crypto      │
│  params,     │   next())    │  signed       │
│  methods)    │              │  cookies)     │
├─────────────┴─────────────┴───────────────┤
│         Request/Response wrapper           │
│   (body parsing, JSON, static file serve)  │
├─────────────────────────────────────────────┤
│           Node `http` / `net` core          │
└─────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│         Demo App: Mini Blog/Todo API      │
│   (routes, views, persistence via fs)     │
└─────────────────────────────────────────────┘
```

### Core Components

1. **Server bootstrap** — wraps `http.createServer`, exposes `app.listen()`
2. **Router** — trie or array-based path matcher supporting `:params`, wildcards, and method dispatch (`GET`, `POST`, `PUT`, `DELETE`)
3. **Middleware pipeline** — Express-style `(req, res, next) => {}` chain, including error-handling middleware
4. **Request enhancements** — parsed `query`, `params`, `body` (JSON + urlencoded), `cookies`
5. **Response enhancements** — `res.json()`, `res.status()`, `res.send()`, `res.sendFile()`
6. **Sessions** — HMAC-signed cookie sessions using `crypto.createHmac`, no external store needed for demo scope
7. **Static file server** — streams files via `fs.createReadStream`, sets correct `Content-Type` via a small manual MIME map (no `mime` package)

---

## 5. Feature Scope (Prioritized for 72 Hours)

### Must-Have (Day 1–2)
- [ ] HTTP server bootstrap (`app.listen(port)`)
- [ ] Router: GET/POST/PUT/DELETE, path params (`/users/:id`)
- [ ] Middleware chaining with `next()`
- [ ] JSON body parsing (`Content-Type: application/json`)
- [ ] `res.json()`, `res.status()`, `res.send()`
- [ ] Basic error handling middleware + 404 handler
- [ ] Static file serving from a public directory

### Should-Have (Day 2)
- [ ] Cookie parsing
- [ ] Signed session cookies (crypto-based, no external session store)
- [ ] Query string parsing (`req.query`)
- [ ] Urlencoded form body parsing
- [ ] Basic logging middleware (method, path, status, response time)

### Stretch (Day 3, if time allows)
- [ ] WebSocket handshake support over raw `net` sockets (RFC 6455)
- [ ] Simple in-memory rate limiter middleware
- [ ] Hot-reload for the demo app during dev

### Demo App (built using NoDep, proves usefulness)
- A small **Todo API + minimal HTML UI**:
  - `GET /todos`, `POST /todos`, `PUT /todos/:id`, `DELETE /todos/:id`
  - Session-based "user" identity (no real auth needed — just proves sessions work)
  - Persisted to a JSON file via `fs` (no database dependency needed)
  - Server-rendered HTML via simple string templates (no template engine package)

---

## 6. STDLIB.md Substitution Plan (aim for 10+ entries)

| Normally you'd use | Replaced with |
|---|---|
| `express` | Custom router + middleware chain over `http` |
| `body-parser` | Manual `Buffer` concatenation + `JSON.parse` / `querystring.parse` |
| `cookie-parser` | Manual `Cookie` header split/parse |
| `express-session` | `crypto.createHmac` signed cookie sessions |
| `serve-static` | `fs.createReadStream` + manual MIME type map |
| `mime` / `mime-types` | Hardcoded extension → Content-Type lookup table |
| `morgan` (logging) | Custom middleware using `Date.now()` timing + `console.log` |
| `dotenv` | `process.env` read directly (document `.env` parsing via `fs.readFileSync` if used) |
| `uuid` | `crypto.randomUUID()` |
| `nodemon` (dev reload) | `fs.watch` + child process restart script |
| `ws` (WebSockets) | Manual RFC 6455 handshake over `net.Socket` (stretch) |
| `helmet` (security headers) | Manual header-setting middleware |

---

## 7. Testing Plan

- **Unit tests** (using Node's built-in `node:test` + `assert` — stdlib, no Jest/Mocha):
  - Router matching (static paths, params, 404s, method mismatch)
  - Middleware execution order and `next()` short-circuiting
  - JSON/urlencoded body parser edge cases (empty body, malformed JSON, large payloads)
  - Cookie parsing edge cases (multiple cookies, missing `=`, encoded values)
  - Session HMAC verification (valid, tampered, expired)
- **Integration tests**: spin up the server on an ephemeral port, hit real endpoints with `http.request`, assert status/body
- **Edge cases to explicitly test**: concurrent requests, large file static serving, malformed HTTP requests, missing routes, unsupported methods

---

## 8. Submission Checklist

- [ ] Public GitHub repository
- [ ] `README.md` (this doc, trimmed to actual implementation)
- [ ] `STDLIB.md` (substitution table above, filled in with real line-count/detail)
- [ ] Empty dependency manifest (`package.json` → `"dependencies": {}`)
- [ ] Dependency proof (screenshot or `npm ls --omit=dev` output showing zero runtime deps)
- [ ] One-command build (`npm run build` or a single `node` invocation)
- [ ] Tests (`node --test`)
- [ ] 5-minute demo video (show the framework code briefly, then the working Todo app)
- [ ] Disclose dev-only deps (TypeScript, @types/node) in STDLIB.md

---

## 9. Suggested 72-Hour Timeline

| Time | Focus |
|---|---|
| Hour 0–4 | Project scaffold, `package.json`, HTTP server bootstrap, basic routing |
| Hour 4–12 | Middleware chain, JSON/urlencoded body parsing, response helpers |
| Hour 12–24 | Static file serving, cookies, sessions |
| Hour 24–36 | Demo app (Todo API) built on the framework |
| Hour 36–48 | Tests, edge case hardening, logging middleware |
| Hour 48–60 | Stretch features (WebSocket handshake) if ahead of schedule |
| Hour 60–68 | STDLIB.md, README polish, dependency proof screenshots |
| Hour 68–72 | Record demo video, final commit, submit |

---

## 10. Judging Alignment (Self-Check Before Submitting)

- **Functionality (35%)** — Does the Todo demo actually run end-to-end with sessions and persistence?
- **Zero-Dependency Craft (30%)** — Is every substitution in STDLIB.md real and non-trivial (not just "didn't need a package")?
- **Code Quality (25%)** — Is the router/middleware code idiomatic and readable, not a tangle of `if` statements?
- **Innovation (10%)** — Does the WebSocket handshake or reproducible build bonus push this beyond "another Express clone"?

---

## Quick Start (fill in once implemented)

**Requires:** Node.js 20.x or 22.x LTS (no other runtime supported)

```bash
git clone <repo-url>
cd nodep
npm install     # installs only dev-only deps: typescript, @types/node
npm run build   # tsc compile, single command build
npm start       # runs demo app on http://localhost:3000
npm test        # run unit + integration tests via node:test
```

**Dependency proof:**

```bash
npm ls --omit=dev   # should print "(empty)" — zero runtime dependencies
```
