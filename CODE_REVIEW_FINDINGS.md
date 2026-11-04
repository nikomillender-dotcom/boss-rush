# Boss Rush — Code Review (automated routine, 2026-11-04)

**Scope:** full repo scan. Build passes (`vite build` ✓), all 14 combat/meta test suites pass ✓.
The `npm audit` highs are all in dev/build tooling (vite, postcss, undici, nanoid) — not shipped app logic, left out here.

Two genuine logic bugs surfaced, both in the monetization / save-persistence path (the money-touching code), plus one minor hardening note. Below are ready-to-copy Claude Code (Developer) prompts.

---

## 🎯 Developer Prompt #1 — Supabase writes never check for errors (silent failures)

**Context Files to reference:**
- `api/sync-save.js`
- `api/stripe-webhook.js`

**The Issue:**
Both `.upsert(...)` calls are awaited but their `{ error }` result is discarded, so a failed database write still returns a success response. In `stripe-webhook.js` a failed `purchased: true` write returns HTTP 200 `received: true`, so Stripe never retries and a paying customer is never unlocked. In `sync-save.js` a failed save write returns `{ ok: true }`, so the client believes progress was saved when it was silently lost.

**Error Details / Code Snippet:**
```js
// api/sync-save.js:155
await supabase.from("profiles").upsert({
  id: userId,
  save_data: saveData,
  updated_at: new Date().toISOString(),
});
return json(res, 200, { ok: true });   // <-- returns ok even if upsert errored

// api/stripe-webhook.js:50
await supabase.from("profiles").upsert({
  id: userId,
  purchased: true,
  updated_at: new Date().toISOString(),
});
// ...
return json(res, 200, { received: true }); // <-- Stripe will not retry a 200
```

**Proposed Fix Strategy:**
1. In `sync-save.js`, capture `const { error } = await supabase.from("profiles").upsert({...})`. If `error`, log it server-side and return `json(res, 500, { error: "save_failed" })` instead of `{ ok: true }`.
2. In `stripe-webhook.js`, capture the upsert `error`. If it fails, return a non-2xx (e.g. 500) so Stripe retries the webhook; keep the 200 `received: true` path only when the write (or the no-op non-`checkout.session.completed` branch) actually succeeded. Log `userId` and the error for reconciliation.
3. Confirm the `profiles` table has the expected columns/row-level policy for the service-role client so these writes aren't failing in the first place.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository (the `json(res, status, body)` helper, existing error codes like `not_configured` / `invalid_save`) and do not break adjacent dependencies. Do not change the webhook's handling of event types other than `checkout.session.completed`.

---

## 🎯 Developer Prompt #2 — Save-integrity "reset" zeroes a dead field, leaving per-class coins intact

**Context Files to reference:**
- `src/access/saveIntegrity.js`
- `BossRush.jsx` (per-class wallet model: `getClassWallet`, `setClassWallet`, ~line 982)

**The Issue:**
Wallets became **per-class** in v1.0.7 — spendable coins live at `save.classes[classKey].wallet`, and nothing writes a top-level `save.wallet`. `computeSaveChecksum` correctly sums the per-class wallets via `totalWallet()`, but when a checksum mismatch is detected, `verifySaveIntegrity` "resets" by setting the (unused) top-level `save.wallet = 0` and leaves `save.classes` untouched. It then recomputes the checksum over the still-tampered per-class wallets, blessing them with a fresh valid checksum. Net effect: the tamper-reset does not zero the currency it exists to protect, and launders the tampered coins.

**Error Details / Code Snippet:**
```js
// src/access/saveIntegrity.js:50-70
export function verifySaveIntegrity(save) {
  ...
  const reset = {
    ...save,
    wallet: 0,                                   // <-- nothing reads top-level save.wallet
    records: { coins: 0, streak: 0, rounds: 0 }, // (this part is correct)
    _saveChecksum: computeSaveChecksum({
      ...save,
      wallet: 0,                                 // <-- totalWallet() ignores this; sums save.classes[*].wallet (unchanged)
      records: { coins: 0, streak: 0, rounds: 0 },
    }),
  };
  return { ok: false, save: reset };
}
```

**Proposed Fix Strategy:**
1. In the reset path, rebuild `classes` with every `classes[k].wallet` set to `0` (preserve the rest of each class's meta), instead of (or in addition to) the no-op top-level `wallet: 0`.
2. Compute the reset blob once and feed that exact object to `computeSaveChecksum` so the stored checksum matches the zeroed per-class wallets.
3. Add/extend a test (mirror the style of `tools/save-meta-test.mjs`) asserting that after a tampered-wallet reset, `totalWallet(reset) === 0` and `verifySaveIntegrity(reset).ok === true`.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository (per-class meta shape, the `totalWallet`/`accountBestFloor` helpers) and do not break adjacent dependencies. Keep the "no checksum present ⇒ ok" legacy path and the DEV-only warn log intact.

---

## Minor note (not prompt-worthy on its own)

- `api/sync-save.js:147` — `rawSize` uses `JSON.stringify(...).length` (UTF-16 code units), not byte length, to enforce `MAX_SAVE_BYTES`. Multi-byte content can under-count. Low impact; fold into a future hardening pass with `Buffer.byteLength(..., "utf8")` if touched.
