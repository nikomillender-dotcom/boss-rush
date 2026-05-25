# Boss Rush

Turn-based cat-vs-dog gauntlet — survive endless scaled foes, build coin streaks, and pick your class.

## Run locally

```bash
npm install
npm run pwa-icons   # first time — writes public/icons/*.png
npm run dev
```

## Install on your phone (PWA)

Build and deploy `dist/` to any static host with HTTPS (Vercel, Netlify, or Cloudflare Pages).

```bash
npm run build
```

### Deploy on Vercel

1. Push this repo to GitHub.
2. Import the project at [vercel.com](https://vercel.com) → Framework **Vite**, output directory **`dist`**.
3. Open the deployed HTTPS URL on your phone.

### iPhone

1. Open the site in **Safari** (not Chrome).
2. **Share** → **Add to Home Screen**.
3. Launch from the home screen icon.

### Android

1. Open the site in **Chrome**.
2. Tap **Install app** (or menu → Install / Add to Home screen).

Saves use `localStorage` and persist in the installed app. After the first online visit, the service worker caches the game for faster loads and offline play.

## Cat sprites

- **Camp / class select:** front-facing `box.png` (48px). Mage box uses your reference art.
- **Battle:** back-facing `combat_*.png` (96px) so the cat faces the enemy at the top of the screen.

Regenerate: `npm run sprites` (or `tools/generate-cat-sprites.html`). See `public/sprites/cats/README.md`.

## Camp loop

1. **Title** → **Class select** → **Shop (camp)**
2. Spend wallet coins on **HP / Attack / Defense / SP** (+1 each, up to +10 per class)
3. Weapons and skill upgrades (levels 1–10; cooldown drops at levels 5 and 10)
4. **Start gauntlet** → battle until death or **Retreat** → camp

## Retreat

**Retreat** ends the run and returns to camp. You lose only **coins earned this run** (wallet from earlier runs is kept). Your **best round reached** is saved.

## Personal best

`save.records.rounds` tracks the highest round you reached (death or retreat). Shown on the title screen, class select, battle HUD, and game over.

## Classes

| Class | Notes |
|-------|--------|
| Tabby Knight | Tanky physical |
| Whisker Mage | Spells scale with attack |
| Shadow Cat | Evasion and pickpocket |
| Spellclaw Knight | Unlock: Warlord Axe + Void Tome. Merged stats, 6 skills, camp read-only |

## Combat

- Kill rewards use streak multipliers (capped) and a global reward multiplier
- **Block** then **defense** both reduce damage; the battle log shows the final number applied to HP
- Hard-tier dogs can trigger named **special attacks** (higher damage)
- Enemy scaling is softer early and ramps harder after round 8

## Save

`localStorage` key: `bossRush_save` (wallet, per-class upgrades, unlocks, records).
