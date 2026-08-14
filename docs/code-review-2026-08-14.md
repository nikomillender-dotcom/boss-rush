# Boss Rush — Code Review & Developer Prompts (2026-08-14)

Automated review of the repository. All combat regression tests (`tools/*-test.mjs`)
pass. No `eslint`/`tsc` config exists in the project, so review was manual +
test-driven. Findings below are ranked by severity and each has been verified
against the actual source. Copy the **Developer Prompt** blocks straight into
Claude Code (Developer) to execute the fixes.

---

## Summary of findings

| # | Sev | Area | File | Issue |
|---|-----|------|------|-------|
| 1 | HIGH | Server | `api/_lib/ratelimit.js:65-68` | Rate limit keyed on spoofable `X-Forwarded-For` → trivially bypassed |
| 2 | HIGH | Server | `api/validate-key.js:25`, `api/check-license.js:22` | POST body of literal `null` throws → uncaught 500 |
| 3 | HIGH | Server | `api/stripe-webhook.js:50-58` | DB upsert error ignored; returns 200 → Stripe won't retry, paid user loses access |
| 4 | HIGH | Save | `src/access/saveIntegrity.js:59-68` | Tamper "reset" zeroes the wrong fields, then re-blesses tampered data with a fresh valid checksum |
| 5 | HIGH | Balance | `src/battle/scaling.js:198-213` | Mutated `scale` var inflates boss **attack** and **reward** by the HP multiplier (~65% extra) |
| 6 | HIGH | Client | `BossRush.jsx:1247,1251-1255` | `persistSave` writes `localStorage` unguarded → crashes on first coin in Safari private mode / quota-exceeded |
| 7 | MED | Server | `api/sync-save.js:155-161` | Save upsert error ignored; client told `ok:true` on failed cloud save |
| 8 | MED | Server | `api/validate-key.js:35-43`, `api/create-checkout.js:33-41` | External `fetch`/Stripe calls not wrapped → uncaught rejection → 500 |
| 9 | MED | Client | `BossRush.jsx` (`addWallet`, `resolveEnemyDamage`, reflect branch) | Side effects inside `setState` updaters double-fire under StrictMode |
| 10 | MED | Client | `BossRush.jsx:2225-2253` | Visual `setTimeout`s bypass `timersRef`, escape `clearAllTimers()` |
| 11 | LOW | Server | `api/_lib/ratelimit.js:107` | Origin allowlist accepts any `*.vercel.app` |
| 12 | LOW | Server | `api/event.js:37` | `204 No Content` returned with a JSON body |

Design-level notes (intentional "deterrent, not security" per code comments,
flagged but out of scope for a code fix): the license JWT is decoded but never
signature-verified client-side (`src/access/accessMode.js:16-26`), and the
minted token is unbound/shareable for 365 days (`api/validate-key.js:50-54`).

---

## 🎯 Developer Prompt 1 — Harden rate limiting & fix null-body 500s

**Context Files to reference:**
- `api/_lib/ratelimit.js`
- `api/validate-key.js`
- `api/check-license.js`
- `api/event.js`

**The Issue:**
The rate limiter keys on the leftmost, client-controlled `X-Forwarded-For`
value, so an attacker rotating that header lands in a fresh bucket every request
and defeats every limiter. Separately, `validate-key` and `check-license` read
`body.<field>` outside the JSON try/catch, so a POST body of the literal `null`
throws an uncaught `TypeError` → 500.

**Error Details / Code Snippet:**
```js
// api/_lib/ratelimit.js:65-68
export function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  const first = Array.isArray(fwd) ? fwd[0] : String(fwd || "").split(",")[0];
  return first.trim() || req.socket?.remoteAddress || "anon";
}

// api/validate-key.js:25  (body can be null when raw === "null")
const licenseKey = String(body.license_key || "").trim();
// api/check-license.js:22
const token = String(body.token || "").trim();
```

**Proposed Fix Strategy:**
1. In `getClientIp`, prefer the platform-trusted client IP over raw XFF. On
   Vercel use `req.headers["x-real-ip"]` (single, set by the platform) or the
   **last** hop of `x-forwarded-for` rather than the leftmost, client-supplied
   entry. Keep the `req.socket.remoteAddress` fallback but avoid collapsing all
   anonymous callers into one `"anon"` bucket.
2. In `validate-key.js:25` and `check-license.js:22`, use optional chaining
   (`body?.license_key`, `body?.token`) exactly like `event.js`/`sync-save.js`
   already do, so a non-object JSON body is handled gracefully.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that
your changes align with the existing architectural patterns in the repository
and do not break adjacent dependencies.

---

## 🎯 Developer Prompt 2 — Stop swallowing DB write errors (Stripe & save sync)

**Context Files to reference:**
- `api/stripe-webhook.js`
- `api/sync-save.js`

