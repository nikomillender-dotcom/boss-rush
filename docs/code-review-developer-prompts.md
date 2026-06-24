# Code Review → Developer Prompts

Generated 2026-06-24 by an automated repo scan (review-only; no fixes applied).
Each block below is a ready-to-paste prompt for Claude Code (Developer). Findings
were verified against the working tree; line numbers reference the state of the
repo at review time and may drift as the file changes — re-grep the named symbols
if they don't line up.

Severity summary:
- **HIGH** — Freeze skill deals double damage (gameplay) · Stripe webhook silently drops paid entitlements
- **MEDIUM** — Cloud save reports success on DB failure · Rate limiter fails open · `persistSave` can throw mid-combat · `addWallet` runs side effects inside a setState updater · JWTs verified without algorithm pinning · `validate-key` Payhip fetch unguarded
- **LOW** (bundled) — Untracked animation timers leak · player-death path skips `clearAllTimers()` · log buffer off-by-one

---

## 🎯 Developer Prompt A — Freeze skill double damage (HIGH)

**Context Files to reference:**
- `BossRush.jsx`

**The Issue:**
The `damage_freeze` skill applies its damage twice: it manually subtracts HP in a
`setEnemy` updater **and** then calls `resolveEnemyDamage(damage)`, which subtracts
the same amount again. Every other damage skill does exactly one of these, not both.

**Error Details / Code Snippet:**
`BossRush.jsx` `case "damage_freeze"` (~3154–3181):
```js
setEnemy((prev) => {
  if (!prev) return prev;
  return {
    ...prev,
    hp: Math.max(0, prev.hp - damage),   // (1) subtract here
    freezeTurnsLeft: freezeTurns,
  };
});
// ...
resolveEnemyDamage(damage);              // (2) resolveEnemyDamage subtracts `damage` AGAIN
```
For comparison, `case "damage_steal"` (~3184) does NOT pre-subtract — it relies solely
on `resolveEnemyDamage(damage)`. `resolveEnemyDamage` (~2259) does
`const newHp = Math.max(0, prev.hp - damage)` and also schedules the victory/enemy-turn
transition, so it must be the single source of HP application.

**Proposed Fix Strategy:**
1. In the `damage_freeze` `setEnemy` updater, stop subtracting HP — set only
   `freezeTurnsLeft` (and the frozen flag), leaving HP untouched.
2. Keep the single `resolveEnemyDamage(damage)` call so damage and the turn/victory
   transition are applied exactly once, matching `damage_steal`.
3. Sanity-check the freeze-damage tooltip/number against the actual HP delta after the fix.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your
changes align with the existing architectural patterns in the repository and do not
break adjacent dependencies.

---

## 🎯 Developer Prompt B — Payment & cloud-save silent failures (HIGH / MEDIUM)

**Context Files to reference:**
- `api/stripe-webhook.js`
- `api/sync-save.js`

**The Issue:**
Two serverless handlers `await` a Supabase write but never inspect the returned
`{ error }`, then unconditionally return a success status. A failed DB write is reported
as success — in the Stripe case this permanently strands a paying customer without their
`purchased` flag (Stripe sees 200 and never retries); in the sync-save case the player
believes their cloud save persisted when it did not.

**Error Details / Code Snippet:**
`api/stripe-webhook.js` (~50–58):
```js
await supabase.from("profiles").upsert({
  id: userId, purchased: true, updated_at: new Date().toISOString(),
});                       // error ignored
...
return json(res, 200, { received: true });   // 200 even on write failure → Stripe won't retry
```
`api/sync-save.js` (~155–161): same pattern — `await ...upsert(...)` then
`return json(res, 200, { ok: true })` with no error check. There is also **no
idempotency/dedup on `event.id`** in the webhook.

**Proposed Fix Strategy:**
1. Capture `const { error } = await supabase.from("profiles").upsert(...)` in both handlers.
2. In `stripe-webhook.js`, on `error` log it and return a **non-2xx** (e.g. 500) so Stripe
   retries delivery; only return 200 once the upsert succeeds.
3. In `sync-save.js`, on `error` return a 5xx with a generic body (no raw DB detail) so the
   client can surface "save failed" instead of a false success.
4. (Optional, recommended) Add Stripe idempotency: record processed `event.id`s (or use an
   upsert keyed such that replays are no-ops) to make retries safe.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your
changes align with the existing architectural patterns in the repository and do not
break adjacent dependencies.

---

## 🎯 Developer Prompt C — API hardening: rate limit, JWT, unguarded fetch (MEDIUM)

**Context Files to reference:**
- `api/_lib/ratelimit.js`
- `api/check-license.js`
- `api/check-access.js`
- `api/validate-key.js`

