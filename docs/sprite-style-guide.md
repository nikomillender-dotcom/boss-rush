# Boss Rush / Meow Rush — Pixel Sprite Style Guide

Authoritative reference for generating **cat** (player) and **dog** (enemy) combat sprites that match the shipped game. Values below come from `tools/generate-cat-sprites.html`, `tools/generate-dog-sprites.html`, `src/content/enemyThemes.js`, and `BossRush.jsx`.

Use this document with Claude Cowork (or any pixel artist) so new sprites drop into the repo without orientation, palette, or naming trial-and-error.

---

## 1. Project context

**Boss Rush** (also called **Meow Rush** in marketing copy) is a 1v1 turn-based RPG:

| Role | Species | Battle orientation | Screen position |
|------|---------|-------------------|-----------------|
| Player | Cat | **Back view** (faces upward toward enemy) | Bottom / player row |
| Enemy | Dog | **Left-facing side profile** (snout points left, toward center) | Top / enemy row |

- **Cats** appear in class select, camp, and battle. Box sprites are front-facing portraits; combat sprites are back-facing so the cat "looks up" at the dog.
- **Dogs** appear only in battle. There are **no dog box sprites**. Every enemy uses a `spriteKey` from the themed catalog (`src/content/enemyThemes.js`).
- **Mirror theme** (floors 501–600): reuses earlier capstone sprite PNGs but renders them **flipped vertically** (`scaleY(-1)`) in the UI. Do not draw upside-down source art; draw normal left-facing dogs and let the game flip them.
- Missing PNGs fall back to emoji (`CharacterSprite` in `BossRush.jsx`). Sprites should exist for production polish.

---

## 2. Canvas grid and scale

All procedural sprites share one logical coordinate system:

| Concept | Value |
|---------|-------|
| Logical grid | **24 × 24** cells |
| Box canvas (cats only) | **48 × 48** px → **2 px per grid cell** |
| Combat canvas (cats and dogs) | **96 × 96** px → **4 px per grid cell** |
| Scaling rule | Integer scale only: `u = canvasSize / 24` |
| Anti-aliasing | **Off** (`ctx.imageSmoothingEnabled = false`) |
| Rendering | Fill rects per grid cell; no fractional pixel placement on export |
| In-game display | Cats ~**76 px**, dogs ~**68 px**, with `imageRendering: "pixelated"` |

### Grid-to-pixel formula (from generators)

```javascript
const u = size / 24;
ctx.fillRect(Math.round(x * u), Math.round(y * u), Math.ceil(u), Math.ceil(u));
// Dogs use Math.round for width/height instead of Math.ceil — same integer result at 96px
```

### Safe framing

- Keep the character silhouette inside roughly **x: 0–22, y: 0–22** on the 24×24 grid.
- **Cats (combat back):** head toward **y = 0** (top), paws toward **y = 20–21**, tail may extend to **x = 19–21**.
- **Dogs (combat side):** snout toward **x = 0** (left), haunches toward **x = 16–21**, feet near **y = 17–20**.

### Do not

- Export at non-integer multiples of 24 (e.g. 72×72, 128×128) unless you also update the generators and game expectations.
- Use CSS blur, gradient anti-aliasing, or soft brushes on export.
- Center a tiny sprite in a large empty canvas; fill the grid like the reference generators.

---

## 3. Cat sprites

### 3.1 Classes and folders

Ten class folders under `public/sprites/cats/{classKey}/`:

| `classKey` | Display name | Type |
|------------|--------------|------|
| `warrior` | Tabby Knight | Base |
| `mage` | Whisker Mage | Base |
| `rogue` | Shadow Cat | Base |
| `cleric` | Holy Whisk | Base |
| `mage_knight` | Spellclaw Knight | Combo (warrior + mage) |
| `sage` | Sage of the Meow | Combo (mage + cleric) |
| `templar` | Sunclaw Templar | Combo (warrior + cleric) |
| `duelist` | Bladeclaw Duelist | Combo (warrior + rogue) |
| `arcanist` | Trickclaw Arcanist | Combo (mage + rogue) |
| `plaguecat` | Plagueclaw | Combo (rogue + cleric) |

