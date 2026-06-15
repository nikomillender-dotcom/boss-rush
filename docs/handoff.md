# Boss Rush — dev handoff (May 26, 2026)

Picking up the project? Start here, then [AGENTS.md](../AGENTS.md) for the deep notes.

## Prod state

- **URL:** https://boss-rush-six.vercel.app
- **Build stamp on title:** `v1.0.1 · ffc8586`
- **HEAD:** `ffc8586` on `main`
- **Vercel project:** `nikomillender-dotcoms-projects/boss-rush`, prod alias `boss-rush-six.vercel.app` -> latest deployment

## What shipped this session (newest first)

| Commit | What |
| ------ | ---- |
| `ffc8586` | Fix silent SFX on mobile. `src/audio/sfx.js` now lazy-creates `Audio` elements on demand (capped at `POOL_PER_ID = 3`) instead of preloading 105 instances at unlock. The old preload exhausted iOS Safari / Android Chrome decoder pools, so every `.play()` silently rejected. |
| `8e79085` | Compact camp shop. New `LevelBar` + `StatRow` components (battle `HpBar` style) replace the full-width upgrade buttons. Sticky header (sprite + class name + wallet) and sticky footer (START + Back). Weapons are a 2-column grid of mini tiles. Everything fits or scrolls cleanly inside the existing `shop-screen-scroll`. |
| `323da45` | PWA auto-reload on new deploy. `src/main.jsx` listens for `serviceWorker.controllerchange` and reloads once when a new SW takes over. Killed the leftover `debugLog` POSTing to `http://127.0.0.1:7481`. Refit `TitleScreen` (scroll shell, smaller sword, collapsible Account / Buy block). Version bumped `1.0.0` -> `1.0.1`. |

## Known good

- BGM per theme (`title`, `camp`, `battle`, hell theme, boss, doggod, free play).
- SFX: ~50 call sites in `BossRush.jsx` (ui_click/confirm/cancel/error, camp_buy, fight_hit, enemy_hit, defend, dodge, skill_cast, sfxForSkill family, victory, death, coin_pickup, boss_enter, theme_transition, floor_transition, auto_on/off, run_retreat). All wired, all audible after `ffc8586`.
- Combat regression tests pass: `auto-control-test`, `skill-cooldown-test`, `war-cry-test`, `save-meta-test`.
- PWA: installed app auto-reloads into new build on first online open after deploy.

## Open / watch

- `package.json` `version` is `1.0.1`. Next user-visible change worth a bump -> `1.0.2`. The title build stamp pulls `v{version} · {sha7}` from `vite.config.js` `define`.
- Manual `npx vercel deploy --prod --yes` from the working tree still works, but every commit on `main` now auto-deploys via Vercel's git integration. Prefer git push.
- `docs/sfx-bible.md` lists 35 SFX ids; all delivered as both `.ogg` and `.wav` in `public/audio/sfx/`. Only the `.ogg` files are loaded at runtime; the `.wav` files are kept for source/reference.
- `BossRush.jsx` still has a no-op `debugLog()` (no fetch). 7 call sites pass it real data. Safe to leave as-is or delete entirely on next pass.

## Common bug-class reproductions

- **Title shows old SHA on phone:** PWA cache. After a deploy, open the app online once — new SW activates, `controllerchange` fires in `src/main.jsx`, page reloads into the new bundle. If it still shows old: confirm `boss-rush-six.vercel.app` itself serves the new SHA via `WebFetch` first.
- **Phone shows emoji dogs instead of sprites:** stale PWA bundle from before `3ff3563`. Same fix as above; or remove from home screen, reload Safari, reinstall.
- **SFX silent again:** check `src/audio/sfx.js` for a re-introduced eager preload pattern. Lazy `nextAudio(id)` inside `playSfx` is what keeps iOS happy.

## Key files

| Area | Path |
| ---- | ---- |
| SFX | [src/audio/sfx.js](../src/audio/sfx.js), [docs/sfx-bible.md](sfx-bible.md) |
| BGM | [src/audio/themeMusic.js](../src/audio/themeMusic.js) |
| Camp / shop | `ShopScreen`, `ShopSection`, `StatRow`, `LevelBar` in [BossRush.jsx](../BossRush.jsx) |
| Title | `TitleScreen` in [BossRush.jsx](../BossRush.jsx) |
| PWA wiring | [src/main.jsx](../src/main.jsx), [vite.config.js](../vite.config.js) |
| Enemy sprites | `ENEMY_SPRITES`, `getEnemyCombatSpriteUrl` in [BossRush.jsx](../BossRush.jsx) |
| Domain lock | [src/access/domainLock.js](../src/access/domainLock.js) |

## Verify before shipping

```bash
npm run build
npm run sfx:verify
node tools/auto-control-test.mjs
node tools/skill-cooldown-test.mjs
node tools/war-cry-test.mjs
node tools/save-meta-test.mjs
```

All must pass. Then `git push origin main` and confirm Vercel deploys ready.