**The Issue:**
Three independent hardening gaps in the public API surface: the rate limiter fails open
when KV is unconfigured (silently disabling every limiter in prod if env vars are missing),
JWTs are verified without pinning the algorithm, and the Payhip `fetch` in `validate-key`
is the one network call in the file not wrapped in try/catch.

**Error Details / Code Snippet:**
- `api/_lib/ratelimit.js` `checkRateLimit` (~80–87): `if (!limiters || !limiters[bucket]) return { ok: true }` → fail-open when Upstash env vars absent. `getClientIp` (~65–69) trusts the leftmost `x-forwarded-for` value.
- `api/check-license.js:27` and `api/check-access.js` (~43): `await jwtVerify(token, key)` with no `{ algorithms: ["HS256"] }`, even though the signer (`validate-key.js`) only ever issues HS256.
- `api/validate-key.js` (~35–43): `const phRes = await fetch(...)` / `phRes.json()` not wrapped in try/catch (every other parse in the file is), so a Payhip timeout throws an unhandled rejection → generic 500.

**Proposed Fix Strategy:**
1. Decide fail-open vs fail-closed for `checkRateLimit` deliberately: in production (env
   present-or-expected) prefer fail-closed or at minimum `log()`/alert when KV is missing so
   it can't silently disable limits unnoticed.
2. Pass `{ algorithms: ["HS256"] }` to every `jwtVerify` call to eliminate algorithm-confusion surface.
3. Wrap the Payhip `fetch`/`json()` in `validate-key.js` in try/catch and return a clean
   `502`/`503` (e.g. `{ error: "upstream_unavailable" }`) instead of crashing the handler.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your
changes align with the existing architectural patterns in the repository and do not
break adjacent dependencies. Note: on Vercel the platform sets the leftmost
`x-forwarded-for` value, so treat the IP-spoofing angle as defense-in-depth, not the
primary fix.

---

## 🎯 Developer Prompt D — Client robustness: storage, updater purity, leaked timers (MEDIUM / LOW)

**Context Files to reference:**
- `BossRush.jsx`

**The Issue:**
Several reliability gaps in the React game loop: `persistSave` calls
`localStorage.setItem` with no try/catch (throws mid-combat in private mode / over quota);
`addWallet` performs persistence/cloud-sync side effects *inside* a `setWallet` updater
(impure, double-fires under StrictMode); a cluster of animation helpers schedule raw
`setTimeout`s that are never tracked or cleared; and the player-death path doesn't call
`clearAllTimers()` the way the victory paths do.

**Error Details / Code Snippet:**
- `BossRush.jsx` `persistSave` (~1251–1255): bare `localStorage.setItem(...)`. The sibling
  `saveEffectsMode` (~1603) *is* try/catch-guarded — make `persistSave` consistent.
- `addWallet` (~1905–1916): `commitSave(setClassWallet(...))` runs *inside*
  `setWallet((prev) => { ...; commitSave(...); return next; })` — updater must be pure.
- `spawnFloat`/`triggerShake`/`triggerFlash`/`triggerStreakPop`/`triggerCoinPop` (~2218–2253):
  raw `setTimeout` IDs not pushed to `timersRef`, so not cleared by `clearAllTimers` (~1767)
  or the unmount cleanup (~1772).
- Player-death branch in `processEnemyTurn` (~2573–2576): schedules `processDeath` at +600ms
  but, unlike the victory paths (~2453/2522), does not call `clearAllTimers()` first.
- Minor: `addLogEntry` (~2212) keeps `maxLogEntries` then appends one more → buffer is
  `maxLogEntries + 1`.

**Proposed Fix Strategy:**
1. Wrap `persistSave`'s `localStorage.setItem` in try/catch (mirror `saveEffectsMode`); swallow/log on failure so combat never crashes on storage errors.
2. Move the `commitSave(...)` side effect out of the `setWallet` updater: compute `next`,
   update the ref, return `next` from the pure updater, then call `commitSave` afterward.
3. Route the animation `setTimeout`s through the tracked `schedule` helper (or push their IDs
   into `timersRef`) so they're cleared on scene/battle teardown.
4. Call `clearAllTimers()` on the player-death path before scheduling `processDeath`, matching
   the victory paths, to prevent a queued player-turn timer from re-entering on a dead player.
5. Fix the `addLogEntry` slice off-by-one so the bounded buffer respects `maxLogEntries`.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your
changes align with the existing architectural patterns in the repository and do not break
adjacent dependencies. After changes, re-run the combat regression tests in `tools/`
(`auto-control-test.mjs`, `skill-cooldown-test.mjs`, `war-cry-test.mjs`, `save-meta-test.mjs`).
