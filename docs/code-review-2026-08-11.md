# Boss Rush — Code Review & Developer Prompts (2026-08-11)

Automated review of the most recently changed logic (v1.0.8 respec, per-class
wallets, combat, access/save layer, API routes). Existing regression tests all
pass (`skill-cooldown`, `war-cry`, `save-meta`, `poison-math`, `lifesteal`,
`freeze-order`, `enemy-hp`). The respec refund math was audited and is correct.

Issues below are ranked by severity. Each is formatted as a ready-to-paste
prompt for Claude Code (Developer). Verified findings were confirmed by reading
the code; the failure scenario for each is concrete.

---

## 1. Ice/Bio skills deal DOUBLE their listed damage  ⚠️ gameplay-breaking

**🎯 Developer Prompt**

**Context Files to reference:**
- `BossRush.jsx` (`executeSkill`, cases `damage_freeze` ~L3154-3181 and `combo_bio` ~L3348-3376; helper `resolveEnemyDamage` ~L2259)

**The Issue:**
The `damage_freeze` and `combo_bio` skill cases subtract the enemy's HP twice, so
these skills deal 2× their listed damage while the floating number and battle log
only show 1×.

**Error Details / Code Snippet:**
```js
// damage_freeze (same shape in combo_bio)
setEnemy((prev) => ({ ...prev, hp: Math.max(0, prev.hp - damage), freezeTurnsLeft }));  // subtract #1
...
resolveEnemyDamage(damage);   // resolveEnemyDamage ALSO does prev.hp - damage  → subtract #2
```
`resolveEnemyDamage` (L2263) independently applies `newHp = Math.max(0, prev.hp - damage)`.
React runs both functional updaters sequentially against accumulated state, so HP
drops by `2 * damage`. The float (`spawnFloat("❄️−${damage}")`) and log show only one hit.
Correct sibling cases: `apply_poison` subtracts inline and manually schedules the
turn transition WITHOUT calling `resolveEnemyDamage`; `damage_steal`/`damage_lifesteal`
call `resolveEnemyDamage` ONLY and never pre-subtract. These two cases wrongly mix both.

**Proposed Fix Strategy:**
1. In both cases, keep the inline `setEnemy` for attaching the status effect
   (`freezeTurnsLeft` / poison fields) but REMOVE the `hp` subtraction from that updater.
2. Let the single `resolveEnemyDamage(damage)` call be the only place HP is reduced,
   so kill detection and turn transitions run once with the correct amount.
3. Verify against `damage_steal` as the reference pattern; add/extend a math test
   asserting HP drops by exactly `damage` for an ice and a bio cast.

---

## 2. Unguarded `localStorage` white-screens the app in Safari Private Mode  ⚠️ launch crash

**🎯 Developer Prompt**

**Context Files to reference:**
- `src/access/accessMode.js` (L34-35 `getAccessMode`, L42-43 `clearLicenseToken`, L48-49 `storeLicenseToken`)
- `BossRush.jsx` (L1662 `useState(() => getAccessMode())`)
- `src/audio/themeMusic.js` (L62-76 — the correct try/catch pattern to mirror)

**The Issue:**
`getAccessMode()` only checks `typeof localStorage !== "undefined"` and then calls
`localStorage.getItem(...)` with no try/catch. In Safari Private Mode / disabled
storage / some webviews, `getItem`/`setItem`/`removeItem` throw `SecurityError`
even when `localStorage` is defined, and because `getAccessMode()` runs inside a
`useState` initializer during the first render, the throw blows up initial render
→ blank white screen.

**Error Details / Code Snippet:**
```js
const token =
  typeof localStorage !== "undefined"
    ? localStorage.getItem(LICENSE_TOKEN_KEY)   // throws SecurityError in private mode
    : null;
```
`themeMusic.js` already wraps every localStorage call in try/catch — `accessMode.js`
was missed. `storeLicenseToken` and `clearLicenseToken` have the same exposure.

**Proposed Fix Strategy:**
1. Add a small `safeLocalStorage` get/set/remove helper (or inline try/catch) in
   `accessMode.js` mirroring the pattern in `themeMusic.js`; return `null` / no-op on throw.
2. Route all three functions through it so storage failures degrade to "demo" mode
   instead of crashing.
