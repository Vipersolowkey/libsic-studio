# Security Check Report — Libsic Studio

**Project:** Libsic Studio (Web Application Development)  
**Scope:** Express + Mongoose REST API (`api/`) and React + Vite SPA (`client/`)  
**Architecture Model:** Accountless capability-based sharing — anyone with an 8-character share code (`/r/:code`, `/cd/:code`) can read a saved room or custom CD, while mutations (`PUT`, `DELETE`) require a 192-bit random secret edit key transmitted via `x-edit-key` and stored server-side exclusively as a SHA-256 hash.

---

## 1. Scope & Threat Surface Audited

### 1.1 HTTP Transport, Proxy Trust & Security Headers (`api/src/app.js`)
- **Security headers (`helmet`):** Sets `X-Content-Type-Options: nosniff`, clickjacking protection, and strips Express's `X-Powered-By` fingerprint. `contentSecurityPolicy` is disabled only on the API server so `/api-docs` Swagger UI inline assets can run, while `crossOriginResourcePolicy: { policy: 'cross-origin' }` and `cors()` allow the separately hosted React client to read JSON responses.
- **Reverse-proxy awareness:** `app.set('trust proxy', 1)` reads the client IP one hop behind managed PaaS ingress proxies (e.g., Render) so per-IP rate limiting tracks individual visitors rather than the load balancer.

### 1.2 Rate Limiting Before Body Parsing (`api/src/app.js`)
- **Pre-parse throttling:** `express-rate-limit` (`windowMs: 60_000`, default `300` requests/minute configurable via `REQUESTS_PER_MINUTE`, standard draft-7 headers, `legacyHeaders: false`) is mounted on `/api` **before** `express.json()`. Throttled clients receive HTTP `429` immediately without triggering JSON body buffering or parsing.
- **Health check availability:** `GET /api/health` is registered prior to the `/api` limiter so host health/readiness probes are never rate-limited.

### 1.3 32 KB JSON Payload Cap & Structured Error Boundary (`api/src/app.js`)
- **Tight body cap:** `express.json({ limit: '32kb' })` bounds incoming JSON payloads to 32 KB (a maxed-out 30-item decorated room is ~3–4 KB), preventing memory pressure and oversized MongoDB document writes.
- **Leak-free error mapping:** The terminal Express error middleware translates expected client errors into clean JSON without leaking stack traces or internal paths:
  - `err.type === 'entity.too.large'` -> `413 { error: 'The request body is too large' }`
  - `err.type === 'entity.parse.failed'` -> `400 { error: 'The request body is not valid JSON' }`
  - `err instanceof URIError` (malformed percent-encoding such as `/api/rooms/%E0%A4%A`) -> `400 { error: 'Invalid URL' }`
  - `err.name === 'ValidationError'` -> `400 { error: 'Validation failed', details }`
  - Any unexpected error -> logged server-side, returning generic `500 { error: 'Something went wrong on the server' }`.

