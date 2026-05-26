# Meow Rush — music sources

Shipped BGM is a mix of **original chiptune loops** (UltraBox / Claude Cowork) and **CC0 Kenney** theme fallbacks.

**Do not** use Final Fantasy or other copyrighted game rips.

## Custom tracks (primary)

| File | Scene / condition |
|------|-------------------|
| `start.ogg` | Title screen only |
| `camp.ogg` | Shop + class select |
| `battle.ogg` | Most combat |
| `boss.ogg` | Every 10th floor + mega boss (`isBossRound`) |
| `themes/hell.ogg` | Hell theme floors (201–300) |
| `doggod.ogg` or `doggod.wav` | Floor 1000 capstone |

Layer order in [`src/audio/themeMusic.js`](../src/audio/themeMusic.js): **doggod → boss (manual only) → hell theme → battle → Kenney theme**.

### AUTO mode

When **AUTO is on**, `boss.ogg` is skipped so rapid boss floors do not flip tracks and restart. **Doggod** (floor 1000) and **hell** theme tracks still apply. When **AUTO is off**, every `isBossRound` floor uses `boss.ogg` if present.

### Title music

`start.ogg` plays on the title screen after the first tap or key press (browser autoplay policy). Shop and class select use `camp.ogg` only.

### Loop seams

Custom loops use a short tail trim in code (~0.06–0.08s before the file end) to reduce clicks. For seamless loops, re-export from UltraBox with aligned zero-crossings at the loop point.

## Kenney fallbacks

Remaining `public/audio/themes/*.ogg` files are CC0 Kenney loops used only when no custom battle track applies and the layered resolver falls through to the theme id.

Regenerate Kenney files:

```bash
npm run music:themes
```

**Warning:** `music:themes` overwrites `camp.ogg` and `themes/hell.ogg` with Kenney defaults. Back up custom files first.

## Optional scripts

```bash
npm run music:battle   # CC0 funk MP3 fallback (superseded by battle.ogg)
npm run music:doggod   # doggod.wav → doggod.ogg (needs ffmpeg)
```

## Sound effects (SFX)

One-shots in `public/audio/sfx/{id}.ogg`. Wired in `src/audio/sfx.js`; triggered from `BossRush.jsx`. Respects the same mute flag as BGM (`bossRush_muted`).

- Spec for Claude: [sfx-bible.md](sfx-bible.md)
- Handoff checklist: [claude-sfx-handoff.md](claude-sfx-handoff.md)
- Verify: `npm run sfx:verify`

Until OGG files exist, SFX calls no-op silently.

## In-game wiring

- BGM: `src/audio/themeMusic.js`
- SFX: `src/audio/sfx.js`
- Scenes: `BossRush.jsx` — `playTitleMusic` (title), `playCampMusic` (shop/select), `playThemeForRound` (battle)
- PWA precache: `vite.config.js` includes `*.ogg`, `*.mp3`, `*.wav`

## Licensing summary

| Source | Safe for Meow Rush? |
|--------|---------------------|
| Custom UltraBox originals in `public/audio/` | Yes (document in CREDITS.txt) |
| Kenney / OpenGameArt CC0 | Yes |
| Viral phonk / TikTok edits | No |

Full per-file lines: [CREDITS.txt](../CREDITS.txt).
