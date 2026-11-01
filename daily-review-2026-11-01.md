# Daily Code Review — 2026-11-01

**Scope:** recently modified files (HEAD = `50ed887` v1.0.8 respec). Branch `claude/exciting-ritchie-73rwzl` is level with `main`.

## Health check (all green)

- All 12 combat regression tests pass (`auto-control`, `skill-cooldown`, `war-cry`, `save-meta`, `poison-math`, `lifesteal-math`, `freeze-order`, `enemy-hp`, `combo-unlock`, `class-unlock`, `boss-skip`, `combat-freeze`).
- `node --check` on every `api/` and `src/` JS file: no syntax errors.
- **v1.0.8 respec** verified sound: `computeRespecRefund` sums the *same* per-level prices (`shopPriceForClass`, combo ×3 included) that `buyStatBatch`/`buySkillUpgrade` charge, so the refund is exact — no net coin gain or loss. Zeroing `spBoost` without refund is harmless: `spBoost`/`spPrice` are unused scaffolding with no purchase path today.

## Findings

**1 — robustness/revenue (worth fixing):** Stripe webhook swallows DB-write failures.
**(minor) 2:** `spPrice` imported but never used in `BossRush.jsx` (lines 55, 385) — dead import; optional cleanup.

The developer prompt below addresses Finding 1.

---

**🎯 Developer Prompt**

**Context Files to reference:**
- `api/stripe-webhook.js`
- `api/sync-save.js`
- `api/_lib/http.js`

**The Issue:**
On a successful Stripe payment, the webhook writes `purchased: true` to Supabase but never checks whether that write succeeded, then always returns HTTP 200. If the DB write fails (transient Supabase outage, network blip, RLS/permission change), Stripe sees a 2xx, marks the event delivered, and never retries — so a customer who paid silently never gets access, with no error logged.

**Error Details / Code Snippet:**
`api/stripe-webhook.js`, lines 50–58:
```js
await supabase.from("profiles").upsert({      // line 50 — { error } discarded
  id: userId,
  purchased: true,
  updated_at: new Date().toISOString(),
});
// ...
return json(res, 200, { received: true });     // line 58 — returned even if the upsert failed
```
Same latent pattern (unchecked upsert) in `api/sync-save.js` line 155 — lower severity, since the client keeps the authoritative local save and can re-sync, but the client is never told the write failed.

**Proposed Fix Strategy:**
1. In `api/stripe-webhook.js`, capture the result: `const { error } = await supabase.from("profiles").upsert({ ... });`.
2. If `error` is set, `console.error("[stripe-webhook] upsert", error)` and return a 5xx (e.g. `return json(res, 500, { error: "db_write_failed" });`) so Stripe's retry/backoff re-delivers the event. Only return `200 { received: true }` after a confirmed successful write.
3. Also handle the `userId`-missing branch explicitly (today it falls through to 200 with no grant and no log) — log it so a mis-configured checkout is visible.
4. In `api/sync-save.js`, capture the upsert `{ error }` at line 155 and return a 5xx (e.g. `json(res, 500, { error: "save_write_failed" })`) on failure so the client can retry, instead of reporting `{ ok: true }`.

**Instructions for Developer:**
Review the identified issue and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository (the `json(res, status, body)` helper from `api/_lib/http.js`, the existing `console.error("[stripe-webhook] ...")` style, and the `not_configured`/`invalid_signature` status-code conventions already in these files) and do not break adjacent dependencies. Keep the change minimal and do not alter the Stripe signature-verification flow.
