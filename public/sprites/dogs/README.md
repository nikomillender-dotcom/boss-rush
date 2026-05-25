# Enemy dog sprites

Combat PNGs only (no box sprites). **Side-profile** dogs (snout left). Keys match `spriteKey` in `src/content/enemyThemes.js`. Capstone and planet bosses have extra prop layers.

```
{spriteKey}/combat_healthy.png
{spriteKey}/combat_alert.png
{spriteKey}/combat_hurt.png
```

Generate all keys:

```bash
npm run sprites:dogs
```

Requires Playwright Chromium (`npx playwright install chromium` once).
