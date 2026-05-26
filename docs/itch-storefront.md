# itch.io storefront checklist (Phase 0)

Ops-only — no game code required. Use this when publishing the supporter edition.

## Project setup

1. Create project at [itch.io](https://itch.io) → **Create new project** → **HTML**.
2. Upload `dist/` zip from `npm run build` (or `npm run build:release` for obfuscated JS).
3. **Embed options:** playable in browser; check mobile-friendly.
4. **Pricing:** minimum **$1.99**, suggested **$4.99**; optional pay-what-you-want above minimum.

## Copy & assets

- Short description: adapt [steam-store-copy.md](marketing/steam-store-copy.md) short draft (browser + supporter edition).
- Long description: floor-100 capstone (`guy_dog`) as hero shot; ten themed 100-floor arcs; camp meta; four classes + combos.
- Tags: `boss-rush`, `turn-based`, `cats`, `pixel-art`, `browser`, `roguelite`.
- Screenshots: floor 1 suburban, floor 50 cleric unlock tease, **floor 100 capstone**, camp shop, class select.
- Cover: reuse PWA icons or title art from marketing folder.

## Links

- **Free demo funnel:** https://boss-rush-six.vercel.app (demo ends at floor 100 until license / account unlock).
- **TikTok / social bio:** itch page URL + Vercel demo URL.
- **Full unlock:** Lemon Squeezy checkout (same key works on web after Phase 1).

## Honesty window (24–48h before paywall ships)

If itch build is still full-game parity with web, label listing **“Early access / supporter edition”** or ship Phase 1 paywall before promoting paid itch.

## License keys

After Lemon product is live, enable license keys in Lemon dashboard; buyers paste key on title screen (“Have a key?”).