### 1.4 Capability Authorization: CSPRNG Edit Keys, SHA-256 & `timingSafeEqual` (`api/src/utils/editKey.js`, `api/src/middleware/requireEditKey.js`, `api/src/utils/shareCode.js`)
- **Unenumerable share codes:** `generateCode(8)` draws 8 characters using `crypto.randomInt` from a 31-character unambiguous alphabet (`31^8 ≈ 8.53 × 10^11` combinations) and retries up to 5 times on MongoDB duplicate-key (`11000`) collisions.
- **High-entropy edit keys:** `generateEditKey()` generates 24 CSPRNG bytes (`crypto.randomBytes(24).toString('base64url')`, 32 chars / 192 bits of entropy) and returns the plaintext key **only once** in the `201` creation response.
- **Hash-only persistence & non-leakage:** Only `hashEditKey(key)` (hex SHA-256) is stored. Both `Room` (`api/src/models/Room.js`) and `Cd` (`api/src/models/Cd.js`) mark `editKeyHash` with `select: false`, and `publicRoom()` / `publicCd()` build responses from explicit field allowlists so `editKeyHash` never leaks even after `requireEditKey` selects `+editKeyHash` for `PUT` handlers.
- **Constant-time verification:** `keyMatches(key, hash)` rejects empty or non-string inputs, SHA-256 hashes the candidate key to a fixed 64-byte hex buffer, checks buffer byte-length equality, and compares with `crypto.timingSafeEqual` to eliminate timing side-channels.
- **Middleware & official resource protection:** `requireEditKey(Model)` enforces `404` (unknown code), `401` (missing `x-edit-key`), and `403` (wrong key or another resource's key). On `/api/cds/:code`, `customOnly` blocks `PUT`/`DELETE` against `official: true` studio CDs with `403`, backed by `immutable: true` on `Cd.official`.

### 1.5 Strict Field Allowlisting, Schema Bounds & `PUT` Bypass Prevention (`api/src/routes/rooms.js`, `api/src/routes/cds.js`, `api/src/models/Room.js`, `api/src/utils/roomItems.js`)
- **Mass-assignment & prototype-pollution defense:**
  - `POST /api/rooms` and `PUT /api/rooms/:code` reject non-plain-object JSON bodies (`[]`, primitives) with `400`.
  - `editableFields(body)` copies only `['name', 'sceneSlug', 'cdCode', 'musicSource', 'items']` and `settings.['effect', 'lightOn', 'curtainsClosed', 'volume']`. Visitor-supplied `code`, `editKeyHash`, `official`, `__proto__`, and `constructor` keys are ignored.
  - `cdsRouter` similarly picks only `['title', 'trackIds']` and forces `official: false` on `POST /api/cds`.
- **NoSQL operator injection defense:** `sceneSlug` is checked with `typeof sceneSlug === 'string'` before `Scene.findOne({ slug: sceneSlug }).lean()`; `cds.js` verifies `trackIds` is an array of `1..30` unique non-empty strings before `Track.find({ _id: { $in: ids } }).lean()`; Express route parameters (`:code`, `:slug`, `:id`) decode to strings; Mongoose schema types reject operator objects (`{ "$gt": "" }`) on scalar fields with `400`.
- **Mongoose schema & domain bounds:**
  - `Room.name`: `trim: true, maxlength: 60`
  - `Room.cdCode`: `trim: true, maxlength: 64, match: /^[A-Za-z0-9_-]+$/`
  - `Room.musicSource`: `provider` enum (`soundcloud`, `spotify`, `youtube`, `audio`), `url` `maxlength: 2048`
  - `Room.settings`: `effect` enum (`EFFECTS` + `'none'`), booleans `lightOn`/`curtainsClosed`, `volume` `min: 0, max: 1`
  - `Cd.title`: `1..60` trimmed characters; `Cd.trackIds`: `1..30` distinct existing track IDs.
- **Scene-aware item validation & `PUT` falsy guard:** `validateItems(items, scene)` uses `Map`/`Set` lookups (immune to prototype keys) to enforce `Array.isArray(items)`, `MAX_ITEMS = 30`, `/^[A-Za-z0-9_-]{1,16}$/` unique item `id`s, scene `catalog` membership, `unique` and `flippable` constraints, per-item `scale` `[min, max]`, and surface `area` coordinate bounds. In `PUT /api/rooms/:code`, checking `fields.items !== undefined` (rather than truthiness) ensures falsy non-null values (`""`, `false`, `0`) are validated and rejected with `400` instead of bypassing `validateItems`.

### 1.6 SSRF, Redirect & Metadata Hardening (`api/src/routes/music.js`, `api/src/utils/musicSource.js`)
- **Zero-fetch URL canonicalization (`parseMusicSource`):** Enforces `https:` only, max 2048 chars, no `username`, `password`, or custom `port`. Rewrites SoundCloud, Spotify (`https:` or `spotify:` URI), and YouTube links into canonical provider URLs without making any network call. Direct audio links (`.mp3`, `.m4a`, `.ogg`, `.wav`, `.aac`) additionally reject IPv4/numeric hosts, IPv6 brackets, single-label hosts (`localhost`), and `.local`/`.internal`/`.localhost`/`.test`/`.invalid` domains. `validateMusicFields` enforces mutual exclusion between `cdCode` and `musicSource`.
- **Bounded shortener resolution (`POST /api/music/resolve`):**
  - Full provider URLs return immediately via `parseMusicSource` with **zero** outbound `fetch` calls.
  - Short links are restricted strictly to `shortHosts` (`on.soundcloud.com`, `spotify.link`) over `https:` with no credentials or port.
  - Requests use `redirect: 'manual'` and `AbortSignal.timeout(5000)`, cancel response bodies immediately (`response.body?.cancel()`), cap redirects at 4 hops, and inspect every `Location` header **before** issuing the next request — following only same-host hops and validating the cross-host destination via `parseMusicSource` + matching provider check (blocking redirects to `http://127.0.0.1`, private networks, arbitrary domains, or mismatched services before any request is sent).
- **Fixed-endpoint SoundCloud oEmbed metadata (`POST /api/music/soundcloud/metadata`):**
  - Requires `1..50` numeric string IDs matching `/^\d{1,20}$/`, preventing URL/query injection.
  - Calls only the fixed `https://soundcloud.com/oembed?format=json&url=...` endpoint with `redirect: 'error'` and `AbortSignal.timeout(6000)`, capped at 4 concurrent workers and a 500-entry FIFO cache (15-minute TTL).
  - Extracts only plain-text `title` (sliced to 240 chars) and `artist` (sliced to 120 chars), discarding untrusted `html` iframe markup returned by oEmbed.

### 1.7 Client `localStorage`, XSS & Embed Sanitization (`client/src/myRooms.js`, `client/src/music/myCds.js`, `client/src/music/myLinks.js`, `client/src/music/discovery.js`, `client/src/music/ExternalMusic.jsx`, `client/src/api.js`)
- **DOM & XSS safety:** Neither `client/src/` nor `api/src/` uses `dangerouslySetInnerHTML`, `innerHTML`, or `eval`. Room names, CD titles, and track metadata render through React text nodes. All dynamic path parameters in `client/src/api.js` pass through `encodeURIComponent`, and edit keys travel only in the `x-edit-key` request header (never in URLs or copied share links).
- **Hardened `localStorage` readers:** All storage reads/writes are wrapped in `try/catch` so blocked storage (private browsing / strict cookie policies) degrades gracefully without crashing:
  - `client/src/myRooms.js`: `validRoomEntry` requires `code` matching `/^[A-Za-z0-9_-]{1,32}$/` and optional strings for `editKey`, `name`, and `sceneSlug`.
  - `client/src/music/myCds.js`: `getMyCds` requires `code` matching `/^[A-Za-z0-9_-]{1,32}$/`, string `editKey`, and optional string `title`.
  - `client/src/music/myLinks.js`: `getMyLinks` requires string `provider` and `url` matching `/^https:\/\//i`, caps history at `12` entries, and parses display labels via `new URL(url)` inside `try/catch`.
- **Sandboxed provider embeds:** `embedUrl` (`client/src/music/discovery.js`) constructs fixed `https://w.soundcloud.com/player/` and `https://www.youtube-nocookie.com/embed/` URLs using `URLSearchParams` (binding YouTube IFrame API `origin` to `window.location.origin`), and external source anchors use `target="_blank" rel="noreferrer"` and `referrerPolicy="strict-origin-when-cross-origin"`.

---

## 2. Issues Identified & Fixed

| # | Severity | Issue Identified | Fix Applied | Files Updated |
| --- | --- | --- | --- | --- |
| 1 | Medium | `express.json()` used the 100 KB default *before* `rateLimit`, and oversized payloads (`entity.too.large`) fell through to HTTP `500` with server error logging. | Mounted `/api` `rateLimit` before `express.json({ limit: '32kb' })` and mapped `err.type === 'entity.too.large'` to HTTP `413`. | `api/src/app.js` |
| 2 | Low | Malformed percent-encoded URLs (e.g., `/api/rooms/%E0%A4%A`) threw `URIError` and returned HTTP `500` instead of `400`. | Added `if (err instanceof URIError)` branch returning `400 { error: 'Invalid URL' }`. | `api/src/app.js` |
| 3 | Medium | `POST`/`PUT /api/rooms` accepted JSON arrays (`[]`) as bodies, and `Room.cdCode` lacked length and character-set bounds (allowing arbitrary strings / HTML / 50 KB+ values). | Added `isPlainObject(req.body)` checks on `POST`/`PUT /api/rooms` and added `trim: true, maxlength: 64, match: /^[A-Za-z0-9_-]+$/` to `Room.cdCode`. | `api/src/routes/rooms.js`, `api/src/models/Room.js` |
| 4 | Medium | `PUT /api/rooms/:code` checked `if (fields.sceneSlug !== undefined \|\| fields.items)` (truthiness), letting falsy non-null `items` (`""`, `false`, `0`) bypass `validateItems()` and fail inside Mongoose. | Changed check to `fields.items !== undefined` so only `undefined` (keep) and `null` (reset to scene default) skip `validateItems()`. | `api/src/routes/rooms.js` |
| 5 | Medium | `getMyRooms()` checked only `typeof r.code === 'string'`, allowing tampered `localStorage` entries with object/array `name`/`sceneSlug` to crash React rendering or inject path slashes via `code`. | Added `validRoomEntry` (`/^[A-Za-z0-9_-]{1,32}$/` on `code` + `isOptionalString` on `editKey`, `name`, `sceneSlug`) and matching shape/regex guards in `myCds.js` and `myLinks.js`. | `client/src/myRooms.js`, `client/src/music/myCds.js`, `client/src/music/myLinks.js` |

---

## 3. Automated Security Verification Matrix

All security controls and bug fixes above are covered by automated Jest + Supertest (`api/tests/`) and Vitest (`client/src/`) suites:

| Control Area | Test Suite | Verified Assertions |
| --- | --- | --- |
| Security headers, rate-limit order, 32 KB `413` cap, `URIError -> 400` | `api/tests/protection.test.js` | `x-content-type-options: nosniff` & hidden `x-powered-by`; `429` above `requestsPerMinute` while `/api/health` stays `200`; `>32 KB` body returns `413` (not `500`); `429` fires before parsing oversized JSON; `/api/rooms/%E0%A4%A` returns `400`. |
| Edit-key entropy, SHA-256 hashing & `timingSafeEqual` safety | `api/tests/editKey.test.js` | 200 generated keys are unique 32-char `base64url` strings; hashes never contain plaintext; `keyMatches` rejects wrong case, `""`, `undefined`, `'short'`, and non-string arrays without throwing. |
| Room auth (`401`/`403`), non-leakage, `cdCode` bounds, non-object bodies & `PUT` falsy `items` | `api/tests/room.routes.test.js` | `editKeyHash` never appears in `POST`/`GET` responses; `code` & `editKeyHash` mass-assignment ignored on `POST`/`PUT`; `401` missing key & `403` wrong/cross-room key on `PUT`/`DELETE`; invalid JSON -> `400`; array body, `<script>` `cdCode`, and 100-char `cdCode` -> `400`; `PUT` with `items` in `['', false, 0]` -> `400` without mutating room; unknown item keys (`evil: true`) stripped. |
| Decorate catalog, surface & count bounds | `api/tests/roomItems.test.js` | Enforces `Array.isArray`, `MAX_ITEMS`, `ID_PATTERN`, duplicate IDs, catalog membership, `unique` & `flippable` rules, scale limits, and surface bounds. |
| Custom CD auth, `official` immutability & input bounds | `api/tests/music.routes.test.js` | `POST /api/cds` ignores `official: true`, `code`, and `editKeyHash`; `GET` omits `editKeyHash`; `PUT`/`DELETE` enforce `401`/`403` and reject `official` studio CDs with `403`; rejects empty, `>30`, duplicate, or unknown `trackIds` and `>60`-char titles with `400`. |
| SSRF, redirect allowlisting, protocol/host checks & oEmbed sanitization | `api/tests/roomMusic.test.js` | Rejects `javascript:`, subdomain spoofing (`soundcloud.com.attacker.test`), `http://localhost`, `https://127.0.0.1`, URL credentials, custom ports, and mismatched providers (`400`); full URLs resolve with `0` fetches; shortener uses `redirect: 'manual'`, blocks redirects to `127.0.0.1`/attacker/cross-provider before fetching, and caps redirect loops at 4 hops; metadata rejects `['https://127.0.0.1']`, `['123?url=private']`, and `>50` IDs with `0` fetches, caps concurrency `<= 4`, and strips untrusted oEmbed `html`. |
| Client `localStorage` sanitization & blocked-storage resilience | `client/src/myRooms.test.js` | Rejects malformed JSON, non-arrays, `bad/path` codes, and object/array/numeric `name`, `sceneSlug`, or `editKey`; degrades cleanly (`[]` / `false`) when `Storage.prototype` throws. |

### Running the Security Suites
```bash
# API unit & route security tests
cd api && npm test

# Client storage & UI tests
cd client && npm test
```

---

## 4. Production Deployment Checklist

- **Environment secrets:** Keep `MONGODB_URI` in uncommitted `.env` files only (verified ignored via `.gitignore`; templates provided in `api/.env.example` and `client/.env.example`).
- **HTTPS & CORS:** Serve both client and API over HTTPS in production; once the final frontend domain is assigned, `cors({ origin: process.env.CLIENT_ORIGIN })` can optionally replace the development wildcard.
- **Proxy hop count:** Keep `app.set('trust proxy', 1)` aligned with the hosting provider's reverse-proxy hop count so `X-Forwarded-For` cannot be spoofed to bypass `/api` rate limits.
