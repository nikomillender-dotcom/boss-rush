# Boss Rush — Code Review & Developer Fix Prompts

Generated from a full review of the repo at `v1.0.8` (branch `claude/exciting-ritchie-yt6nyl`).

**State of the tree:** `npm run build` succeeds; all 14 `tools/*-test.mjs` suites pass; no ESLint/TS
config exists, so these findings come from manual review of `BossRush.jsx`, `api/`, and `src/access/`.
Every issue below was verified against the actual source with line numbers.

Copy any block below straight into Claude Code (Developer). They are ordered by severity.

---

## 🎯 Developer Prompt 1 — Freeze & Bio skills deal DOUBLE damage (HIGH, gameplay)

**Context Files to reference:**
- `BossRush.jsx`

**The Issue:**
The `damage_freeze` (Blizzard) and `combo_bio` (Sage Bio) skills subtract the enemy's HP twice:
once in their own `setEnemy` updater and again inside the shared `resolveEnemyDamage`, so enemies
lose `2 × damage` while the log/floating number only shows `−damage`.

**Error Details / Code Snippet:**
`resolveEnemyDamage` already subtracts `damage` itself:
```jsx
// BossRush.jsx:2261
setEnemy((prev) => {
  if (!prev) return prev;
  const newHp = Math.max(0, prev.hp - damage);   // subtract #1 (shared path)
  ...
```
But `damage_freeze` pre-subtracts, THEN calls `resolveEnemyDamage(damage)`:
```jsx
// BossRush.jsx:3157
setEnemy((prev) => ({ ...prev, hp: Math.max(0, prev.hp - damage), freezeTurnsLeft: freezeTurns })); // subtract #2a
...
resolveEnemyDamage(damage); // BossRush.jsx:3180 — subtracts AGAIN
```
`combo_bio` has the identical defect (`setEnemy` HP subtract at ~`BossRush.jsx:3355`, then
`resolveEnemyDamage(damage)` at ~`BossRush.jsx:3374`). Contrast `apply_poison` (~3281) and
`damage_steal` (3184), which do NOT pre-subtract and are correct.

**Proposed Fix Strategy:**
1. In `damage_freeze`, remove the `hp: Math.max(0, prev.hp - damage)` line from its `setEnemy`
   updater so that updater only sets `freezeTurnsLeft` (and any flags); let the following
   `resolveEnemyDamage(damage)` be the single source of HP subtraction and kill handling.
2. Apply the same change to `combo_bio`: the pre-emptive `setEnemy` should only write the
   poison/DoT flag, not subtract HP, since `resolveEnemyDamage(damage)` follows.
3. Verify the freeze/poison flag still lands before the kill check (order the flag-setting
   `setEnemy` before `resolveEnemyDamage`), and confirm the floating number now matches actual HP lost.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align
with the existing architectural patterns in the repository and do not break adjacent dependencies.
Add or extend a `tools/*-test.mjs` case asserting freeze/bio subtract HP exactly once.

---

## 🎯 Developer Prompt 2 — Save tamper-reset resets the WRONG fields, then re-blesses cheated data (HIGH)

**Context Files to reference:**
- `src/access/saveIntegrity.js`

**The Issue:**
On a checksum mismatch, `verifySaveIntegrity` zeroes the legacy top-level `save.wallet` and
`save.records` — but the checksum is computed from **per-class** wallets, `accountBestFloor`, and
`purchased`, none of which are reset. It then stamps a fresh valid checksum onto the still-tampered
save, legitimizing the cheat. A missing checksum is also treated as fully trusted.