Combo sprites **merge visual props from both parents** (e.g. mage_knight: silver knight helm + teal staff + mage cape accents).

### 3.2 Files per class (4 PNGs each → 40 total)

| Filename | Canvas | View | Used in |
|----------|--------|------|---------|
| `box.png` | 48×48 | **Front** (face camera) | Class select, camp |
| `combat_healthy.png` | 96×96 | **Back** (faces enemy at top) | Battle, default pose |
| `combat_alert.png` | 96×96 | Back | Tough fight / low relative HP threat |
| `combat_hurt.png` | 96×96 | Back | Player HP ≤ 35% max |

URL pattern: `/sprites/cats/{classKey}/{filename}`

### 3.3 Black chibi cat base (all classes)

Shared anatomy from `drawFrontBox` / `drawBackCombatBase`:

**Fur and body (same for every class)**

| Token | Hex | Usage |
|-------|-----|-------|
| `outline` | `#0a0a12` | 1-cell outline around all filled pixels (4-neighbor rule) |
| `fur` | `#1e1e28` | Main body, head, tail |
| `furHi` | `#3a3a48` | Highlights (shoulders, ear outer edge) |
| `furSh` | `#121218` | Shadow creases |
| `chest` | `#5a5a68` | Belly patch (front view only) |
| `eye` | `#5ae848` | Eye base (green glow) |
| `eyeHi` | `#9aff78` | Eye highlight pixel |
| `nose` | `#e85848` | Nose |
| `fang` | `#f8f8f8` | Tiny fangs (front view) |
| `band` | `#6a4428` | Hat band (back view, most classes) |

**Front box (`drawFrontBox`) layout**

- Sitting pose: paws at bottom (`y ≈ 20`), tail curled left (`x ≈ 1–3`).
- Head block `x: 7–16, y: 5–11`; triangular ears at `y: 3–5`.
- Eyes at `y: 7` (two 2×2 blocks); nose at `y: 9`.
- Class cape wraps torso `x: 5–18, y: 11–20` using class gear colors.
- Class-specific hat/weapon props drawn **before** outline pass.

**Back combat (`drawBackCombatBase`) layout**

- Head at top (`y: 4–9`), domed hat `y: 0–3`.
- Wide cape spread `x: 4–19, y: 10–18` (primary class read).
- Ears peek at shoulders `x: 6 and 16, y: 4`.
- Tail on **right** side from back view `x: 19–21, y: 10–14`.
- Paws at bottom `y: 20–21`.
- **Healthy** pose includes four 2×2 "sparkle" void pixels at grid `(2,8), (20,6), (21,14), (1,15)` using `#0a0a12` (same as outline — subtle battle glint).

### 3.4 Class gear palettes (`CLASS_GEAR`)

Each class overrides cape/hat/accent. Combos blend parent gear props.

| Class | Cape | Cape hi | Cape sh | Hat | Accent |
|-------|------|---------|---------|-----|--------|
| warrior | `#8a98a8` silver | `#c8d8e8` | `#5a6878` | silver | `#e8c838` gold |
| mage | `#6b3fa8` | `#9a6fd4` | `#4a2878` | mage purple | `#e8c838` gold |
| rogue | `#2a2838` | `#4a4860` | `#141220` | rogue dark | `#6a4420` leather |
| cleric | `#8a7020` holySh | `#c8a830` holy | `#8a7020` | `#e8e8f8` clerical | `#f0e070` holyHi |
| mage_knight | mage cape | mage hi/sh | mage sh | mage hat | `#38b8b0` teal |
| sage | mage cape | mage hi/sh | mage sh | mage hat | `#c8a830` holy |
| templar | silver cape | silver hi/sh | silver sh | silver hat | `#ffb040` sun |
| duelist | rogue cape | rogue hi/sh | rogue sh | silver hat | `#6a4420` leather |
| arcanist | rogue cape | rogue hi/sh | rogue sh | mage hat | `#38b8b0` teal |
| plaguecat | rogue cape | rogue hi/sh | rogue sh | `#388828` plagueSh hat | `#68c848` plague |

