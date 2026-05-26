# Enemy dog sprites

Full art spec: [`docs/sprite-style-guide.md`](../../../docs/sprite-style-guide.md).

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

**Custom boss art:** If Claude Cowork drops PNGs into `public/sprites/dogs/{spriteKey}/`, do not run `sprites:dogs` for those folders or you will overwrite them. Verify with `node tools/verify-sprite-assets.mjs`.
