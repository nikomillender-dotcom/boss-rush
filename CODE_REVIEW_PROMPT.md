# Daily Code Review — 2026-11-02

**Health check (all green):**
- `npm ci` + `npm run build` → build succeeds, 152 modules, PWA generated.
- All 13 regression suites pass (auto-control, skill-cooldown, war-cry, save-meta, combat-freeze, freeze-order, enemy-hp, poison-math, lifesteal-math, class-unlock, combo-unlock, boss-skip, afterburn-carriers, theme-music).
- `npm audit` → 0 vulnerabilities.
- Respec refund math (`computeRespecRefund`) verified to mirror the purchase pricing exactly.

No bugs, crashes, or broken behavior found. The items below are **low-severity**: one real test gap on the newest feature, one latent hardening gap, and cleanup.

---

**🎯 Developer Prompt**

**Context Files to reference:**
- `BossRush.jsx` (`computeRespecRefund` ~L947, `respecClass` ~L2732, save loader ~L1157-1212, `getShopMaxSkillLevel` ~L347)
- `tools/save-meta-test.mjs` (pattern to copy for a new node test)
- `src/battle/scaling.js` (`spPrice`, `skillPrice`)

**The Issue:**
The v1.0.8 respec feature shipped with no regression test (every other combat/economy mechanic has one), and the save loader clamps `hpBoost`/`atkBoost`/`defBoost` but not `skillLevels`, so a save carrying skill levels above the current cap (e.g. after a balance patch lowered it) loads unclamped and `computeRespecRefund` then refunds coins for levels that can no longer be purchased.

**Error Details / Code Snippet:**
```js
// BossRush.jsx ~L1162-1176 — boosts clamped, skillLevels NOT clamped:
hpBoost: clamp(Number(incoming.hpBoost) || 0, 0, SHOP_CONFIG.maxHpBoost),
atkBoost: clamp(Number(incoming.atkBoost) || 0, 0, SHOP_CONFIG.maxAtkBoost),
defBoost: clamp(Number(incoming.defBoost) || 0, 0, SHOP_CONFIG.maxDefBoost),
...
skillLevels: key === "mage"
  ? migrateMageSkillLevels({ ...base.skillLevels, ...(incoming.skillLevels || {}) })
  : { ...base.skillLevels, ...(incoming.skillLevels || {}) },   // <-- no cap applied
```
Also: `spPrice` is imported (L55) and placed in `SHOP_CONFIG` (L385) but never called, and `spBoost` is stored/clamped/reset (`respecClass` zeroes it) yet has no purchase path — dead code. The base-class and combo-class loader blocks (~L1157-1212) are near-duplicates, which is exactly how the clamp divergence crept in.

**Proposed Fix Strategy:**
1. Add `tools/respec-test.mjs` (mirror `save-meta-test.mjs`): build a class meta, buy N levels of hp/atk/def and a skill, assert `computeRespecRefund` === total spent, then simulate respec and assert wallet is restored, boosts/skillLevels zeroed, weapons kept. Add it to the AGENTS.md "Tests" list.
2. Clamp each entry of `skillLevels` to `getShopMaxSkillLevel(key)` in both loader blocks (base and combo), matching the boost clamping.
3. Either wire up `spBoost`/`spPrice` to a real shop purchase or remove both (and the `respecClass` special-case zeroing) to eliminate the dead path.
4. (Optional) Extract a shared `hydrateClassMeta(incoming, base, key)` helper from the two near-duplicate loader blocks to prevent future drift.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository and do not break adjacent dependencies. Run the full regression suite (the four `node tools/*-test.mjs` commands in AGENTS.md plus the new respec test) and `npm run build` before committing.
