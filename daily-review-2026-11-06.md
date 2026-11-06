# Daily Code Review — 2026-11-06

**Repo:** boss-rush · **HEAD:** `50ed887` v1.0.8 (respec button) · **Branch reviewed:** working tree (clean)

## Verdict

**No blocking or correctness bugs found.** All four documented combat regression tests pass
(`auto-control`, `skill-cooldown`, `war-cry`, `save-meta`). The newest feature — the v1.0.8
per-class **respec** — is correctly implemented:

- `computeRespecRefund` sums each level's price via `shopPriceForClass(classKey, priceFn, i)`,
  which is the **exact** per-level amount `buyStatBatch` / `buySkillUpgrade` charge (combo ×3
  included). Verified refund == spend.
- The per-class wallet is kept in sync with the save on every earn/spend (`setClassWallet` inside
  `addWallet`/`spendWallet`), so basing the new wallet on `meta.wallet` in `respecClass` neither
  double-counts nor loses coins.

Findings below are **minor / latent** — worth a cleanup pass, none urgent.

---

## 🎯 Developer Prompt (ready to copy into Claude Code)

**Context Files to reference:**
- `BossRush.jsx` — `computeRespecRefund` (~L944), `respecClass` (~L2731), `loadSave` (~L1133)
- `src/battle/scaling.js` — `spPrice`, `spPriceBase`/`spPriceGrowth`, price functions

**The Issue:**
Two small latent inconsistencies surfaced by the new respec feature and the legacy-save
migration. Neither is a live bug today, but both are landmines worth closing while the code is
fresh.

**Error Details / Code Snippet:**

1. **`spBoost` is zeroed on respec but never refunded.**
   `respecClass` resets `spBoost: 0`, and `computeRespecRefund` explicitly excludes it:
   ```js
   // computeRespecRefund — only hp/atk/def + skillLevels are summed; spBoost omitted
   // respecClass — nextMeta = { ...meta, hpBoost:0, atkBoost:0, defBoost:0, spBoost:0, ... }
   ```
   `spBoost` is currently vestigial: nothing increments it, and it is **not read anywhere in
   combat**. But it is still clamped/carried through `loadSave` migration
   (`spBoost: clamp(Number(incoming.spBoost) || 0, 0, SHOP_CONFIG.maxSpBoost)` at BossRush.jsx
   ~L1165 and ~L1195), so an imported/legacy save with `spBoost > 0` would have it silently
   zeroed with no refund. If SP-boost purchasing is ever re-enabled (price fn + `maxSpBoost`
   still exist), respec would destroy paid coins.

2. **Legacy global-wallet saves skip integrity verification.**
   In `loadSave` (BossRush.jsx ~L1218):
   ```js
   if (isLegacyGlobalWallet) {
     return persistSave(synced);   // re-blessed WITHOUT verifySaveIntegrity
   }
   ```
   A save containing a top-level `wallet` field is accepted and re-signed without running
   `verifySaveIntegrity`, so a one-time hand-edited save (inflated per-class `wallet`/records) is
   trusted on first load. Impact is low — coins are in-game only, not a monetization/paywall
   bypass — but it is a deliberate hole that could be narrowed.

**Proposed Fix Strategy:**
1. **Resolve the `spBoost` inconsistency — pick one:**
   - *Preferred (remove dead state):* delete `spBoost` from `createDefaultClassMeta`,
     `createDefaultComboMeta`, both `loadSave` migration blocks, and `respecClass`; drop the
     now-unused `spPrice` import / `maxSpBoost` if nothing else references them. Confirm with
     `grep -n spBoost BossRush.jsx src/**` that no reader remains first.
   - *Alternative (keep the field, make it consistent):* include `spBoost` in
     `computeRespecRefund` (sum `shopPriceForClass(classKey, spPrice, i)`) and keep refunding it,
     matching the hp/atk/def treatment.
2. **Tighten the legacy re-bless path (optional, low priority):** before returning in the
   `isLegacyGlobalWallet` branch, still clamp/validate per-class `wallet` and `records` (already
   partly done) and consider logging a one-time migration marker so a save can only be re-blessed
   once rather than every time a top-level `wallet` field is present.
3. **Add lint tooling so future reviews are automated:** no ESLint / tsconfig / `lint` script
   exists. Add `eslint` + `eslint-plugin-react-hooks`, a flat config for the React 19 + Vite
   setup, and an `npm run lint` script. This catches hook-dependency and dead-variable issues
   (e.g. it would have flagged the vestigial `spBoost`) without a manual pass.

**Instructions for Developer:**
Review the identified issues and implement the proposed fix strategy. Start with item 1 (the only
one touching player-visible behavior). Keep changes aligned with existing patterns — mirror how
hp/atk/def boosts are handled, reuse `shopPriceForClass`, and do not alter the refund-is-exact
invariant. After any change, re-run the four combat tests
(`node tools/auto-control-test.mjs`, `skill-cooldown-test.mjs`, `war-cry-test.mjs`,
`save-meta-test.mjs`) and `npm run build` before committing.