3. Audit `src/access/validateLicense.js` (L30 hardcodes the key string and reads
   localStorage unguarded) for the same fix, and import `LICENSE_TOKEN_KEY` there.

---

## 3. Anti-tamper checksum "reset" is a no-op against the wallet it protects

**🎯 Developer Prompt**

**Context Files to reference:**
- `src/access/saveIntegrity.js` (`computeSaveChecksum` L34-43 via `totalWallet` L24-32; `verifySaveIntegrity` reset branch L59-69)

**The Issue:**
On a checksum mismatch, `verifySaveIntegrity` zeroes a top-level `wallet` field
(unused since per-class wallets landed in v1.0.7) and `records`, but spreads
`...save` unchanged — so `save.classes[*].wallet`, the exact values the checksum
sums, survive. It then recomputes a fresh valid checksum over that same object,
re-blessing the tampered wallet.

**Error Details / Code Snippet:**
```js
const reset = {
  ...save,                                   // per-class classes[*].wallet kept intact
  wallet: 0,                                 // top-level field is unused post-v1.0.7
  records: { coins: 0, streak: 0, rounds: 0 },
  _saveChecksum: computeSaveChecksum({ ...save, wallet: 0, records: {...} }), // re-blesses tampered wallet
};
```
Concrete: edit `classes.warrior.wallet` in localStorage → mismatch detected →
"reset" runs → the inflated wallet persists and now carries a valid checksum, so
every later load passes silently.

**Proposed Fix Strategy:**
1. In the reset branch, zero each `save.classes[k].wallet` (and any other checksummed
   per-class field) — not just the legacy top-level `wallet`.
2. Reconsider whether `bestFloor`/`purchased` should also be reset or preserved on
   tamper; make that intent explicit.
3. Recompute the checksum from the fully-reset object so the deterrent actually holds.
4. (Note: this is a deterrent, not security — the server-side `sanitizeSave` in
   `api/sync-save.js` also does not clamp `classes[*].skillLevels`, which lets a
   tampered save inflate the respec refund. Consider clamping there too.)

---

## 4. Battle-music re-entrancy guard is set too late → overlapping/orphaned BGM

**🎯 Developer Prompt**

**Context Files to reference:**
- `src/audio/themeMusic.js` (`playThemeForRound` L275-301; guard flag `battleStarting`)

**The Issue:**
`playThemeForRound` checks `if (!unlocked || battleStarting) return;` but does not
set `battleStarting = true` until AFTER two awaits (`resolveBattleTrackSrc`, which
does network HEAD requests). Two calls firing inside that async window both pass the
guard and both create a `battleAudio` element; `stopBattle()` only holds the latest
reference, so the earlier element loops forever with no handle to stop or mute it.

**Error Details / Code Snippet:**
```js
if (!unlocked || battleStarting) return;      // guard read
const src = await resolveBattleTrackSrc(...);  // <-- awaits; second call slips through here
...
battleStarting = true;                          // set far too late
battleAudio = makeAudio(src);                   // both calls reach this → duplicate loops
```

**Proposed Fix Strategy:**
1. Set `battleStarting = true` synchronously BEFORE the first `await`, so concurrent
   calls are actually serialized.
2. Ensure it is cleared in a `finally` (and on `stopBattle`) so a failed resolve
   doesn't wedge the flag on permanently.
3. Before creating a new element, stop/null any existing `battleAudio`.

---

## 5. Per-skill `poisonPct` is written everywhere but never read

**🎯 Developer Prompt**

**Context Files to reference:**
- `BossRush.jsx` (poison tick at ~L2434 `poisonTickDamage(foe.maxHp)`; `poisonPct` writes at L3280/3288/3357/3430/2556 and enemy templates)
- `src/battle/*` (`poisonTickDamage` definition)

**The Issue:**
Skills store a `poisonPct` (e.g. `skill.poisonPct ?? 0.3334`) on the enemy, implying
a per-skill poison strength, but the tick damage is computed as
`poisonTickDamage(foe.maxHp)` using only `maxHp` — `poisonPct` has zero read sites,
so every poison ticks identically and any custom value is silently ignored.

