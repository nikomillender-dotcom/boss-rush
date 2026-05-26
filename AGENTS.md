# Boss Rush — agent notes

## Production

- **URL:** https://boss-rush-six.vercel.app
- **Deploy:** `npm run build` then `npx vercel deploy --prod` (Vercel builds from `dist`, `vercel.json` uses `npm run build`)
- **Build stamp:** Title screen shows `v{version} · {7-char git sha}` (Vercel sets `VERCEL_GIT_COMMIT_SHA`)

## Dog sprites not showing on phone (emoji instead)

### Typical symptom

- **Enemy dogs:** emoji (🐕)
- **Player cat:** pixel PNG sprites OK

### Root cause (most common)

Installed PWA is running **stale JavaScript** from before enemy sprite wiring (`getEnemyCombatSpriteUrl` / `ENEMY_SPRITES`, commit `3ff3563`). Cat sprites were added earlier, so cats can work while dogs still use emoji-only enemies.

Production assets are usually fine:

- PNGs live at `public/sprites/dogs/{spriteKey}/combat_{healthy,alert,hurt}.png`
- Paths: `/sprites/dogs/{spriteKey}/combat_healthy.png` (see `dogSpritePath` in `BossRush.jsx`)
- Prod should return **200** for e.g. `/sprites/dogs/human_trash_0/combat_healthy.png`
- `dist/sw.js` precaches `sprites/dogs/**` after `npm run build`

### Verify

1. Phone **Safari** (not home-screen icon): open prod URL → floor 1 → pixel dog?
2. **Installed PWA:** same flow → still emoji? → stale standalone cache
3. Title **build stamp** — compare to latest deploy commit on GitHub/Vercel
4. Optional: `?debugSprites=1` on URL → console logs `[sprite] enemy` with `src` / load failures

### User fix (immediate)

1. Remove Boss Rush from home screen
2. Open https://boss-rush-six.vercel.app in Safari, hard refresh
3. Add to Home Screen again

After deploy with auto-reload SW (`src/main.jsx`), opening the app once online should reload into the new bundle without reinstall.

### Custom Claude dog art (production)

- **99** `spriteKey` folders under `public/sprites/dogs/` (297 PNGs). Wired via `ENEMY_SPRITES` + `getEnemyCombatSpriteUrl` in `BossRush.jsx`.
- URLs include `?v=${__BUILD_ID__}` for cache bust on deploy. Verify: `npm run sprites:verify`.
- **Do not** run `npm run sprites:dogs` over folders with hand-drawn boss art.

### Regenerate procedural dog PNGs (missing keys only)

```bash
npx playwright install chromium   # once
npm run sprites:dogs            # fills gaps — overwrites existing folders
npm run build
```

## Key files

| Area | Path |
|------|------|
| Enemy sprite URLs | `BossRush.jsx` — `ENEMY_SPRITES`, `getEnemyCombatSpriteUrl`, `CharacterSprite`, `CombatantDisplay` |
| Catalog / `spriteKey` | `src/content/enemyThemes.js` |
| Dog generator | `tools/generate-dog-sprites.html`, `tools/export-dog-sprites.mjs` |
| Cat sprites | `public/sprites/cats/` |
| PWA | `src/main.jsx`, `vite.config.js` |
| Marketing / pitch | `docs/marketing-handoff.md`, `docs/marketing/` |

## Monetization env vars (Vercel / .env.local)

- Lemon: `LEMON_SQUEEZY_API_KEY`, `LEMON_STORE_ID`, `JWT_SECRET`, `VITE_LEMON_CHECKOUT_URL`
- Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `PUBLIC_SITE_URL`, `VITE_STRIPE_ENABLED`

Never commit secrets. Keep them in Vercel project env or local `.env.local` only.

## Tests (combat regressions)

```bash
node tools/auto-control-test.mjs
node tools/skill-cooldown-test.mjs
node tools/war-cry-test.mjs
node tools/save-meta-test.mjs
```

## Sound effects

- One-shots: `public/audio/sfx/{id}.ogg` — see [docs/sfx-bible.md](docs/sfx-bible.md) and [docs/claude-sfx-handoff.md](docs/claude-sfx-handoff.md)
- Code: `src/audio/sfx.js`, triggered from `BossRush.jsx`; same mute flag as BGM
- Verify: `npm run sfx:verify` (exits 1 until Claude delivers all files)

## Battle music

- Layered routing in `src/audio/themeMusic.js`: floor 1000 `doggod.ogg`, boss floors `boss.ogg`, hell theme `themes/hell.ogg`, else `battle.ogg` / `battle.mp3`, else Kenney `themes/*.ogg`.
- Title: `start.ogg`. Shop/select: `camp.ogg`.
- `npm run music:doggod` encodes `doggod.wav` → `doggod.ogg` (uses `@ffmpeg-installer/ffmpeg` if ffmpeg is not on PATH).
- `public/audio/doggod.wav` is gitignored; ship `doggod.ogg` only.

## Do not

- Ship FF1, viral phonk rips, or other copyrighted music without a license
- Commit `dist/` (Vercel builds from source)
- Edit `.cursor/plans/*.plan.md` unless the user asks
