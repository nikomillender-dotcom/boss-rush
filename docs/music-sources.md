# Boss Rush — music sources

All shipped BGM is **CC0** from [Kenney Music Loops](https://kenney.nl/assets/music-loops), mirrored at [gamesounds.xyz](https://www.gamesounds.xyz/?dir=Kenney%27s+Sound+Pack%2FMusic+Loops).

**Do not** use Final Fantasy or other copyrighted game rips.

## Regenerate theme files

```bash
npm run music:themes
```

This runs `tools/prepare-theme-music.mjs`, which downloads OGG loops into `public/audio/` and refreshes `CREDITS.txt` and `public/CREDITS.txt`.

## Theme → track mapping

| File | Kenney track |
|------|----------------|
| `camp.ogg` | Farm Frolics |
| `themes/human.ogg` | Retro Beat |
| `themes/monster.ogg` | Retro Mystic |
| `themes/hell.ogg` | Sad Descent |
| `themes/space.ogg` | Space Cadet |
| `themes/alien.ogg` | German Virtue |
| `themes/mirror.ogg` | Retro Comedy |
| `themes/heaven_low.ogg` | Night at the Beach |
| `themes/olympus.ogg` | Mission Plausible |
| `themes/pantheon.ogg` | Flowing Rocks |
| `themes/angelic.ogg` | Alpha Dance |

Full per-file license lines: [CREDITS.txt](../CREDITS.txt).

## In-game wiring

- Module: `src/audio/themeMusic.js`
- Scene hooks: `BossRush.jsx` (`playCampMusic` / `playThemeForRound` / mute toggle)
- PWA precache: `vite.config.js` includes `*.ogg`