**Error Details / Code Snippet:**
```js
// saveIntegrity.js:34  — checksum reads PER-CLASS wallet, bestFloor, purchased
wallet: totalWallet(save),           // sums save.classes[*].wallet
bestFloor: accountBestFloor(save),
purchased: Boolean(save?.purchased),
```
```js
// saveIntegrity.js:52
if (!expected) return { ok: true, save };   // no checksum => trusted (bypass)
...
// saveIntegrity.js:59  — reset touches fields the checksum never reads
const reset = {
  ...save,
  wallet: 0,                                  // legacy top-level, unused by checksum
  records: { coins: 0, streak: 0, rounds: 0 },
  _saveChecksum: computeSaveChecksum({ ...save, wallet: 0, records: {...} }),
};
```

**Proposed Fix Strategy:**
1. Make the reset actually neutralize the checksum inputs: zero each `save.classes[*].wallet`,
   reset each class's `bestFloorReached` to 0 (or a safe baseline), and force `purchased` to the
   server-verified value rather than the save's own field.
2. Recompute `_saveChecksum` from that fully-reset object so the stamp matches the reset state.
3. Treat a missing `_saveChecksum` as a mismatch (reset path), not as trusted — legacy saves can be
   re-blessed only after being normalized through the reset.
4. Keep `purchased` authority on the server (`/api/check-access`); never let a local save flip it to `true`.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align
with the existing architectural patterns in the repository and do not break adjacent dependencies.
Update `tools/save-meta-test.mjs` to assert a tampered per-class wallet / `purchased` flag is cleared.

---

## 🎯 Developer Prompt 3 — Rate limiting is bypassable via spoofed `x-forwarded-for` (HIGH, security)

**Context Files to reference:**
- `api/_lib/ratelimit.js`

**The Issue:**
`getClientIp` keys the limiter on the **leftmost** value of the client-supplied `x-forwarded-for`
header. On Vercel that entry is attacker-controlled (the platform appends the real IP to the right),
so a caller can send a random XFF per request to get a fresh bucket every time — defeating every
limiter (checkout, validate-key, event, etc.).

**Error Details / Code Snippet:**
```js
// api/_lib/ratelimit.js:66
const fwd = req.headers["x-forwarded-for"];
const first = Array.isArray(fwd) ? fwd[0] : String(fwd || "").split(",")[0];
return first.trim() || req.socket?.remoteAddress || "anon";
```

**Proposed Fix Strategy:**
1. Prefer the platform-trusted header: use `x-real-ip` (or `x-vercel-forwarded-for`) as the client
   identity; fall back to `req.socket?.remoteAddress`.
2. If `x-forwarded-for` must be used, take the **right-most untrusted** entry per Vercel's proxy model,
   not the left-most.
3. Also wrap the limiter call in try/catch (see Prompt 4) so an Upstash outage fails closed-or-open by
   design, not by unhandled crash.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align
with the existing architectural patterns in the repository and do not break adjacent dependencies.

---

## 🎯 Developer Prompt 4 — API routes crash (500) on predictable inputs & downstream failures (MED)

**Context Files to reference:**
- `api/event.js`
- `api/_lib/http.js`
- `api/_lib/ratelimit.js`
- `api/check-license.js`
- `api/validate-key.js`
- `api/create-checkout.js`
- `api/stripe-webhook.js`

**The Issue:**
Several handlers throw unhandled exceptions (→ raw 500) on inputs or downstream failures they should
handle gracefully, and one silently drops failed DB writes.

**Error Details / Code Snippet:**
- **`api/event.js:21`** — `readJsonBody(req)` is called with no `maxBytes`, so the whole body is
  streamed and `JSON.parse`d before the `MAX_EVENT_BYTES` check on line 23 ever runs; the size guard
  is ineffective. (`sync-save.js` already passes a limit.)
- **`api/check-license.js:22`** and **`api/validate-key.js:25`** — `String(body.token ...)` /
  `String(body.license_key ...)` run **outside** the try that wraps `readJsonBody`. A literal `null`
  body (`JSON.parse("null")===null`) makes `body.token` throw `TypeError` → unhandled 500 instead of 400.