Extra class colors used in props:

| Token | Hex |
|-------|-----|
| gold / goldHi | `#e8c838` / `#fff0a0` |
| teal / tealHi | `#38b8b0` / `#68e8e0` |
| leather | `#6a4420` |
| holy / holyHi / holySh | `#c8a830` / `#f0e070` / `#8a7020` |
| sun / sunHi | `#ffb040` / `#ffe080` |
| plague / plagueSh | `#68c848` / `#388828` |
| clerical | `#e8e8f8` |

### 3.5 Class prop rules (weapons / hats)

**Warrior:** Silver helm `rect(5,0,14,5)` with gold brow band; shield on left `x: 1–3` (front) or sword on back `x: 2–4, y: 11–17`.

**Mage:** Purple wizard hat `rect(8,0,8,6)`; staff on right `x: 19, y: 7–17` with gold tip pixel.

**Rogue:** Wide hood `rect(4,1,16,5)` with side flaps; dagger on right `x: 21` or back pouch `x: 17`.

**Cleric:** White mitre + holy tabard with cross pixels (`holy` / `holyHi`).

**Combos:** Show **both** parent signifiers at reduced size (e.g. duelist: silver helm + rogue hood flaps + dual weapons).

**Plaguecat:** Rogue hood + green plague mask patch on face + toxic vial on hip.

### 3.6 Combat state overlays (`applyBackPoseOverlay`)

Branch from **healthy** base; do not redraw entire sprite.

| State | Trigger (game logic) | Visual changes |
|-------|---------------------|----------------|
| `healthy` | Default | Sparkle pixels on base |
| `alert` | Enemy ATK ≥ player ATK, round ≥ 10, or tough pool | Sparkles replaced with `#4a2878` (mageSh); furSh brow line; sweat drop `#88bbee` left side; shoulder tension line |
| `hurt` | HP / maxHP ≤ 0.35 | Bandage `#e8e8f0` on head; hurt splats `#d03030` on head/back; slumped shoulders (`furSh`) |

Overlay colors:

| Token | Hex |
|-------|-----|
| sweat | `#88bbee` |
| hurt | `#d03030` |
| bandage | `#e8e8f0` |

---

## 4. Dog sprites

### 4.1 Mandatory orientation

**Left-facing side profile only.**

- Snout extends toward **x = 0** (left).
- Haunches / tail toward **x = 16–21** (right).
- One visible eye on head block.
- One ear visible (pointed or floppy depending on variant).
- Collar band at neck using theme `acc` color (most tiers).

From `drawDogSideProfile`:

```
Haunches x: 16–20 | Body x: 9–18 | Head x: 5–9 | Snout x: 0–4
Feet y: ~17–20 (3 legs visible in profile)
Tail curves up behind haunches with acc-colored tip
```

### 4.2 Theme palettes (`PALETTES`)

Each theme defines: `o` (outline), `fur`, `hi`, `sh`, `acc`, `eye`, `nose`, `tongue`.

