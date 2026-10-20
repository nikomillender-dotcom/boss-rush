# Daily Code Review — 2026-10-20

**Scope:** recently modified files (v1.0.7 / v1.0.8: respec + per-class wallets), API routes, combat regressions.

**Health:** All 4 regression suites pass (auto-control, skill-cooldown, war-cry, save-meta). Working tree clean. No lint/tsc toolchain in this project. The newest feature (respec refund) is mathematically correct — refund exactly mirrors coins charged, i18n complete in EN/ES, wallet stays in sync. **No active or user-facing bugs found.**

Below is a ready-to-paste prompt for the three low-severity / latent items that are worth tightening. None are urgent; the strongest is a dormant trap, not a live bug.

---

**🎯 Developer Prompt**

**Context Files to reference:**
- `BossRush.jsx` (`computeRespecRefund` ~L944, `respecClass` ~L2730, `addWallet`/`spendWallet` ~L1905–1925, `SHOP_CONFIG` ~L375)

**The Issue:**
The respec feature is correct today, but it carries one latent coin-loss trap and two defensive/consistency nits. All three are safe to fix together without changing current behavior.

**Error Details / Code Snippet:**

1. **Latent coin-loss trap — `spBoost` reset without refund.** `respecClass()` zeroes `spBoost` (`BossRush.jsx` ~L2748), but `computeRespecRefund` deliberately excludes `spBoost` from the refund (comment at ~L945). This is harmless *only* because `spBoost` currently has no purchase path — yet `SHOP_CONFIG` still defines `spPrice` and `maxSpBoost` (L379, L385). The moment anyone wires up an `spBoost` purchase (the price fn already exists), respec will silently burn those coins with no refund.
   ```js
   // respecClass: zeroes spBoost ...
   spBoost: 0,
   // ... but computeRespecRefund never credits it back.
   ```

2. **Side effects inside a `setWallet` functional updater.** `addWallet` and `spendWallet` mutate `walletRef.current` and call `commitSave(...)` *inside* the `setWallet(prev => ...)` updater (`BossRush.jsx` ~L1907–1911). React may invoke updaters twice (dev StrictMode), double-firing the ref write + save. Pre-existing, dev-only, but an anti-pattern worth isolating.

3. **Selected-class source inconsistency.** `respecClass()` reads `selectedClassKey` (state) while `spendWallet`/`addWallet` resolve the wallet via `activeWalletClassKey()` → `selectedClassKeyRef.current`. Identical in the shop today, but reading from two sources invites a future desync bug.

**Proposed Fix Strategy:**
1. Make the `spBoost` handling self-consistent: either (a) include `spBoost × spPrice` in `computeRespecRefund` so the reset is always refunded, **or** (b) stop resetting `spBoost` in `respecClass` and drop the dead `spPrice`/`maxSpBoost` config until a purchase path exists. Prefer (a) if an `spBoost` shop row is planned, (b) if not. Add a one-line comment documenting which invariant now holds.
2. Move the `walletRef.current = next` assignment and `commitSave(...)` call *out* of the `setWallet` updater in both `addWallet` and `spendWallet` — compute `next` first, then call `setWallet(next)` and perform the side effects once, outside the updater.
3. In `respecClass`, read the class key from the same source the wallet mutators use (`activeWalletClassKey()` or `selectedClassKeyRef.current`) so refund target and live wallet can never diverge.

**Instructions for Developer:**
Review the identified issues and implement the proposed fix strategy. Ensure that your changes align with the existing architectural patterns in the repository and do not break adjacent dependencies. After changes, re-run the four combat regression tests (`node tools/auto-control-test.mjs`, `tools/skill-cooldown-test.mjs`, `tools/war-cry-test.mjs`, `tools/save-meta-test.mjs`) and confirm the respec button still refunds the exact amount shown (no net coin gain or loss) for a class with mixed stat + skill upgrades.
