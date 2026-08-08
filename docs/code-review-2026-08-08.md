# Boss Rush — Code Review & Developer Prompts (2026-08-08)

Automated review of the current tree (`claude/exciting-ritchie-cq7o03`, v1.0.8). Focus: the
recently changed v1.0.7/v1.0.8 code (per-class wallets, scaling rework, batch buys, respec)
plus the serverless API. Every finding below was verified against the source, not guessed.

Priority order: **CRITICAL → HIGH → MEDIUM → LOW/latent**. Copy any block into Claude Code
(Developer) to execute the fix. Do not batch unrelated ones into a single prompt.

---

## CRITICAL 1 — Paying customers lose all-time records on every reload

**🎯 Developer Prompt**

**Context Files to reference:**
- `src/access/saveIntegrity.js`
- `BossRush.jsx` (`loadSave` ~1138-1227, `refreshAccessFromServer` ~1835-1850, `persistSave` ~1251)

**The Issue:**
The save checksum includes the `purchased` flag, but `loadSave` never restores `purchased`
when rebuilding the save. So for any authenticated purchaser, the stored checksum (written
with `purchased:true`) never matches the recomputed one (`purchased:false`) on reload, and
`verifySaveIntegrity` "resets" the save — wiping all-time `records` (coins/streak/rounds).

**Error Details / Code Snippet:**
- `saveIntegrity.js:40` — `computeSaveChecksum` hashes `purchased: Boolean(save?.purchased)`.
- `BossRush.jsx:1840-1841` — `refreshAccessFromServer` does `{ ...saveRef.current, purchased: true }; commitSave(...)` → `persistSave` stores a checksum encoding `purchased:true`.
- `BossRush.jsx:1157-1214` — `loadSave` copies `locale`, `records`, `unlocks`, per-class metas — **never `data.purchased`** — so `synced.purchased` is `undefined`.
- `BossRush.jsx:1221-1224` — `verifySaveIntegrity({ ...synced, _saveChecksum: data._saveChecksum })` recomputes with `purchased:false` → mismatch → `records` zeroed on every reload.

**Proposed Fix Strategy:**
1. In `loadSave`, carry the purchased flag onto `synced` before verification: `synced.purchased = Boolean(data.purchased)` (do this before line 1221 so the recomputed checksum matches).
2. Confirm `refreshAccessFromServer` / `hasServerPurchaseFlag` still read that field consistently after the round-trip.
3. Add a regression test (mirror `tools/save-meta-test.mjs`) that persists a purchased save, reloads it, and asserts `records` survive and `verifySaveIntegrity` returns `ok:true`.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository and do not break adjacent dependencies.

---

## CRITICAL 2 — Serverless upserts swallow DB failures and report success

**🎯 Developer Prompt**

**Context Files to reference:**
- `api/stripe-webhook.js` (~50)
- `api/sync-save.js` (~155)

**The Issue:**
Both Supabase `.upsert(...)` calls ignore the returned `{ error }` and return a success
response unconditionally. In `stripe-webhook.js` a failed write means a paying customer is
never marked `purchased` — and because the handler still returns `200`, Stripe treats the
webhook as delivered and never retries. In `sync-save.js` a failed write still returns
`{ ok: true }`, so the client believes the cloud backup synced when it did not.

**Error Details / Code Snippet:**
```js
// api/stripe-webhook.js:50 — error not captured, handler returns 200 regardless
await supabase.from("profiles").upsert({ id: userId, purchased: true, updated_at: ... });
return json(res, 200, { received: true });

// api/sync-save.js:155 — same pattern
await supabase.from("profiles").upsert({ id: userId, save_data: saveData, updated_at: ... });
return json(res, 200, { ok: true });
```

**Proposed Fix Strategy:**
1. Capture `const { error } = await supabase.from("profiles").upsert(...)` in both handlers.
2. In `stripe-webhook.js`, if `error`, `console.error` it and return a `500` so Stripe retries the webhook (do not 200 on a failed grant).
3. In `sync-save.js`, if `error`, return `500 { error: "save_failed" }` so the client can surface/retry instead of silently believing it synced.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository and do not break adjacent dependencies.

---

## HIGH 3 — Combo classes' purchased ATK boosts bypass the weapon multiplier

**🎯 Developer Prompt**

**Context Files to reference:**
- `BossRush.jsx` (`getComboInnate` ~1479-1487, `buildPlayer` combo branch ~1490-1496, base branch ~1531-1534)

**The Issue:**
Base classes multiply their purchased ATK boost by the equipped weapon; combo classes add
the same boost flat, *after* the weapon multiplier has already been applied to the innate
attack. Combo classes are the endgame (floor-100 unlock) classes, so their ATK investment
is silently far weaker than a base class with an identical weapon tier.

