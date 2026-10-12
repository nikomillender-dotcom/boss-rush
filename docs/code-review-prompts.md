# Boss Rush — Code Review & Developer Prompts

_Automated repository scan. Generated 2026-10-12 on branch `claude/exciting-ritchie-iimeou`._

## Health summary

- **Tests:** all 14 combat regression suites pass (`auto-control`, `skill-cooldown`, `war-cry`, `save-meta`, `poison-math`, `enemy-hp`, `lifesteal-math`, `afterburn-carriers`, `combat-freeze`, `boss-skip`, `class-unlock`, `combo-unlock`, `freeze-order`, `theme-music`).
- **Build:** `npm run build` succeeds (362 KB JS / 111 KB gzip, PWA precache 407 entries).
- **Recent respec feature (v1.0.8):** `computeRespecRefund` exactly mirrors the purchase price curve (`shopPriceForClass` with the same `hpPrice/atkPrice/defPrice/skillPrice`, combo ×3 included), so refunds equal coins paid. Wallet persistence ordering is correct (`spendWallet` commits before `patchClassMeta` reads `saveRef.current`). No bug found here.

No critical or high-severity runtime bugs were found. The items below are minor correctness / hygiene issues. Each is formatted as a ready-to-paste Claude Code (Developer) prompt. They are independent — hand over one, several, or all.

---

## Prompt 1 — HTTP 204 response carries a JSON body (protocol violation)

**🎯 Developer Prompt**

**Context Files to reference:**
- `api/event.js`
- `api/_lib/http.js`

**The Issue:**
The analytics event endpoint returns `json(res, 204, {})` on success. HTTP 204 "No Content" responses must not include a message body, but `json()` writes `JSON.stringify(body)` and sets `Content-Type`. Strict proxies/clients (and some edge runtimes) reject or warn on a 204-with-body.

**Error Details / Code Snippet:**
```js
// api/event.js:37 — success path
return json(res, 204, {});

// api/_lib/http.js — json() always writes a body
export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}
```

**Proposed Fix Strategy:**
1. On the success path in `api/event.js`, end the response with no body: set `res.statusCode = 204` and call `res.end()` directly (or return `200` with `{ ok: true }` if a body is actually wanted).
2. Do not change `json()`'s general behavior; only the 204 caller needs the no-body treatment.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository and do not break adjacent dependencies.

---

## Prompt 2 — Save size guard counts UTF-16 code units, not bytes

**🎯 Developer Prompt**

**Context Files to reference:**
- `api/sync-save.js`

**The Issue:**
The 64 KB save-size guard measures `String.prototype.length` (UTF-16 code units), not UTF-8 byte length. Multi-byte characters (emoji, accented locale strings) make this check under- or over-count the real payload size, so it does not enforce `MAX_SAVE_BYTES` as named.

**Error Details / Code Snippet:**
```js
// api/sync-save.js:147
const rawSize = JSON.stringify(body?.save_data ?? {}).length;
if (rawSize > MAX_SAVE_BYTES) {
  return json(res, 413, { error: "save_too_large" });
}
```

**Proposed Fix Strategy:**
1. Measure actual UTF-8 bytes, e.g. `Buffer.byteLength(JSON.stringify(body?.save_data ?? {}), "utf8")`.
2. Keep the existing `readJsonBody(req, MAX_SAVE_BYTES + 1024)` byte-based guard as the primary limit; this secondary check should agree with it in units.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository and do not break adjacent dependencies.

---

## Prompt 3 — Origin allow-list accepts every `*.vercel.app` host

**🎯 Developer Prompt**

**Context Files to reference:**
- `api/_lib/ratelimit.js` (`isAllowedOrigin`, `ALLOWED_API_HOSTS`)
- `api/event.js`, `api/validate-key.js`, `api/check-license.js` (callers)

**The Issue:**
`isAllowedOrigin` returns `true` for any host ending in `.vercel.app`. Since anyone can deploy a site to `*.vercel.app`, this wildcard effectively lets arbitrary third-party origins call the public (unauthenticated) endpoints, weakening the intended CSRF/abuse barrier.

