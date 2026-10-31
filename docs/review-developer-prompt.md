# Repo Review — Developer Prompt (auto-generated)

_Scope: most recently modified files on `claude/exciting-ritchie-lgcei7` (v1.0.8). `npm run build` passes; all four combat regression tests pass; every `api/**` and `src/**` JS file syntax-checks clean. No linter/tsc is configured, so the findings below come from manual logic review._

---

## Finding 1 (primary) — Checksum "reset" leaves per-class wallets intact and re-blesses a tampered save

**Files / lines:**
- `src/access/saveIntegrity.js:50-70` (`verifySaveIntegrity`)
- `src/access/saveIntegrity.js:25-43` (`totalWallet` / `computeSaveChecksum`)
- `BossRush.jsx:1221-1227` (caller in `loadSave`)

**Root cause:** As of v1.0.7 the real coin store moved to **per-class** wallets (`save.classes[key].wallet`; see `BossRush.jsx:985`, `:1181`, `:1208`). `computeSaveChecksum` correctly protects that by summing per-class wallets via `totalWallet()`. But on a checksum mismatch, `verifySaveIntegrity`'s reset branch only zeroes the **legacy top-level** `save.wallet` and `save.records` — it never touches `save.classes[*].wallet`. It then recomputes the checksum over that same object.

**Why it's failing / suboptimal:** Two compounding problems:
1. The reset does not actually neutralize the value the checksum guards — inflated per-class coin balances survive untouched.
2. Recomputing the checksum over the still-tampered object produces a checksum that now **matches** the tampered wallets, laundering the edited save into a permanently "valid" one. The tamper deterrent is defeated for exactly the field it exists to protect.

(`save.wallet` at the top level is intentionally dropped on load — `BossRush.jsx:1139-1141` — so zeroing it is a no-op on current saves.)

**Problematic code (`src/access/saveIntegrity.js:50-70`):**
```js
export function verifySaveIntegrity(save) {
  if (!save || typeof save !== "object") return { ok: false, save: null };
  const expected = save._saveChecksum;
  if (!expected) return { ok: true, save };
  const actual = computeSaveChecksum(save);
  if (actual === expected) return { ok: true, save };
  if (import.meta.env.DEV) {
    console.warn("[save] checksum mismatch — resetting wallet/records");
  }
  const reset = {
    ...save,
    wallet: 0,                                  // legacy field — no longer the coin store
    records: { coins: 0, streak: 0, rounds: 0 },
    _saveChecksum: computeSaveChecksum({        // re-blesses the untouched per-class wallets
      ...save,
      wallet: 0,
      records: { coins: 0, streak: 0, rounds: 0 },
    }),
  };
  return { ok: false, save: reset };
}
```

---

## Finding 2 (secondary, minor) — `sync-save` POST swallows DB write failures

**File / line:** `api/sync-save.js:155-161`

**Root cause:** The `upsert` result is not inspected; the handler returns `{ ok: true }` unconditionally.

**Why it's suboptimal:** A failed write (RLS, transient Supabase error) reports success to the client, so cloud progress is silently lost with no signal to retry.

```js
await supabase.from("profiles").upsert({ id: userId, save_data: saveData, updated_at: new Date().toISOString() });
return json(res, 200, { ok: true }); // returns ok even if upsert errored
```

---

## 🎯 Developer Prompt

**Context Files to reference:**
- `src/access/saveIntegrity.js`
- `BossRush.jsx` (the `loadSave` / `persistSave` region, ~lines 1133-1255)
- `api/sync-save.js`

**The Issue:**
After the v1.0.7 per-class wallet migration, coins live in `save.classes[key].wallet`, but `verifySaveIntegrity`'s mismatch-reset only zeroes the dead legacy top-level `save.wallet` — so a tampered save keeps its inflated per-class coins AND gets re-stamped with a fresh valid checksum, permanently defeating the tamper deterrent. Separately, `api/sync-save.js` returns `{ ok: true }` even when the Supabase `upsert` fails.

**Error Details / Code Snippet:**
```js
// src/access/saveIntegrity.js — reset branch does not zero per-class wallets,
// then recomputes the checksum over the still-tampered classes map:
const reset = {
  ...save,
  wallet: 0,                                   // legacy no-op
  records: { coins: 0, streak: 0, rounds: 0 },
  _saveChecksum: computeSaveChecksum({ ...save, wallet: 0, records: {...} }),
};
// computeSaveChecksum protects totalWallet(save) = Σ save.classes[*].wallet,
// which the reset never clears.
```

**Proposed Fix Strategy:**
1. In `verifySaveIntegrity`, when the checksum mismatches, build the reset object so that **every** `save.classes[*].wallet` is set to `0` (map over `save.classes` and zero each entry's `wallet`) in addition to the existing `records` reset. Compute the fresh `_saveChecksum` from that fully-zeroed object so the re-stamp matches a genuinely cleaned save, not the tampered one.
2. Add a focused regression test (mirror `tools/save-meta-test.mjs`) asserting that a save with a hand-inflated `classes.<key>.wallet` and a stale/forged `_saveChecksum` comes back from `verifySaveIntegrity` with every per-class wallet at `0` and `ok: false`.
3. In `api/sync-save.js`, capture the `upsert` result (`const { error } = await supabase.from("profiles").upsert(...)`) and return `json(res, 500, { error: "save_failed" })` when `error` is set, instead of unconditionally returning `{ ok: true }`. Apply the same error check to the GET read if a DB error is present.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository (the "deterrent, not security" framing in `saveIntegrity.js`, the per-class wallet model, and the `json()` response helper), and do not break adjacent dependencies — confirm `loadSave` in `BossRush.jsx` still re-blesses legacy global-wallet saves (`isLegacyGlobalWallet` path) unchanged, and re-run `node tools/save-meta-test.mjs` plus `npm run build` before committing.
