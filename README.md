# Boss Rush

Turn-based cat-vs-dog gauntlet — survive endless scaled foes, build coin streaks, and pick your class.

**Play (production):** https://boss-rush-six.vercel.app

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

### Push to GitHub (one-time)

Git is initialized locally. GitHub CLI is installed but needs a login (interactive):

```bash
gh auth login
cd "c:\Users\nikol\Documents\Boss Rush"
gh repo create boss-rush --public --source=. --remote=origin --push
```

If your GitHub username is not `nikomillender`, update the remote first:

```bash
git remote set-url origin https://github.com/YOUR_USER/boss-rush.git
git push -u origin main
```

### Deploy on Vercel

1. Push this repo to GitHub (see above).
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

## Enemy dog sprites & 1000 floors

- **10 themed blocks** of 100 floors (suburban → angelic), then **free play** from floor 1001.
- **Battle portraits:** `public/sprites/dogs/{spriteKey}/combat_*.png` (back-facing, toward the cat).
- Regenerate: `npm run sprites:dogs` (requires Playwright Chromium).
- Floor map and screenshot list: [`docs/enemy-themes.md`](docs/enemy-themes.md).

## Music (CC0)

- **Camp + battle:** one Kenney loop per theme block (`public/audio/themes/*.ogg`) plus `camp.ogg`.
- **Credits:** [`CREDITS.txt`](CREDITS.txt) — do not substitute copyrighted game rips (e.g. Final Fantasy).
- **Fetch loops:** `npm run music:themes` (downloads from Kenney CC0 mirror).
- **Mute:** ♪ / 🔇 on the battle control bar; preference saved in `localStorage`.

## Marketing

- Ad / Claude handoff: [`docs/marketing-handoff.md`](docs/marketing-handoff.md)

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
