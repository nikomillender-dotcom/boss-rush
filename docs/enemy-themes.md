# Enemy themes — 1000-floor map

Boss Rush enemies are themed **dog** foes in 10 blocks of 100 floors, then **free play** from floor 1001.

Boss cadence: **every 10 floors** (mini-boss or special). **Century floors** (100, 200, … 1000) use unique capstone bosses.

## Floor map

| Floors | Theme | Trash vibe | Capstone (×100) |
|--------|--------|------------|------------------|
| 1–100 | Suburban (`human`) | Wacky suburban humans + dogs | **Guy With A Dog** |
| 101–200 | Monster (`monster`) | Monster-dog hybrids | **Chimera Dog** |
| 201–300 | Hell (`hell`) | Demon dogs; Pink Devil Dog parody | **Devil & Dog Duo** |
| 301–400 | Space (`space`) | Solar-system dogs | **Solar Pack Alpha** (+ planet bosses 310–380) |
| 401–500 | Alien (`alien`) | Galaxy dogs | **Galaxy Apex Hound** |
| 501–600 | Mirror (`mirror`) | Upside-down reskins (sprites flipped) | **Inverted Overdog** |
| 601–700 | Heaven (`heaven_low`) | Low-tier angels + dogs | **Low Seraph & Spaniel** |
| 701–800 | Olympus (`olympus`) | Greek parodies + dogs | **Zeusion & Thunder Pup** |
| 801–900 | Pantheon (`pantheon`) | Major-deity parodies | **The Unnamed Walker** |
| 901–1000 | Angelic (`angelic`) | Angelic dogs | **Doggod: All Seeing Eye** |
| 1001+ | Free play | Random gauntlet from full catalog | — |

## Sprites

- Path: `public/sprites/dogs/{spriteKey}/combat_{healthy,alert,hurt}.png` (side-profile silhouettes; bosses have unique props)
- Regenerate: `npm run sprites:dogs` (Playwright + `tools/generate-dog-sprites.html`)
- Emoji fallback if PNG missing (battle still works)

## Screenshot checklist (marketing)

1. Class select (cat box sprites)
2. Floor 1 — suburban trash dog
3. Floor 100 — Guy With A Dog capstone
4. Floor 201 — hell theme transition + Pink Devil Dog
5. Floor 310 — Mercury Hound (planet mini-boss)
6. Floor 400 — Solar Pack Alpha
7. Floor 600 — mirror theme (upside-down portrait)
8. Floor 1000 — Doggod: All Seeing Eye
9. Floor 1005 — FREE PLAY HUD

## Legal / naming

Shipped names are parody-safe (no trademark deity or cartoon names). Lore uses euphemisms (“The Unnamed Walker”, “Pink Devil Dog” onesie).

## Code

- Catalog & resolver: `src/content/enemyThemes.js`
- Battle wiring: `BossRush.jsx` (`buildEnemy`, `ENEMY_SPRITES`, `flipSprite`)