| Theme | `o` | `fur` | `hi` | `sh` | `acc` | `eye` | `nose` | `tongue` |
|-------|-----|-------|------|------|-------|-------|--------|----------|
| human | `#0a0a12` | `#c8a070` | `#e8c890` | `#8a6038` | `#5588cc` | `#1a1a28` | `#3a2820` | `#e85868` |
| monster | `#0a0a12` | `#68b848` | `#98e878` | `#388828` | `#a848c8` | `#ff4040` | `#284818` | `#88ff88` |
| hell | `#0a0a12` | `#8a2828` | `#c84848` | `#4a1010` | `#ff4488` | `#ffcc00` | `#2a0808` | `#ff6060` |
| space | `#0a0a12` | `#4a6888` | `#78a8c8` | `#283848` | `#88e8ff` | `#a0f0ff` | `#1a3040` | `#68c8e8` |
| alien | `#0a0a12` | `#68c8a0` | `#98f0c8` | `#388860` | `#c878ff` | `#101010` | `#204838` | `#78ffa8` |
| mirror | `#0a0a12` | `#7a78a8` | `#aaa8d8` | `#4a4868` | `#d8d0ff` | `#e8e8ff` | `#3a3858` | `#b8b0e8` |
| heaven_low | `#0a0a12` | `#f0e8c8` | `#fff8e0` | `#c8b888` | `#ffd858` | `#4088ff` | `#8a7858` | `#f0a0a0` |
| olympus | `#0a0a12` | `#d8c070` | `#fff0a0` | `#a88840` | `#ffe040` | `#1a1a28` | `#6a5020` | `#e87858` |
| pantheon | `#0a0a12` | `#e8d8b0` | `#fff8e8` | `#b8a070` | `#c8a030` | `#6020a0` | `#7a6848` | `#d0a070` |
| angelic | `#0a0a12` | `#f8f0ff` | `#ffffff` | `#d0c8e0` | `#88c8ff` | `#2840a0` | `#a898b8` | `#ffb0c0` |

Eye highlight pixel on dogs: `#f8f8ff` (1×1 inside eye block).

### 4.3 Sprite key naming (`spriteKey`)

Pattern parsed by `parseKey()` in `generate-dog-sprites.html`:

| Tier | Pattern | Example |
|------|---------|---------|
| Trash | `{theme}_trash_{0–7}` | `human_trash_3` |
| Trash (custom) | explicit override | `hell_trash_powerpup` (replaces `hell_trash_2` in catalog) |
| Mini-boss | `{theme}_mini_{tag}` | `human_mini_hoa_chair` |
| Capstone | `{theme}_cap_{tag}` | `human_cap_guy_dog` |
| Capstone (custom) | explicit override | `angelic_cap_doggod` |
| Space planet | `space_planet_{name}` | `space_planet_saturn` |

**Total unique keys:** 99 (→ 297 PNGs with 3 poses).

**Mirror theme trash** does not get its own PNGs. Mirror enemies reuse capstone `spriteKey` values (e.g. `human_cap_guy_dog`) with `flipSprite: true` in the catalog.

### 4.4 Trash tier (8 variants per theme)

Trash dogs use one of **8 silhouette recipes** (`TRASH_SILHOUETTES`), selected by variant index 0–7:

| Key | Silhouette traits |
|-----|-------------------|
| `stubby` | Bulky, floppy ears, optional tongue, extra shadow on haunches |
| `longsnout` | Long snout, tongue out, snout highlight stripe |
| `tallEars` | Extra-tall pointed ears (2×6 px) |
| `spotted` | Random `sh` spots on body; collar optional |
| `floppy` | Large floppy ear patch on head |
| `lean` | Long snout, extended haunch, acc tail accent |
| `chubby` | Bulky + belly bulge (`hi` oval) |
| `spiky` | Acc-colored ear/tail spikes |

Trash tier uses **lean mutt** proportions by default (`bulky: false`, standard snout).

Optional theme accents on trash:

- `monster` odd variants: extra limb stub `#a848c8`
- `hell`: horn pixels `#ff4488` on forehead
- `alien`: antenna nubs `#c878ff`

### 4.5 Mini-boss tier

- Base: `drawDogSideProfile` with **`bulky: true`**, shorter snout than capstone.
- Plus small prop layer from `drawBossUnique` mini tags:

| Tag | Prop |
|-----|------|
| `hoa_chair` | Brown gavel block `#6a5040` |
| `lair_keeper` | Acc crate `#acc` |
| `pit_captain` | Horn `#ff6622` |
| `hive_alpha` | Crown nub `#acc` |
| `gate_guard` | Halo band `#fff8c0` |
| `hero_hound` | Laurel `#ffe040` |
| `high_priest` | Staff stripe `#acc` |
| `arch_pup` | Wing nub `#acc` |

### 4.6 Capstone and planet bosses

**Capstone / planet** (`tier === "capstone"` or `tier === "planet"`):

