# Daily Code Review — 2026-10-28

Scope: recently modified files (BossRush.jsx respec feature, `api/` launch-hardening,
`src/access/`, `src/battle/scaling.js`). All four combat regression suites pass
(`auto-control`, `skill-cooldown`, `war-cry`, `save-meta`). No lint/tsc config in repo.

The respec feature (v1.0.8) was reviewed closely and is **correct**: `computeRespecRefund`
sums the exact per-level prices `buyStatBatch`/`buySkillUpgrade` charged (combo x3 included),
`spBoost` is never purchasable so zeroing it loses nothing, and `meta.wallet` is kept in sync
with the live wallet via `setClassWallet` in `spendWallet`/`addWallet`, so the refund math is
exact. No issue there.

One real, launch-critical reliability bug surfaced. Developer prompt below.

---

**🎯 Developer Prompt**

**Context Files to reference:**
- `api/stripe-webhook.js`
- `api/sync-save.js`
- `api/check-access.js` (shows `profiles.purchased` is the sole access gate)

**The Issue:**
Both Supabase write calls — the Stripe webhook's `purchased: true` upsert and the cloud-save
upsert — ignore the `{ error }` the supabase-js v2 client returns (it does not throw on DB
failure), so each returns a success status even when the write never landed. For the webhook
this is severe: `profiles.purchased` is the only thing that grants paid access, the webhook is
the only writer that sets it for Stripe payers, and because the handler returns HTTP 200, Stripe
never retries — a paying customer is silently locked out with no reconciliation path.

**Error Details / Code Snippet:**
```js
// api/stripe-webhook.js:50 — result discarded, handler still returns 200 { received: true }
await supabase.from("profiles").upsert({
  id: userId,
  purchased: true,
  updated_at: new Date().toISOString(),
});
```
```js
// api/sync-save.js:155 — same pattern; returns 200 { ok: true } even if the save never persisted
await supabase.from("profiles").upsert({
  id: userId,
  save_data: saveData,
  updated_at: new Date().toISOString(),
});
```

**Proposed Fix Strategy:**
1. In `api/stripe-webhook.js`, destructure `{ error }` from the upsert. On error, `console.error`
   it and return a non-2xx (e.g. 500) so Stripe retries the webhook delivery. Only return
   `200 { received: true }` once the write (or a no-op for a non-handled event type) genuinely
   succeeds. Keep the existing signature-verification and `not_configured` paths unchanged.
2. In `api/sync-save.js`, destructure `{ error }` from the upsert and return `500 { error: "save_failed" }`
   when it is set, so the client knows the backup did not persist instead of showing a false success.
3. Grep the rest of `api/` for other `supabase.from(...).upsert|insert|update(...)` calls whose
   result is discarded and apply the same error-check-and-propagate pattern.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes
align with the existing architectural patterns in the repository (use the `json(res, code, …)`
helper from `api/_lib/http.js` for responses) and do not break adjacent dependencies. Do not
change the access model or add new env vars; this is purely about surfacing failed DB writes.