**The Issue:**
Both handlers `await` a Supabase `upsert` but never inspect its `{ error }`
result, then return success. On a transient DB/RLS failure the Stripe webhook
still returns `200 received:true` — Stripe treats that as delivered and never
retries, so a paying customer is charged but `purchased` is never set. The save
handler returns `{ ok: true }` on a failed cloud save, so the client believes
progress synced when it did not.

**Error Details / Code Snippet:**
```js
// api/stripe-webhook.js:50-58
await supabase.from("profiles").upsert({ id: userId, purchased: true, ... });
...
return json(res, 200, { received: true });

// api/sync-save.js:155-161
await supabase.from("profiles").upsert({ id: userId, save_data: saveData, ... });
return json(res, 200, { ok: true });
```

**Proposed Fix Strategy:**
1. Capture the upsert result: `const { error } = await supabase...upsert(...)`.
2. In `stripe-webhook.js`, on `error` (or when `userId` is missing for a
   `checkout.session.completed`) return a `5xx` so Stripe retries delivery;
   log the error server-side.
3. In `sync-save.js`, on `error` return a `5xx` with `{ ok: false }` so the
   client knows the save did not persist and can retry.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that
your changes align with the existing architectural patterns in the repository
and do not break adjacent dependencies.

---

## 🎯 Developer Prompt 3 — Fix save-integrity reset targeting the wrong fields

**Context Files to reference:**
- `src/access/saveIntegrity.js`
- `BossRush.jsx` (around `1221`, and `995,1181,1208` for per-class wallet shape)

**The Issue:**
The checksum is computed over **per-class** wallets (`save.classes[*].wallet`)
and per-class `bestFloorReached`, but on a mismatch `verifySaveIntegrity` only
zeroes the top-level `save.wallet` (which the checksum never reads) and
`records`. It then recomputes a fresh, valid checksum over the still-tampered
per-class data — so the anti-tamper check detects an edit and then permanently
legitimizes it.

**Error Details / Code Snippet:**
```js
// src/access/saveIntegrity.js:59-68
const reset = {
  ...save,
  wallet: 0,                                   // <-- checksum reads save.classes[*].wallet, not this
  records: { coins: 0, streak: 0, rounds: 0 },
  _saveChecksum: computeSaveChecksum({ ...save, wallet: 0, records: {...} }), // blesses tampered per-class data
};
return { ok: false, save: reset };
```

**Proposed Fix Strategy:**
1. Make the reset operate on the same fields the checksum reads: zero every
   `save.classes[key].wallet` and clamp/zero each `bestFloorReached` (or reset
   to a safe baseline) rather than a non-existent top-level `wallet`.
2. Recompute `_saveChecksum` only *after* the real values have been reset.
3. Add/extend a unit test (mirror `tools/save-meta-test.mjs`) proving a tampered
   per-class wallet is actually zeroed after `verifySaveIntegrity`.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that
your changes align with the existing architectural patterns in the repository
and do not break adjacent dependencies.

---

## 🎯 Developer Prompt 4 — Fix boss attack/reward inflated by the HP multiplier

**Context Files to reference:**
- `src/battle/scaling.js`
- `tools/enemy-hp-test.mjs` (existing scaling test)

**The Issue:**
In `buildEnemy`, the local `scale` variable is reassigned with `bossHpMult`
before boss **attack** and **reward** are derived from it, so both silently pick
up the ~65% HP bump on top of their own `bossAtkMult` / `bossRewardMult`. Bosses
hit far harder and pay out far more than the config implies.

**Error Details / Code Snippet:**
```js
// src/battle/scaling.js:198-213
let scale = getEnemyRoundScale(round);
if (boss) { scale *= SCALING_CONFIG.bossHpMult; }          // scale now carries the HP mult
let attack = Math.max(1, Math.round(template.attack * scale));   // <-- inflated
if (boss) { attack = Math.max(1, Math.round(attack * SCALING_CONFIG.bossAtkMult)); }
let reward = Math.round(template.reward * scale);                // <-- inflated
if (boss) { reward = Math.round(reward * SCALING_CONFIG.bossRewardMult); }
```

**Proposed Fix Strategy:**
1. Keep the un-mutated round scale for attack/reward: introduce
   `const roundScale = getEnemyRoundScale(round)` and a separate
   `const hpScale = boss ? roundScale * bossHpMult : roundScale`.
2. Compute `hp/maxHp` from `hpScale`; compute `attack` from `roundScale` then
   apply `bossAtkMult`; compute `reward` from `roundScale` then apply
   `bossRewardMult`.
3. Confirm intended balance with the team, then update/extend
   `tools/enemy-hp-test.mjs` to lock in the corrected boss attack/reward numbers.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that
your changes align with the existing architectural patterns in the repository
and do not break adjacent dependencies. Note this is a balance change — confirm
the intended boss multipliers before committing the new numbers.

---

## 🎯 Developer Prompt 5 — Guard all localStorage writes (persistSave)