1. Draw **unique prop layer first** (`drawBossUnique`).
2. Draw **large dog** on top: `bulky: true`, `snoutLong: true`, floppy ears for `guy_dog`, collar off for `doggod`.

**Space planet tints** (`PLANET_TINT`) override `fur` and `acc`:

| Planet | `fur` | `acc` | Unique prop |
|--------|-------|-------|-------------|
| mercury | `#b8b0a0` | `#ffaa44` | Acc patch on head |
| venus | `#e8c878` | `#88cc44` | — |
| earth | `#6a9a58` | `#4488cc` | Blue/green globe patch on body |
| mars | `#c86048` | `#ff8844` | Red dust puff on snout |
| jupiter | `#d8a868` | `#c87838` | Storm band `#c87838` on body |
| saturn | `#e8d0a0` | `#f0e8c8` | Ring `#acc` across body |
| uranus | `#78d8e8` | `#a8f0ff` | — |
| neptune | `#4868c8` | `#6888ff` | Deep blue tail cloud `#2840a8` |

Planet bosses appear on floors 310, 320, … 380 in the space block.

### 4.7 Dog combat state overlays

Same three filenames as cats. Overlays applied after body (`applyPoseOverlay`):

| State | Visual |
|-------|--------|
| `healthy` | Base only |
| `alert` | White eye flash `2×2` near snout; sweat `#88bbee`; tension line on body |
| `hurt` | Bandage on head; hurt `#d03030` on body and leg |

Game auto-selects state via `getEnemyCombatSpriteState()`:

- `hurt` if HP ≤ 35% max
- `alert` if enemy ATK ≥ player ATK, or boss, or capstone tier
- else `healthy`

---

## 5. Color palette rules

### 5.1 Global outline

- **1 px outline** (one grid cell at export scale) using `#0a0a12` on both cats and dogs.
- Cats: automatic 4-neighbor outline pass after all fills (`outline()` in grid buffer).
- Dogs: selective outline accents on snout tip, head top, and feet baseline, plus shared `o` token.

### 5.2 Shading model

Three-step fur/material shading per theme:

1. `fur` / base class color — mid tone
2. `hi` — lit planes (snout top, chest, haunch highlight)
3. `sh` — bellies, jaw line, leg shadows

Accent color `acc` / class `accent`: collars, tail tips, horns, props. Never use acc for entire body.

### 5.3 Color count

- Target **12–20 unique hex colors** per sprite including outline.
- Boss props may add 3–5 extra colors (see capstone table below).
- No gradients, no opacity, no sub-pixel alpha on export (PNG is flat pixel art).

### 5.4 Readability at 68 px

- Silhouette must read at **68 px displayed** (enemy portrait size).
- Props should extend **outside** the core dog/cat body by 1–3 grid cells max, not dominate the frame.
- High contrast between `fur` and `acc` for collar/tail tips.

---

## 6. Anatomy and proportions

### 6.1 Cat proportions (24×24 grid)

| Region | Front box | Back combat |
|--------|-----------|-------------|
| Head | ~40% height, centered x | Top third, hat adds 2–3 rows above |
| Body | Rounded rectangle, cape wider than head | Cape is widest element (16 cells) |
| Limbs | Two paw stubs bottom | Two paw blocks bottom, no individual digits |
| Tail | Left curl, 3 segments | Right side, 3 segments |
| Face | Two eyes, nose, fangs | No face visible (back of head) |
| Ears | Triangles y: 3–5 | Two bumps at y: 4 |

### 6.2 Dog proportions (24×24 grid)

| Region | Grid span (typical trash) |
|--------|---------------------------|
| Snout | x: 0–4, 3 cells tall |
| Head | 5×6 block |
| Neck | 4×5 at x: 8 |
| Body | 9×8 to 11×9 |
| Legs | 2×4 blocks, three visible |
| Tail | acc tip at x: 19–21, y: 0–3 |
| Ear | 2×4 pointed or 3×3 floppy |

**Boss bulky mode:** body width +2, y-offset −1, snout +1 cell length.

### 6.3 Eye style