- **`api/_lib/ratelimit.js:84`** — `await limiters[bucket].limit(ip)` has no try/catch; an Upstash
  outage rejects and every rate-limited endpoint 500s (it's awaited before each handler's try block).
- **`api/validate-key.js:35`** (`fetch` to Payhip) and **`api/create-checkout.js:33`**
  (`stripe.checkout.sessions.create`) have no try/catch around the external call → unhandled 500 on
  any network/API error.
- **`api/stripe-webhook.js:50`** — the `supabase.from("profiles").upsert(...)` result `{ error }` is
  never checked (supabase-js returns errors, doesn't throw); the handler returns `200 {received:true}`
  even when the write failed, so Stripe never retries and a paying customer may never get `purchased:true`.

**Proposed Fix Strategy:**
1. `event.js`: pass `MAX_EVENT_BYTES` to `readJsonBody(req, MAX_EVENT_BYTES)` and return 413 on the
   thrown `PayloadTooLargeError`.
2. `check-license.js` / `validate-key.js`: coerce a `null`/non-object body to `{}` (e.g.
   `const b = body && typeof body === "object" ? body : {}`), or move the field access inside the try
   and return 400 on failure. Use optional chaining like `event.js`/`sync-save.js` do.
3. `ratelimit.js`: wrap `.limit()` in try/catch; decide fail-open vs fail-closed explicitly and log.
4. `validate-key.js` / `create-checkout.js`: wrap the external call in try/catch and return a clean
   502/503 with a non-leaking message.
5. `stripe-webhook.js`: inspect the `{ error }` from `upsert`; on DB error return a non-2xx so Stripe
   retries. Apply the same unchecked-error fix to `sync-save.js:117`/`155`.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align
with the existing architectural patterns in the repository and do not break adjacent dependencies.
Do not leak stack traces in error responses.

---

## 🎯 Developer Prompt 5 — Aegis Mirror reflect-kill races a stale `enemyRef` (MED)

**Context Files to reference:**
- `BossRush.jsx`

**The Issue:**
In the reflect-guard path (`hasReflectGuard`) of `processEnemyTurn`, a `queueMicrotask` reads
`enemyRef.current` to decide whether the enemy died — but `enemyRef` is only refreshed on the next
render, so it holds pre-reflect HP. When reflected damage is the killing blow, the guard sees `hp > 0`
and calls `beginPlayerTurn()`, while the `setEnemy` updater has separately queued `processVictory()`
— a redundant turn scheduled against an already-dead enemy plus a turn-state race.

**Error Details / Code Snippet:**
```jsx
// BossRush.jsx ~2519
setEnemy((prev) => {
  const reflectedHp = Math.max(0, prev.hp - reflectDmg);
  if (reflectedHp <= 0) { ...; schedule(..., () => processVictory()); }  // ~2524
  return { ...prev, hp: reflectedHp };
});
queueMicrotask(() => {
  const currentFoe = enemyRef.current;          // ~2529 STALE (pre-reflect HP)
  if (currentFoe && currentFoe.hp <= 0) { finishEnemyTurn(); return; }  // never true on fresh kill
  ... beginPlayerTurn(); finishEnemyTurn();      // runs even though enemy just died
});
```

**Proposed Fix Strategy:**
1. Compute the reflected HP once in a local variable (or set a ref synchronously inside the updater)
   and branch on that value, not on the stale `enemyRef.current`.
2. Ensure exactly one of `processVictory()` / `beginPlayerTurn()` is scheduled per reflect resolution;
   guard `beginPlayerTurn` behind the same `reflectedHp <= 0` check.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align
with the existing architectural patterns in the repository and do not break adjacent dependencies.

---

## 🎯 Developer Prompt 6 — Cleanup batch: leaked FX timers, off-by-one log, unguarded promise, impure updaters (LOW)

**Context Files to reference:**
- `BossRush.jsx`

**The Issue:**
A cluster of low-severity robustness/correctness issues in the main component.

**Error Details / Code Snippet:**
- **Untracked FX timers** — `spawnFloat` (`~2225`), `triggerShake`/`triggerFlash`/`triggerStreakPop`/
  `triggerCoinPop` (`~2235`/`2241`/`2247`/`2253`) use bare `setTimeout` whose ids are NOT pushed into
  `timersRef`, so `clearAllTimers()` and the unmount cleanup (`~1772`) never cancel them; they also
  ignore `battleSpeedMultiplier`, so at 4× AUTO speed they outlive their turn.
- **Log off-by-one** — `addLogEntry` (`~2211`) does `[...prev.slice(-maxLogEntries), newEntry]`, keeping
  `maxLogEntries + 1` (41) entries instead of 40.
- **Unguarded promise** — `supabase.auth.getSession().then(...)` (`~1726`) has no `.catch`, unlike its
  siblings in the same effect.
- **Impure state updaters** — `addWallet` (`~2908`) writes `walletRef.current` and calls `commitSave`
  (localStorage + cloud sync) *inside* `setWallet`; `beginPlayerTurn` (`~2052`) writes
  `battleTurnRef.current` inside `setBattleTurn`. Under StrictMode double-invocation these fire twice.

**Proposed Fix Strategy:**
1. Route FX timeouts through the existing `schedule`/`timersRef` mechanism (or push their ids into
   `timersRef`) so they respect `battleSpeedMultiplier` and are cancelled by `clearAllTimers()`.
2. Change the slice to `prev.slice(-(GAME_CONFIG.maxLogEntries - 1))` (or slice after appending) so the
   log stabilizes at exactly `maxLogEntries`.
3. Add `.catch` to the `getSession()` call, matching the sibling `refreshAccessFromServer().catch(...)`.
4. Move ref writes and `commitSave`/`scheduleCloudSync` out of the updater bodies: compute `next` in the
   updater (pure) and perform the side effects after `setState`, or in an effect keyed on the new value.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align
with the existing architectural patterns in the repository and do not break adjacent dependencies.

---

## 🎯 Developer Prompt 7 — Hardening: pin JWT alg, tighten origin/domain allow-lists, verify license server-side (LOW)

**Context Files to reference:**
- `api/check-access.js`
- `api/check-license.js`
- `api/_lib/ratelimit.js`
- `src/access/accessMode.js`
- `src/access/domainLock.js`
- `src/access/constants.js`

**The Issue:**
Defense-in-depth gaps. None is a full break on its own, but together they weaken the license/anti-clone posture.

**Error Details / Code Snippet:**
- `jwtVerify(token, key)` in `check-access.js:43` and `check-license.js:27` does not pass
  `{ algorithms: ["HS256"] }` (tokens are signed HS256 in `validate-key.js:51`).
- `ratelimit.js:107` allows any `*.vercel.app` origin; `domainLock.js:11` allows any `*.vercel.app`
  host; `constants.js:14` includes `""` in `ALLOWED_HOSTS` (permits empty/`file://` hostnames).
- `accessMode.js:16` grants `"full"` from a `decodeJwt` (no signature verification) with `exp` only
  checked when present, so a hand-crafted `{"licensed":true}` token with no `exp` unlocks full access
  client-side.

**Proposed Fix Strategy:**
1. Pass `{ algorithms: ["HS256"] }` to both `jwtVerify` calls.
2. Narrow the `*.vercel.app` allowances to the specific preview host(s) you actually deploy; remove `""`
   from `ALLOWED_HOSTS`.
3. For anything that gates paid content, treat the client `getAccessMode()` as a hint only and confirm
   entitlement via the server (`/api/check-access` / `/api/check-license`, which DO verify the signature)
   before unlocking; keep purchase authority server-side.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align
with the existing architectural patterns in the repository and do not break adjacent dependencies.
Note that client-side gating is inherently soft; the goal is to move the trust boundary to the server,
not to perfect the client check.