**Error Details / Code Snippet:**
```js
// Base class (1533-1534): boost IS scaled by the weapon
const baseAtk = classDef.attack + totalAtkBonus(meta.atkBoost);
const attack  = Math.max(1, Math.round(baseAtk * getWeaponAttackMult(weapon)));

// Combo (1482 then 1496): weapon mult baked into innate BEFORE the flat boost is added
attack: Math.max(1, Math.round(baseAtk * weaponMult)),   // getComboInnate
const attack = innate.attack + totalAtkBonus(comboMeta.atkBoost);  // buildPlayer
```
With a ×2.5 weapon and 100 ATK levels (`totalAtkBonus(100)=15,150`), a base class gains
`15,150×2.5=37,875` from boosts; a combo gains only `15,150` — a ~22,700 ATK shortfall.

**Proposed Fix Strategy:**
1. Decide the intended model (recommend: match base classes so weapon scaling applies to boosts too).
2. In the combo branch, fold the ATK boost into the pre-multiplier base: compute `round((comboBaseAtk + totalAtkBonus(comboMeta.atkBoost)) * weaponMult)` instead of adding the boost after `innate.attack`.
3. Re-check combo skill scaling (`getComboSkillBases`/`applyComboSkillModifiers`) which reads the final `attack`, and re-tune `SCALING_CONFIG` if this materially shifts combo power.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository and do not break adjacent dependencies.

---

## HIGH 4 — Cloud save committed without normalization (overwrite + crash risk)

**🎯 Developer Prompt**

**Context Files to reference:**
- `BossRush.jsx` (`onAuthStateChange` cloud commit ~1733-1739, `commitSave` ~1799-1807, `getSkillUpgradeLevel` ~1062-1064)
- `api/sync-save.js` (`sanitizeSave` ~48-101)

**The Issue:**
`commitSave(result.save)` stores the raw cloud blob directly; unlike the localStorage path it
never runs `loadSave`'s normalization (default backfill, `migrateMageSkillLevels`, weapon
dedup, clamping, `mergeMissingClassMetas`). A cloud class meta missing `skillLevels` then
crashes `getSkillUpgradeLevel` (`?.` guards the meta but not `.skillLevels[skillId]`), and the
wholesale replace — fired from async auth events including `TOKEN_REFRESHED` — can discard
in-progress local run state.

**Error Details / Code Snippet:**
```js
// 1737 — raw cloud blob, no migration/normalization
if (result?.useCloud && result.save) commitSave(result.save);

// 1063 — throws if a class meta has no skillLevels
return getClassMetaFromSave(save, classKey)?.skillLevels[skillId] ?? 0;
```
`sanitizeSave` (api/sync-save.js) does not backfill `skillLevels`, so a sparse cloud meta is possible.

**Proposed Fix Strategy:**
1. Route cloud saves through the same normalization as local: extract `loadSave`'s rebuild/backfill into a reusable `normalizeSave(data)` and call it before `commitSave` at 1737.
2. Harden `getSkillUpgradeLevel` to `?.skillLevels?.[skillId] ?? 0` as defense-in-depth.
3. Confirm the "cloud is newer" replace does not clobber an active in-progress run (guard against replacing while a battle/run is live, or merge `walletRef`).

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository and do not break adjacent dependencies.

---

## MEDIUM 5 — Tamper "reset" resets the wrong field and blesses the cheat

**🎯 Developer Prompt**

**Context Files to reference:**
- `src/access/saveIntegrity.js` (`verifySaveIntegrity` 50-70, `totalWallet` 24-32)

**The Issue:**
On checksum mismatch, the reset zeroes a top-level `save.wallet` that nothing in the game reads
(spendable coins are per-class in `save.classes[*].wallet` since v1.0.7) and wipes the honest
`records`. It then recomputes the checksum from the still-tampered per-class wallets, so the
new checksum *validates the cheated coins* going forward while destroying legitimate records.

**Error Details / Code Snippet:**
```js
const reset = { ...save, wallet: 0, records: { coins: 0, streak: 0, rounds: 0 },
  _saveChecksum: computeSaveChecksum({ ...save, wallet: 0, records: {...} }) };
// computeSaveChecksum → totalWallet(save) still sums save.classes[*].wallet (untouched)
```

**Proposed Fix Strategy:**
1. Reset the fields the checksum actually covers: zero each `save.classes[*].wallet` (and the covered `records`) instead of top-level `wallet`.
2. Recompute the checksum from that corrected object so the cheat is not re-blessed.
3. (Optional, note in `docs/`) The checksum still omits `hpBoost/atkBoost/defBoost/skillLevels/ownedWeaponIds` and is disabled when `_saveChecksum` is absent — document that it is a deterrent only, or extend coverage if stronger deterrence is wanted.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository and do not break adjacent dependencies.