- **Cats (front):** 2×2 green blocks + 1×1 `eyeHi` each.
- **Cats (back):** not visible.
- **Dogs:** 2×2 `eye` + 1×1 `#f8f8ff` highlight; single eye in profile.

### 6.4 Accessories

- **Collar:** 4×1 `acc` band at neck (y ≈ y0+6). Omit for some spotted trash variants and `doggod`.
- **Tongue:** 2×2 `tongue` hanging from snout when `tongueOut: true`.
- **No human hands** except capstone props (guy_dog, devil_pair).

---

## 7. File naming and folder structure

### 7.1 Cats

```
public/sprites/cats/
  warrior/
    box.png
    combat_healthy.png
    combat_alert.png
    combat_hurt.png
  mage/
    ...
  plaguecat/
    ...
```

Served at: `/sprites/cats/{classKey}/{filename}`

### 7.2 Dogs

```
public/sprites/dogs/
  human_trash_0/
    combat_healthy.png
    combat_alert.png
    combat_hurt.png
  human_cap_guy_dog/
    combat_healthy.png
    combat_alert.png
    combat_hurt.png
  space_planet_saturn/
    ...
  angelic_cap_doggod/
    ...
```

Served at: `/sprites/dogs/{spriteKey}/combat_{healthy|alert|hurt}.png`

**No `box.png` for dogs.**

### 7.3 Naming rules for new enemies

1. Add catalog entry in `src/content/enemyThemes.js` with `spriteKey`.
2. Regenerate or hand-place PNGs at that exact key path.
3. Run `npm run sprites:dogs` to verify the key is in `getAllEnemySpriteKeys()`.
4. For mirror reskins, reuse an existing capstone key; set `flipSprite: true` on the catalog entry.

---

## 8. Export workflow

### 8.1 Prerequisites

```bash
npm install
npx playwright install chromium   # once per machine
```

### 8.2 Cat sprites (40 PNGs)

**Automated (recommended):**

```bash
npm run sprites
# runs: node tools/export-sprites.mjs
# reads tools/generate-cat-sprites.html → public/sprites/cats/
```

**Manual ZIP:**

1. Open `tools/generate-cat-sprites.html` in a browser.
2. Click **Download ZIP (game-ready paths)**.
3. Unzip into `public/sprites/cats/` (paths inside ZIP: `{class}/box.png`, `{class}/combat_*.png`).

### 8.3 Dog sprites (297 PNGs)

```bash
npm run sprites:dogs
# runs: node tools/export-dog-sprites.mjs
# injects getAllEnemySpriteKeys() into generate-dog-sprites.html
# writes public/sprites/dogs/{spriteKey}/combat_*.png
```

Playwright loads the HTML file, calls `buildAllSprites()`, waits for `exports.length >= keys.length * 3`, then writes PNGs from canvas data URLs.

### 8.4 Hand-authored PNGs (Claude Cowork output)

If generating PNGs outside the HTML tools:

1. Match exact canvas sizes (48 or 96).
2. Place files at paths above.
3. Do **not** commit `dist/`; Vercel rebuilds on deploy.
4. After `npm run build`, service worker precaches `sprites/dogs/**` and cat sprites.

### 8.5 Updating generators

If you add a new class or enemy key, update:

- `tools/generate-cat-sprites.html` (`CLASSES` array) for cats
- `src/content/enemyThemes.js` catalog for dogs (export script picks up keys automatically)

---

## 9. Integration checklist

After dropping new PNGs:

- [ ] **File paths** match `spriteKey` / `classKey` exactly (case-sensitive, underscores).
- [ ] **Dimensions:** 48×48 (cat box) or 96×96 (all combat).
- [ ] **Orientation:** cat combat = back view; dog combat = left profile.
- [ ] **States:** all three `combat_*.png` exist per combat character.
- [ ] **Local dev:** `npm run dev` → class select shows cat box; floor 1 shows dog portrait not emoji.
- [ ] **Debug:** append `?debugSprites=1` to URL; console logs `[sprite] enemy` / `[sprite] player` with `src` and load failures.
- [ ] **Mirror floors:** verify flipped sprites still read clearly at 68 px (vertical flip only).
- [ ] **Build:** `npm run build` succeeds; spot-check `dist/sprites/...` if needed.
- [ ] **PWA cache:** after deploy, stale installs may need one online refresh (see `AGENTS.md`).