**Error Details / Code Snippet:**
```js
// api/_lib/ratelimit.js:107
if (host.endsWith(".vercel.app")) return true;
```

**Proposed Fix Strategy:**
1. Replace the broad wildcard with an explicit allow-list of the app's own preview/prod hosts (e.g. the exact production host plus a known preview pattern scoped to this project), or gate the wildcard behind a check that the subdomain belongs to this project.
2. Keep the "no Origin header → allow" same-origin behavior unchanged.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository and do not break adjacent dependencies.

---

## Prompt 4 — Dead constants left behind after `attachSeamlessLoop` refactor

**🎯 Developer Prompt**

**Context Files to reference:**
- `src/audio/themeMusic.js`

**The Issue:**
`attachSeamlessLoop` was simplified to drop its `src` parameter and the tail-trim logic (it now relies on native `audio.loop`). The constants that fed that logic are now unreferenced dead code.

**Error Details / Code Snippet:**
```js
// src/audio/themeMusic.js:37 and :39 — no remaining consumers
const DEFAULT_LOOP_TAIL_TRIM = 0.08;
const LOOP_TAIL_TRIM_BY_SRC = { /* ... */ };
```

**Proposed Fix Strategy:**
1. Remove `DEFAULT_LOOP_TAIL_TRIM` and `LOOP_TAIL_TRIM_BY_SRC` (confirm no other references first: `grep -rn "LOOP_TAIL_TRIM\|DEFAULT_LOOP_TAIL" src/`).
2. If the tail-trim behavior is intended to return later, add a short comment instead of leaving orphaned constants.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository and do not break adjacent dependencies.

---

## Prompt 5 — Respec zeroes `spBoost` without refunding it

**🎯 Developer Prompt**

**Context Files to reference:**
- `BossRush.jsx` (`respecClass`, `computeRespecRefund`)

**The Issue:**
`respecClass` resets `spBoost: 0`, but `computeRespecRefund` intentionally excludes `spBoost` from the refund. There is no in-game shop path that increases `spBoost` today (so in practice it is always 0), but the save sanitizer clamps an incoming `spBoost` to `maxSpBoost`, so a legacy/cloud save with a nonzero value would silently lose it with no refund on respec.

**Error Details / Code Snippet:**
```js
// computeRespecRefund — comment: "Weapons and spBoost are excluded."
// respecClass — nextMeta sets:  spBoost: 0,
```

**Proposed Fix Strategy:**
1. Decide the intended contract: either (a) do not reset `spBoost` during respec (leave it untouched since it isn't refundable), or (b) include `spBoost` in `computeRespecRefund` (using `spPrice`) and keep resetting it.
2. Make the `respecClass` reset and the `computeRespecRefund` inclusion list consistent with that decision, and update the doc comment.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository and do not break adjacent dependencies.

---

## Prompt 6 — Dependency audit (build/dev chain)

**🎯 Developer Prompt**

**Context Files to reference:**
- `package.json`, `package-lock.json`

**The Issue:**
`npm audit` reports 10 vulnerabilities (8 high) in build/dev transitive dependencies (`@babel/core`, `browserslist`, `brace-expansion`, `baseline-browser-mapping`). These are build-time only (not shipped in the client bundle), so real-world risk is low, but they are all fixable without a major bump.

**Error Details / Code Snippet:**
```
# npm audit — all "fix available via `npm audit fix`"
@babel/core <=7.29.0      — Arbitrary File Read via sourceMappingURL
brace-expansion            — multiple DoS advisories (high)
browserslist <=4.28.6      — unbounded memory growth / crash (high)
baseline-browser-mapping   — DoS on invalid input (moderate)
```

**Proposed Fix Strategy:**
1. Run `npm audit fix`, then re-run `npm run build` and the combat regression tests to confirm nothing regresses.
2. Commit the updated `package-lock.json` only; do not commit `dist/`.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository and do not break adjacent dependencies.
