# Repository Review — Boss Rush (2026-10-18)

**Branch:** `claude/exciting-ritchie-luxlif` · **Version:** 1.0.8 · HEAD `50ed887`

## Health check

| Check | Result |
|-------|--------|
| `npm run build` (vite) | ✅ built clean (362 KB JS, 407 PWA precache entries) |
| `tools/auto-control-test.mjs` | ✅ 9/9 |
| `tools/skill-cooldown-test.mjs` | ✅ all passed |
| `tools/war-cry-test.mjs` | ✅ 10 passed, 0 failed |
| `tools/save-meta-test.mjs` | ✅ 3 passed, 0 failed |
| v1.0.8 respec wiring | ✅ `respecClass` → engine return → `onRespec={game.respecClass}`; EN/ES `shop.respecConfirm` present |

No syntax errors, no failing tests, no type project (plain JSX — no `tsc`/lint configured).

## Issue 1 (primary) — Save-integrity reset is a no-op for per-class coins

The v1.0.7 per-class-wallet migration updated `computeSaveChecksum` to checksum the
**sum of per-class wallets** via `totalWallet(save)` (reads `save.classes[*].wallet`),
but the mismatch-reset branch of `verifySaveIntegrity` was never updated. On a checksum
mismatch it zeroes only the **dead legacy top-level** `save.wallet` and `save.records`,
leaving every `save.classes[*].wallet` intact — then recomputes and stamps a **valid**
checksum over those untouched balances.

Consequences:
- The coins the checksum is meant to protect are never reset — tampered per-class wallets survive.
- The reset re-blesses the tampered state with a fresh valid checksum, so it passes silently ever after.
- Only `records` (and a top-level `wallet` field that is unused since v1.0.7) actually get zeroed.

**Evidence**
- `src/access/saveIntegrity.js:24-32` — `totalWallet` sums `save.classes[*].wallet`.
- `src/access/saveIntegrity.js:34-43` — `computeSaveChecksum` uses `totalWallet`.
- `src/access/saveIntegrity.js:59-68` — reset sets top-level `wallet: 0` + `records`, never iterates `save.classes`.
- `BossRush.jsx:985` — live wallet read is `save.classes[classKey].wallet` (top-level `save.wallet` is dead).
- `BossRush.jsx:1221-1227` — load-time call site that consumes `checked.save`.

## Issue 2 (minor / latent) — `respecClass` zeroes `spBoost` but never refunds it

`respecClass` resets `spBoost: 0` while `computeRespecRefund` explicitly excludes `spBoost`
from the refund. Harmless **today** because no shop buy-path exists for `spBoost` (only
hp/atk/def/skills are purchasable), so it is always 0 or save-migrated, never coin-bought.
But it is a latent trap: if an SP-boost purchase path is ever added, respec will silently
burn those coins with no refund, and the "refund is exact / no net coin change" invariant
in the v1.0.8 commit message breaks.

**Evidence**
- `BossRush.jsx:944-964` — `computeRespecRefund`; comment at `:945` "Weapons and spBoost are excluded".
- `BossRush.jsx:2749` — `respecClass` sets `spBoost: 0`.
- No `buyStatBatch("spBoost", ...)` / `spBatch` anywhere (only hp/atk/def/skill batches exist).

---

# 🎯 Developer Prompt (ready to copy into Claude Code)

**Context Files to reference:**
- `src/access/saveIntegrity.js`
- `BossRush.jsx`

**The Issue:**
`verifySaveIntegrity`'s checksum-mismatch reset only zeroes the dead legacy top-level `save.wallet` and `save.records`, but `computeSaveChecksum` checksums the **sum of per-class wallets** (`save.classes[*].wallet`). So on a mismatch the per-class coins are never reset, and the function then stamps a fresh valid checksum over the still-tampered balances — making the tamper deterrent a no-op for coins.

**Error Details / Code Snippet:**
```js
// src/access/saveIntegrity.js — computeSaveChecksum reads per-class wallets:
function totalWallet(save) {
  let sum = 0;
  for (const meta of Object.values(save?.classes ?? {})) sum += Math.max(0, Number(meta?.wallet) || 0);
  return sum;
}

// ...but the reset leaves save.classes untouched:
const reset = {
  ...save,
  wallet: 0,                                   // dead top-level field (unused since v1.0.7)
  records: { coins: 0, streak: 0, rounds: 0 }, // classes[*].wallet NOT reset
  _saveChecksum: computeSaveChecksum({ ...save, wallet: 0, records: { coins: 0, streak: 0, rounds: 0 } }),
};
```

**Proposed Fix Strategy:**
1. In `verifySaveIntegrity`'s reset branch, also zero each per-class wallet: map over `save.classes` and set `wallet: 0` on every class meta (preserve all other class fields), so the reset state actually matches what the checksum protects.
2. Compute the reset object once and derive `_saveChecksum` from that **same** object (don't rebuild the input a second time) to avoid the two definitions drifting apart.
3. Decide the top-level `wallet: 0` line's fate: either drop it (the field is unused since the v1.0.7 per-class migration) or keep it only as harmless legacy cleanup — document which, so the next reader isn't misled into thinking it's the live balance.
4. Add/extend a regression test (follow the style of `tools/save-meta-test.mjs`) asserting that after a forced checksum mismatch, `totalWallet(result.save) === 0` and `verifySaveIntegrity(result.save).ok === true` on the re-blessed output.
5. (Minor, optional) In `respecClass` (`BossRush.jsx:2749`), stop zeroing `spBoost` since it is never refunded and never coin-purchased, OR add `spBoost` to `computeRespecRefund`. Pick whichever preserves the "no net coin change" invariant if a `spBoost` buy-path is later added; leave a comment stating the chosen contract.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository (per-class wallets as of v1.0.7, the "deterrent not security" framing in the file's docstring, no em dashes in user-facing strings) and do not break adjacent dependencies — re-run `node tools/save-meta-test.mjs`, the other three combat tests named in `AGENTS.md`, and `npm run build` before committing.