### In-game portrait sizes

| Combatant | Display size | Source canvas |
|-----------|---------------|---------------|
| Player cat | 76 px | 96×96 combat |
| Enemy dog | 68 px | 96×96 combat |
| Class select box | varies | 48×48 box |

---

## 10. Boss and capstone special cases (`drawBossUnique`)

Draw these **behind** the side-profile dog body unless noted.

| Key / tag | Visual prop summary |
|-----------|---------------------|
| `guy_dog` / human capstone | Human legs `#6a8a9a`, shirt `#88aa88`, face `#e8c8a0` behind dog |
| `chimera` | Extra horns `#acc`, snake tail `#68c848` |
| `devil_pair` | Pink devil blob `#ff4488` / `#cc2266` behind dog |
| `solar` | 8-ray sun `#ffe040`, core `#ffb830` / `#fff0a0` |
| `galaxy_apex` | Antenna `#acc`, purple/green star specks |
| `inverted` | Mirror capstone accents `#d8d0ff` (game flips vertically) |
| `seraph` | Low halo wings `#fff8c0` / `#fff8e8` |
| `zeusion` | Lightning bolt `#fff0a0` / `#ffe040` crown |
| `unnamed` | Void cloak `#1a1030`–`#402060`, glowing eye `#acc` |
| `doggod` | **Covers most of frame:** white fluff `#f0e8ff`, all-seeing eye `#2840a0`, gold horns `#ffd858`; **no collar** |
| `powerpup` | Pink devil onesie `#ff88aa` / `#ff4488` on trash body |
| Planet keys | See planet table in §4.6 |
| Generic capstone fallback | Theme-specific horns/flames/auras per `theme` in `drawBossUnique` |

**Doggod** (`angelic_cap_doggod`, floor 1000): largest visual exception; eye and halo dominate silhouette. Still export left-facing logic but prop layer fills center frame.

**Hell trash powerpup** uses key `hell_trash_powerpup` (not `hell_trash_2`).

---

## 11. Do / Don't

### Cats

| Do | Don't |
|----|-------|
| Draw box **front**, combat **back** | Draw combat cats front-facing |
| Use shared black fur base + class cape colors | Give each class a different fur species color |
| Keep sparkles on healthy combat back | Remove sparkles without updating `drawBackCombatBase` parity |
| Merge both parent props on combo classes | Ship combo as plain recolor of one parent |
| 1px `#0a0a12` outline via neighbor rule | Use colored outline or 2px outline |
| Integer 24×24 grid scaled to 48 or 96 | Freehand at arbitrary resolution then scale down |

### Dogs

| Do | Don't |
|----|-------|
| Draw **left-facing** side profile | Draw front-facing or right-facing dogs |
| Match theme palette from `PALETTES` | Invent new theme hex without updating generator + catalog |
| Use 8 trash silhouettes for variety | Make all trash identical mutts |
| Put boss props in `drawBossUnique` layer | Embed text or UI into sprite |
| Name folder exactly `spriteKey` | Use display name ("Guy With A Dog") as folder |
| Export 3 combat poses | Ship healthy-only (alert/hurt will miss) |

### Both

| Do | Don't |
|----|-------|
| Flat pixel art, no AA | Gaussian blur, photo textures |
| Test at 68–76 px on dark `#080810` background | Assume 96 px full-screen display |
| Verify with `?debugSprites=1` | Silently rely on emoji fallback |
| Follow catalog `spriteKey` | Add PNGs without catalog entry |

---

## 12. Claude Cowork prompt template

Copy, fill `{BRACKET}` placeholders, attach this doc plus a screenshot of the target tier if available.

