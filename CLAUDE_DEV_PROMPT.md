# Repository review — 2026-10-14

Branch: `claude/exciting-ritchie-10wi2e` · Build: ✅ `npm run build` passes · Combat regression tests: ✅ all pass (`freeze-e2e` only fails because it needs a running dev server — not a product bug).

Scan focused on the v1.0.7 → v1.0.8 diff (`git diff HEAD~3 HEAD`), which introduced **per-class wallets**. One of those changes was applied in only one of two places that read the wallet, leaving a real regression.

---

## 🎯 Developer Prompt

**Context Files to reference:**
- `src/access/saveIntegrity.js`
- `BossRush.jsx` (wallet usage: `walletFor` ~line 985, per-class migration ~line 1139)

**The Issue:**
The v1.0.7 "per-class wallets" change updated `computeSaveChecksum` to sum coins from `save.classes[*].wallet` (via the new `totalWallet` helper), but the tamper-reset path in `verifySaveIntegrity` was never migrated — it still zeros the obsolete top-level `save.wallet`, a field nothing reads anymore. So when a save fails its integrity check, the cheated per-class coin balances survive the "reset," and the freshly recomputed checksum then blesses those tampered balances as valid. The wallet half of the anti-tamper deterrent is a no-op.

**Error Details / Code Snippet:**
```js
// src/access/saveIntegrity.js — checksum now reads PER-CLASS wallets:
function totalWallet(save) {
  if (!save?.classes) return 0;
  let sum = 0;
  for (const meta of Object.values(save.classes)) {
    sum += Math.max(0, Number(meta?.wallet) || 0);   // <-- source of truth
  }
  return sum;
}
export function computeSaveChecksum(save) {
  const payload = { wallet: totalWallet(save), /* ... */ };
  return fnv1a(JSON.stringify(payload));
}

// ...but the reset in verifySaveIntegrity still zeros the LEGACY top-level field:
const reset = {
  ...save,
  wallet: 0,                                   // <-- dead field; totalWallet() ignores it
  records: { coins: 0, streak: 0, rounds: 0 }, // records reset is fine
  _saveChecksum: computeSaveChecksum({
    ...save,
    wallet: 0,                                 // <-- same no-op; classes[*].wallet untouched
    records: { coins: 0, streak: 0, rounds: 0 },
  }),
};
return { ok: false, save: reset };
```
Repro: take a valid save, inflate `save.classes.warrior.wallet` to e.g. 9_999_999 and corrupt `_saveChecksum`. `verifySaveIntegrity` returns `ok: false` (good) but `reset.classes.warrior.wallet` is still 9_999_999, and `reset._saveChecksum` now validates it. The cheater keeps the coins.

**Proposed Fix Strategy:**
1. In `verifySaveIntegrity`'s reset path, zero the *per-class* wallets that the checksum actually reads — map over `save.classes` and set each `meta.wallet` to `0` — instead of (or in addition to) the top-level `save.wallet`. Build the reset save once, then pass that same object to `computeSaveChecksum` so the stored checksum matches what was actually reset (avoid the current duplicated inline literal, which is easy to drift).
2. Mirror the live in-game state: confirm how `BossRush.jsx` hydrates the active class's wallet from the save after a failed integrity check, so a reset zeroes the on-screen balance too and doesn't get re-persisted from stale in-memory state.
3. Add/extend a case in `tools/save-meta-test.mjs` (or a new `save-integrity-test.mjs`) that tampers a per-class wallet, runs `verifySaveIntegrity`, and asserts every `classes[*].wallet === 0` and that the returned save re-verifies as `ok: true`.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository and do not break adjacent dependencies. Keep this a deterrent-level reset consistent with the module's stated intent (`"deterrent, not security"`), preserve the legacy-save handling (`if (!expected) return { ok: true, save }`), and run the combat regression tests plus the new integrity test and `npm run build` before committing.

---

## Secondary (low priority) — dead code left by telemetry cleanup

**Context file:** `src/audio/themeMusic.js`

The v1.0.8 cleanup that removed the `debugLog(...)` agent telemetry also dropped the `tailTrim` logic from `attachSeamlessLoop`, but left its only inputs behind as unused constants: `DEFAULT_LOOP_TAIL_TRIM` (line ~37) and `LOOP_TAIL_TRIM_BY_SRC` (line ~39). Harmless, but now dead. Either delete both constants, or — if the seam-trim behavior was meant to stay — re-wire `attachSeamlessLoop` to use them. Confirm intent against `docs/music-sources.md` before deleting, since the comment references seam-click reduction.
