# Cat class sprites

Vite serves `public/` at `/sprites/cats/...`.

## Layout

| File | Size | View | Used in |
|------|------|------|---------|
| `box.png` | 48×48 | **Front** (face camera) | Class select, camp |
| `combat_healthy.png` | 96×96 | **Back** (faces enemy at top) | Battle |
| `combat_alert.png` | 96×96 | Back | Tough fight |
| `combat_hurt.png` | 96×96 | Back | Low HP |

Folders: `warrior/`, `mage/`, `rogue/`, `cleric/`, and each combo (`mage_knight/`, `sage/`, `templar/`, `duelist/`, `arcanist/`, `plaguecat/`).

## Regenerate

1. From repo root:

```bash
npm install
npx playwright install chromium
npm run sprites
```

Or open `tools/generate-cat-sprites.html` in a browser and download the ZIP, then unzip here.

Until PNGs exist, the game uses emoji fallbacks.