**Error Details / Code Snippet:**
```js
// write side (combo_bio, apply_poison, toxic_smoke, poison-shield proc):
poisonPct: skill.poisonPct ?? 0.3334,
// read side — ignores it:
const baseTick = poisonTickDamage(foe.maxHp);   // maxHp only; poisonPct never passed
```

**Proposed Fix Strategy:**
1. Decide the intended design: either wire `poisonPct` into `poisonTickDamage`
   (pass and use the stored percent) so custom-strength poisons work, OR remove the
   dead `poisonPct` fields to avoid misleading future authoring.
2. If wiring it in, keep the existing `0.3334` default so current balance is unchanged,
   and update/extend `tools/poison-math-test.mjs` to cover a non-default percent.

---

## 6. Network / Stripe / Supabase calls that throw instead of returning their contract

**🎯 Developer Prompt**

**Context Files to reference:**
- `src/access/validateLicense.js` (fetch L12 & L34 unguarded; docs promise `{ ok, ... }`)
- `api/create-checkout.js` (`stripe.checkout.sessions.create` L33 not wrapped)
- `api/check-access.js` (`supabase.auth.getUser` / `.select()` L26-33 unguarded)
- `src/access/cloudSave.js` & `src/access/checkout.js` (nested `const { data: { session } } = await getSession()`)

**The Issue:**
Several async helpers documented to RESOLVE with a structured result instead THROW
on network/provider failure: `validateLicenseKey` can reject when offline (callers
destructuring `{ ok }` get an unhandled rejection); `create-checkout`'s Stripe call
isn't in the try/catch that the rest of the file uses, producing a raw 500 with no
JSON body; `check-access`'s Supabase calls are unguarded; and the nested
`{ data: { session } }` destructure throws `TypeError` if `getSession()` ever
resolves with `data == null`.

**Error Details / Code Snippet:**
```js
// validateLicense.js — no try/catch; rejects offline
const res = await fetch(url, {...});
// create-checkout.js — the one call not wrapped like the others
const session = await stripe.checkout.sessions.create({...});   // throws → bare 500
// cloudSave.js / checkout.js — throws if data is null
const { data: { session } } = await supabase.auth.getSession();
```

**Proposed Fix Strategy:**
1. Wrap each `fetch`/Stripe/Supabase call in try/catch and return the documented
   shape (`{ ok: false, error }` for helpers; `json(res, 5xx, { error })` for API routes).
2. Replace nested destructuring with `const session = (await supabase.auth.getSession())?.data?.session ?? null;`.
3. Keep behavior graceful: license/network failures fall back to demo mode, not a crash.

---

## 7. `addWallet` runs side effects inside a `setState` updater

**🎯 Developer Prompt**

**Context Files to reference:**
- `BossRush.jsx` (`addWallet` L1905-1916; compare correct `spendWallet` L1918-1926)

**The Issue:**
`addWallet` calls `commitSave(...)` (which triggers `setSave`, a localStorage write,
and `scheduleCloudSync`) from INSIDE the `setWallet` functional updater. React may
invoke an updater more than once per logical update (guaranteed in StrictMode dev,
possible when a concurrent render is discarded), so each coin gain can double-write
localStorage and double-schedule a cloud sync, and it triggers the "cannot update a
component while rendering" anti-pattern.

**Error Details / Code Snippet:**
```js
setWallet((prev) => {
  walletRef.current = next;
  commitSave(...);          // setSave + localStorage write + scheduleCloudSync inside an updater
  return next;
});
```
`spendWallet` performs the same persistence correctly OUTSIDE any updater.

**Proposed Fix Strategy:**
1. Compute `next` and update `walletRef.current`, then call `setWallet(next)` and
   `commitSave(...)` at the top level of the function, mirroring `spendWallet`.
2. Keep the wallet value absolute/idempotent so no double-count is possible.

---

### Also verified as NOT bugs (audited, correct)
- Respec refund (`computeRespecRefund` L947-963) exactly matches amounts charged by
  `buyStatBatch`/`buySkillUpgrade`; combo ×3 applied symmetrically via `shopPriceForClass`.
- `spBoost` is zeroed on respec without refund, but it has no purchase path (never
  nonzero), so this is harmless.
- All seven combat regression test scripts pass.