---

## MEDIUM 6 — Local progress can be overwritten by cloud because `cloudUpdatedAt` never bumps locally

**🎯 Developer Prompt**

**Context Files to reference:**
- `src/access/cloudSave.js` (`fetchCloudSaveIfNewer` ~55-65)
- `BossRush.jsx` (`commitSave`/`scheduleCloudSync`/`syncProgressToCloud`)
- `api/sync-save.js` (server stamps `cloudUpdatedAt` ~100)

**The Issue:**
`fetchCloudSaveIfNewer` decides last-write-wins by comparing `localSave.cloudUpdatedAt` vs the
cloud's, but `cloudUpdatedAt` is only ever set server-side and only lands locally after a
*fetch* of a newer cloud copy. Local edits never bump it, so a player with meaningful unsynced
local progress who signs in has `localTs = 0 < cloudTs`, and their local progress is replaced
by an older cloud save.

**Error Details / Code Snippet:**
```js
// cloudSave.js — localTs is 0 for a client that only ever wrote locally
const localTs = Number(localSave?.cloudUpdatedAt) || 0;
const cloudTs = Number(cloud?.cloudUpdatedAt) || 0;
if (cloudTs > localTs) return { useCloud: true, save: cloud };
```

**Proposed Fix Strategy:**
1. Track a local monotonic "last meaningful change" timestamp (bump it in `commitSave` for progress-affecting writes) and compare against the cloud stamp.
2. Or merge rather than replace on sign-in (prefer higher `records`, higher per-class `bestFloorReached`/`wallet`) instead of blind last-write-wins.
3. Add a test covering "local progress + older cloud save on first sign-in".

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository and do not break adjacent dependencies.

---

## LOW / latent (batch into one cleanup prompt)

**🎯 Developer Prompt**

**Context Files to reference:**
- `BossRush.jsx` (`persistSave` ~1251-1255; `respecClass` ~2732-2760 vs `computeRespecRefund` ~947-963; `affordableSteps`/`batchInfo`/StatRow disabled logic ~2763-2775, ~4707-4780)
- `api/event.js` (~40)

**The Issue:**
A cluster of low-severity/latent defects that don't break the happy path today but are real.

**Error Details / Code Snippet:**
1. `persistSave:1253` — `localStorage.setItem` is unguarded (the reads are wrapped). In private-mode / quota-exceeded browsers it throws out of `commitSave` and `loadSave`, crashing buys/respec/floor transitions.
2. `respecClass:2749` zeroes `spBoost`, but `computeRespecRefund` never refunds it. Harmless now (no purchase path sells `spBoost`), but a charged-vs-refunded mismatch the moment SP buying is re-enabled.
3. Batch x5/x10 buttons are `disabled` whenever `wallet < fullBatchCost`, so `affordableSteps`' partial-buy branch is unreachable from the UI — the user must manually drop to x1 to buy what they can afford.
4. `api/event.js` returns `json(res, 204, {})` — a 204 must not carry a body; and `readJsonBody(req)` reads with no byte cap, checking the 4KB limit only after fully buffering.

**Proposed Fix Strategy:**
1. Wrap `persistSave`'s `setItem` in try/catch; log and no-op on failure so gameplay never crashes.
2. Either refund `spBoost` in `computeRespecRefund` or add a code comment tying the two together so re-enabling SP purchases can't silently burn coins.
3. Make batch buttons buy the affordable partial (enable when `steps > 0` and charge `affordableSteps`' cost), or clamp the shown qty to what's affordable.
4. In `event.js` return `res.statusCode = 204; res.end()` with no body, and pass a byte cap to `readJsonBody`.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository and do not break adjacent dependencies.

---

### Verified NOT bugs (checked, sound)
- Respec refund is exact (`computeRespecRefund` sums the same per-level `shopPriceForClass` costs `buyStatBatch` charges, combo ×3 included).
- Batch shown-cost always equals charged-cost (both route through `comboShopPrice`/`shopPriceForClass`).
- Scaling curves stay finite at floor 1000 / combo max level — no Infinity/NaN/÷0.
- i18n catalogs are complete: all referenced keys (incl. new `shop.respec*`) present in both `en.json` and `es.json`, no interpolation mismatches.
- Heal clamps to `maxHp` everywhere; music `useEffect` deps sound.
- All `.js`/`.mjs` pass `node --check` (no syntax errors).
</content>
</invoke>