**Context Files to reference:**
- `BossRush.jsx` (`persistSave` ~1251, `loadSave` first-run call ~1247, `commitSave` ~1799)

**The Issue:**
`persistSave` calls `localStorage.setItem` with no try/catch, and `commitSave`
(called on nearly every gameplay event — earning coins, victory, death, respec)
calls it. In Safari private mode, when storage is disabled, or on quota-exceeded,
the exception propagates unhandled and the game throws on the first coin earned.
The first-run `persistSave(save)` in `loadSave` (line 1247) sits *outside* the
migration try/catch too, so a brand-new device with storage disabled throws
during the initial `useState` initializer before the app mounts.

**Error Details / Code Snippet:**
```js
// BossRush.jsx:1251-1255
function persistSave(save) {
  const withChecksum = attachSaveChecksum(save);
  localStorage.setItem(META_SAVE_KEY, JSON.stringify(withChecksum)); // unguarded throw
  return withChecksum;
}
```

**Proposed Fix Strategy:**
1. Wrap the `setItem` in `persistSave` in a try/catch that swallows/logs the
   error (matching the defensive pattern already used in `loadSave`,
   `saveEffectsMode`, `BattleTutorial`, and `themeMusic`). Still return
   `withChecksum` so in-memory state stays correct.
2. Ensure the first-run `persistSave(save)` in `loadSave` cannot throw out of the
   `useState` initializer.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that
your changes align with the existing architectural patterns in the repository
and do not break adjacent dependencies.

---

## 🎯 Developer Prompt 6 — Make React updaters pure & track all timers

**Context Files to reference:**
- `BossRush.jsx` (`addWallet` ~1908, `resolveEnemyDamage` ~2261, reflect branch ~2518, `spawnFloat`/`triggerShake`/`triggerFlash`/`triggerStreakPop`/`triggerCoinPop` ~2225-2253, `schedule`/`clearAllTimers` ~1754-1772)
- `src/main.jsx` (`StrictMode`)

**The Issue:**
Several `setState` updater callbacks perform side effects (scheduling timers,
`commitSave`, nested `setState`, queuing `processVictory`). Under the enabled
`<StrictMode>` these updaters double-invoke in dev, causing double persist and
double victory rewards during dev/test runs. Separately, the transient visual
`setTimeout`s use bare `setTimeout` instead of the tracked `schedule` helper, so
they escape `clearAllTimers()` and fire after unmount/retreat/death.

**Error Details / Code Snippet:**
```js
// e.g. BossRush.jsx:2261-2277 — side effects inside setEnemy updater
setEnemy((prev) => { ...; onAfterDamage(); schedule(() => processVictory()); ... });

// BossRush.jsx:2225 — untracked timer
setTimeout(() => { ... }, ms);   // not registered in timersRef, survives clearAllTimers()
```

**Proposed Fix Strategy:**
1. Move side effects out of the `setState` updater bodies — compute next state
   purely inside the updater, then perform `commitSave`/timer scheduling/
   `processVictory` in an effect or after the setter returns.
2. Route `spawnFloat`, `triggerShake`, `triggerFlash`, `triggerStreakPop`,
   `triggerCoinPop` through the tracked `schedule` helper so `clearAllTimers`
   cancels them on unmount/retreat/death.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that
your changes align with the existing architectural patterns in the repository
and do not break adjacent dependencies. Re-run the combat regression tests in
`tools/*-test.mjs` afterward.

---

## 🎯 Developer Prompt 7 — Tighten origin allowlist & 204 body (low priority)

**Context Files to reference:**
- `api/_lib/ratelimit.js`
- `api/event.js`
- `api/validate-key.js`, `api/create-checkout.js` (uncaught external calls)

**The Issue:**
`isAllowedOrigin` accepts any `*.vercel.app` host, weakening the CSRF/origin
guard for public token-minting endpoints. `event.js` returns `204 No Content`
with a JSON body (spec-violating). External `fetch`/Stripe calls in
`validate-key`/`create-checkout` are not wrapped in try/catch, so a transient
network error becomes an uncaught 500 instead of a controlled response.

**Error Details / Code Snippet:**
```js
// api/_lib/ratelimit.js:107
if (host.endsWith(".vercel.app")) return true;   // too broad

// api/event.js:37
return json(res, 204, {});   // 204 must not carry a body
```

**Proposed Fix Strategy:**
1. Replace the `*.vercel.app` catch-all with the specific deploy host(s) already
   listed in `ALLOWED_API_HOSTS` (keep the preview-deploy need in mind — allow an
   env-driven list rather than the whole apex).
2. For 204, end the response with no body (`res.statusCode = 204; res.end()`), or
   return `200 {}` if a body is desired.
3. Wrap the Payhip `fetch`/`phRes.json()` and `stripe.checkout.sessions.create`
   calls in try/catch returning a controlled `502/503`; handle a Stripe session
   with no `url`.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that
your changes align with the existing architectural patterns in the repository
and do not break adjacent dependencies.
