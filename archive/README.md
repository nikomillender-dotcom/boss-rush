# Archived (Vercel backend + accounts)

These files were removed when the game migrated to a **static itch.io build**
(see the plan in `.claude/plans/`). They are kept here, not deleted, so the
Vercel/Supabase/Stripe/Payhip path can be restored if ever needed.

- `api/` — Vercel serverless functions (license validation, Stripe checkout +
  webhook, Supabase cloud-save sync, rate limiting).
- `src/access/supabaseClient.js`, `cloudSave.js` — Supabase auth + cloud save.
- `src/access/validateLicense.js`, `checkout.js` — Payhip license + Stripe.
- `src/access/domainLock.js` — hostname allow-list (would blank-screen on itch).
- `src/components/AuthPanel.jsx`, `LicenseKeyModal.jsx` — account / key-entry UI.
- `src/InstallBanner.jsx` — PWA install prompt.

Access is now decided at build time by `VITE_BUILD_TARGET` (see
`src/access/accessMode.js`); itch handles purchase.
