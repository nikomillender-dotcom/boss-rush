# Meow Rush / Boss Rush — SFX Bible (for Claude Cowork)

Authoritative brief for **one-shot** sound effects. BGM already ships in `public/audio/`; this document defines **SFX only**.

---

## 1. Game identity

| Field | Value |
|--------|--------|
| Title | Boss Rush / **Meow Rush: Gauntlet** |
| Genre | Turn-based 1v1 RPG gauntlet, mobile PWA |
| Fantasy | Black chibi **cat** vs themed **dog** enemies, 1000+ floors, camp upgrades |
| Tone | Funny, wacky, meme-adjacent — not grimdark |
| Visual | 8-bit pixel, `#0a0a12` UI — audio must **match** |

---

## 2. Match existing BGM (listen first)

| File | Vibe |
|------|------|
| `public/audio/camp.ogg` | 8-bit **dembow** — shop |
| `public/audio/battle.ogg` | 8-bit **funk dembow fusion** — combat |
| `public/audio/boss.ogg` | Boss fight, heavier |
| `public/audio/themes/hell.ogg` | 8-bit **baile funk** — floors 201–300 |
| `public/audio/start.ogg` | Title |
| `public/audio/doggod.ogg` | Floor 1000 capstone |

**SFX direction:** square/pulse waves, dry and snappy, subtle dembow swing on UI/coins OK. **No** realistic samples, **no** FF/phonk rips, **no** long reverb tails.

**Tool:** UltraBox (same as BGM) or equivalent chiptune export.

---

## 3. Technical spec

| Rule | Value |
|------|--------|
| Format | **OGG Vorbis** (mono preferred) |
| Sample rate | 44100 Hz |
| Loudness | Peaks ~**-6 to -3 dBFS** |
| Trim | &lt; 5 ms silence at start; no long tail |
| Delivery path | `public/audio/sfx/{id}.ogg` |
| License | **Original** — game use; list in CREDITS.txt |

---

## 4. File manifest (required)

### UI / flow

| id | Duration | Description |
|----|----------|-------------|
| `ui_click` | 50–80 ms | Menu blip |
| `ui_confirm` | 80–120 ms | Ascending confirm |
| `ui_cancel` | 60–100 ms | Descending back |
| `ui_error` | 100–150 ms | Can't afford / can't run |
| `camp_buy` | 120–200 ms | Shop purchase |

### Combat — player

| id | Duration | Description |
|----|----------|-------------|
| `fight_hit` | 100–180 ms | Physical attack |
| `fight_hit_crit` | 150–220 ms | Backstab / crit |
| `defend` | 100–150 ms | Shield brace |
| `skill_cast` | 80–120 ms | Generic skill open |
| `skill_fire` | 200–350 ms | Fire / afterburn |
| `skill_ice` | 200–350 ms | Freeze |
| `skill_thunder` | 250–400 ms | Thunder / big nuke |
| `skill_heal` | 150–250 ms | Heal |
| `skill_holy` | 200–300 ms | Sacred (cleric) |
| `skill_poison` | 150–250 ms | Poison apply |
| `skill_war_cry` | 250–400 ms | War Cry fanfare |
| `buff_apply` | 100–150 ms | Buff up |
| `dodge` | 80–120 ms | Evade |
| `reflect` | 150–220 ms | Aegis reflect |
| `lifesteal` | 120–180 ms | Drain + heal |

### Combat — enemy / DOT

| id | Duration | Description |
|----|----------|-------------|
| `enemy_hit` | 100–180 ms | Player takes damage |
| `poison_tick` | 60–100 ms | Poison DOT |
| `freeze_tick` | 60–100 ms | Frozen tick |
| `afterburn` | 120–200 ms | Afterburn chip on spawn |

### Outcomes

| id | Duration | Description |
|----|----------|-------------|
| `coin_pickup` | 80–150 ms | +coins |
| `streak` | 150–250 ms | Streak ≥ 3 |
| `victory` | 400–800 ms | Normal kill |
| `boss_victory` | 600–1200 ms | Boss kill |
| `death` | 500–900 ms | Player death |
| `floor_transition` | 150–250 ms | Next floor |
| `theme_transition` | 300–500 ms | New theme block |
| `boss_enter` | 400–700 ms | Boss floor banner |
| `boss_warning` | 200–300 ms | Optional pre-boss |

### Optional

| id | Description |
|----|-------------|
| `auto_on` / `auto_off` | AUTO toggle |
| `run_retreat` | Flee to camp |

---

## 5. UltraBox prompt seeds

- **ui_click:** “8-bit NES UI blip, 70ms, C major, dry, dembow-adjacent game.”
- **fight_hit:** “Square-wave sword tap, 120ms, cute RPG, not gory.”
- **victory:** “5-note ascending chip sting, 600ms, celebratory.”
- **boss_enter:** “Low square boss sting, 500ms, baile tension.”
- **death:** “4-note descending fail, 700ms, playful not horror.”

---

## 6. After delivery

1. Copy all `{id}.ogg` into `public/audio/sfx/`.
2. Run `npm run sfx:verify`.
3. Add CREDITS block in `public/CREDITS.txt`.
4. Redeploy; players hard-refresh PWA once.

Game code: `src/audio/sfx.js` + hooks in `BossRush.jsx` (already wired).

---

## 7. Reference docs

- Pixel tone: [sprite-style-guide.md](sprite-style-guide.md) §1–3
- BGM routing: [music-sources.md](music-sources.md)