```
You are generating pixel art PNGs for Boss Rush (Meow Rush), a turn-based RPG.

READ FIRST: docs/sprite-style-guide.md in the repo. Follow it exactly.

TASK: Create {COUNT} PNG files for {CAT_OR_DOG}:
{LIST_FILE_PATHS}

HARD CONSTRAINTS:
- Canvas size: {48x48 for cat box | 96x96 for all combat}
- Logical grid: 24x24 cells, integer scale only, NO anti-aliasing
- Cat box: front-facing sitting black chibi cat, class props: {CLASS_KEY}
- Cat combat: BACK view (head toward top edge), faces enemy above
- Dog combat: LEFT-facing SIDE PROFILE (snout toward left edge), haunches right
- Outline: #0a0a12, 1 grid cell (4-neighbor rule for cats)
- Palette: use exact hex from style guide section {5 or 3.4/4.2}
- States: healthy (default), alert (sweat/tension #88bbee), hurt (bandage #e8e8f0 + #d03030)
- Export: flat PNG, transparent or solid dark background matching #080810
- Do NOT flip dogs for mirror theme; game applies scaleY(-1) in CSS

THEME / CLASS DETAILS:
- spriteKey or classKey: {KEY}
- Tier: {trash | mini | capstone | planet}
- Silhouette: {trash silhouette name if dog trash}
- Boss props: {from drawBossUnique table if applicable}

OUTPUT:
Return PNG bytes at exact paths under public/sprites/{cats|dogs}/...
File names must match: box.png OR combat_healthy.png, combat_alert.png, combat_hurt.png

ANTI-PATTERNS (reject if present):
- Right-facing dog
- Front-facing cat in combat
- Soft edges or gradient shading
- Wrong dimensions
- Wrong folder name (must match spriteKey/classKey exactly)

Reference implementation: tools/generate-{cat|dog}-sprites.html
```

---

## Appendix A: Quick reference counts

| Asset set | Folders | PNGs per folder | Total PNGs |
|-----------|---------|-----------------|------------|
| Cats | 10 classes | 4 (1 box + 3 combat) | 40 |
| Dogs | 99 sprite keys | 3 combat only | 297 |

## Appendix B: Game code cross-reference

| Concern | File |
|---------|------|
| Cat paths / class list | `BossRush.jsx` — `CLASS_SPRITES`, `catSpritePath` |
| Dog paths / sprite map | `BossRush.jsx` — `ENEMY_SPRITES`, `getEnemyCombatSpriteUrl` |
| Combat pose selection | `getPlayerCombatSpriteState`, `getEnemyCombatSpriteState` |
| Mirror flip | `CombatantDisplay` — `transform: scaleY(-1)` when `spriteFlip` |
| Enemy catalog + keys | `src/content/enemyThemes.js` — `getAllEnemySpriteKeys()` |
| Cat generator | `tools/generate-cat-sprites.html` |
| Dog generator | `tools/generate-dog-sprites.html` |
| Cat export | `tools/export-sprites.mjs` → `npm run sprites` |
| Dog export | `tools/export-dog-sprites.mjs` → `npm run sprites:dogs` |
| Floor theme map | `docs/enemy-themes.md` |

## Appendix C: Known gaps and reference art

| Gap | Notes |
|-----|-------|
| `tools/reference/` | **Directory does not exist** in repo. No bundled reference PNG sheet. |
| Mage reference art | `README.md` mentions external mage box reference; `scaleReference()` exists in cat generator but is **not wired** into current `buildAll()`. |
| Hand-drawn replacement | To replace generator art, match grid/proportions from HTML output screenshots. |
| `hell_trash_2` | Catalog index 2 uses `spriteKey: hell_trash_powerpup`; there is no `hell_trash_2` folder. |
| Mirror trash PNGs | No `mirror_trash_*` keys; mirror reuses capstone PNGs with vertical flip. |
| Space mini-boss | No `space_mini_*`; planet bosses (`space_planet_*`) cover decade bosses in space block. |

---

*Generated from source audit of Boss Rush sprite pipeline. When code and this doc disagree, trust the generators and `enemyThemes.js`, then update this doc.*
