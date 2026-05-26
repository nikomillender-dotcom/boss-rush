# Monetization architecture

Boss Rush uses a **client-side demo gate** (floor 100 capstone) plus **server-validated unlock** paths. The gate is a deterrent, not DRM — see [Risk philosophy](#risk-philosophy).

## Demo vs full

| Mode | Floors | Classes (demo) | Saves |
|------|--------|----------------|-------|
| Demo | 1–100 | Warrior, Mage (floor 5+) | `localStorage` only |
| Full | 101+ | All base + combo unlock rules | Local + optional cloud (Supabase) |

Unlock **full** when either:

1. Valid **Lemon Squeezy** license JWT in `bossRush_license_token`, or  
2. Supabase `profiles.purchased = true` (Stripe Checkout webhook).

## Phase 1 — Lemon license

- **API:** `POST /api/validate-key` → Lemon `licenses/validate` → HS256 JWT (`JWT_SECRET`).
- **Revalidate:** `POST /api/check-license` on boot (throttled once per session).
- **UI:** Paywall after floor 100 win; title “Buy full game” + “Have a key?” modal.

### Vercel env (never commit)

```
LEMON_SQUEEZY_API_KEY=
LEMON_STORE_ID=          # optional
JWT_SECRET=              # 32+ random bytes
VITE_LEMON_CHECKOUT_URL= # Lemon checkout link
```

## Phase 2 — Supabase + Stripe

- Schema: [supabase-schema.sql](supabase-schema.sql)
- **Checkout:** `POST /api/create-checkout` (Bearer Supabase session)
- **Webhook:** `POST /api/stripe-webhook` → set `profiles.purchased`
- **Access:** `GET /api/check-access`
- **Cloud save:** `GET/POST /api/sync-save` (purchased users only)

### Additional env

```
SUPABASE_URL=
SUPABASE_ANON_KEY=         # VITE_ prefix for client
SUPABASE_SERVICE_ROLE_KEY= # API only
STRIPE_SECRET_KEY=         # rk_ restricted key preferred
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
PUBLIC_SITE_URL=https://boss-rush-six.vercel.app
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_ENABLED=true   # show Stripe buy on title when logged in
```

## Client hardening

- **Domain lock:** `src/access/domainLock.js` — allowed hosts in `constants.js`
- **Save checksum:** `src/access/saveIntegrity.js` — wallet/records reset on tamper
- **Obfuscation:** `npm run build:release` after `vite build`

## Support flow

1. itch / Lemon buyer → email with license key → paste on title screen.  
2. Stripe buyer → sign up → buy → return URL `?checkout=success` → `check-access`.  
3. Cloud save conflict → login prompt “Load cloud save?” when `cloudUpdatedAt` is newer.

## Analytics

Optional `POST /api/event` — `demo_floor_100_reached`, `purchase_click`. Wire Plausible/Umami separately on the marketing site if desired.

## Email nurture (Phase 2)

Configure Supabase Auth hooks or Resend for three emails to signed-up, not-purchased users (stop after 3). Not automated in-repo — use your ESP + `profiles.purchased` filter.

## Risk philosophy

- Client gates can be bypassed; do not trust client for leaderboards or competitive scores.
- Server validation matters for purchases and cloud saves only.
- Split demo/full bundles (Phase 3) deferred until piracy metrics justify the refactor.

## itch.io

See [itch-storefront.md](itch-storefront.md). Same license key works on the web build.
