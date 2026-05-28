# Party Mode Branch: Complete Handoff Document

> **Canonical merge:** This file is the old-laptop export. For implementation, use **[party-mode-canonical-handoff.md](./party-mode-canonical-handoff.md)** which merges this document with the May 28 session (Rogue kit, skill CDs, resolved contradictions).

**Purpose:** Single source of truth from 48h planning. Next agent builds without re-debating resolved questions.

---

## Document map

| File | Role |
| --- | --- |
| [party-mode-handoff.md](./party-mode-handoff.md) | Original export (philosophy, rejected alts, full spec) |
| [party-mode-canonical-handoff.md](./party-mode-canonical-handoff.md) | **Implement from this** — merged + session updates |
| [Plan JRPG Mode](../Plan%20JRPG%20Mode) | Long-form plan with UI mockups and phases |

---

## 1. Project Context

Boss Rush: React PWA, `BossRush.jsx` (~5200 lines), Vercel prod https://boss-rush-six.vercel.app

Party Mode = **separate mode**, not solo modification. FF5 Ancient Cave inspiration: 4-cat party, roguelike floors, camp equipment loop.

**Key files:** `BossRush.jsx`, `src/content/enemyThemes.js`, `src/battle/scaling.js`, `src/battle/ff1TurnResolver.js`

---

## 2. Design Philosophy (Do Not Lose)

- **Strategic, not AFK** — "JRPG nightmare blunt rotation"
- **Death stings, repeat climbs feel fresh** — floor RNG, perma skill unlocks, comp variety
- **Late passives = new play patterns**, not just bigger numbers (Training, Dog Hunter, Speedster)
- **Bosses are events** — 2 actions, smart AI; Doggod is the wall
- **Grindy is intentional** — separate from solo progression by design

---

## 3. Resolved Decisions (Do Not Re-Debate)

See [party-mode-canonical-handoff.md](./party-mode-canonical-handoff.md) § Resolved Decisions for full table.

Highlights: 4 unique cats, separate wallets, floor=level, **perma skill unlocks**, speed order (Rogue 10 / Mage 7 / Warrior 6 / Cleric 4), 50-floor zones, boss every 5, mini-boss on 4/9/14…, KO=1HP / alive=full after boss, retreat 50% run coins, buff max 2 / debuff max 3, bleed 4% + DEF-down, shop = equipment + potency only (0.4 price mult), **per-boss passives yes** (infra v1, spreadsheet TBD).

---

## 4. Rejected Alternatives

Shared wallet, shared progression, permanent stat shop upgrades, 100-floor party zones, formation rows, left-to-right turns, player picks enemy targets, animated sprites, skills reset on death, Mage 8/Cleric 7 party speed, 50% shop discount, post-boss 50% HP revival.

---

## 5–30. Full Specification Sections

The complete sections (Game Mode Structure, Floor System, Leveling, Skills, Turn System, Enemies, UI, Save, Doggod, Freeplay, Combos, V1 Scope, Contradictions, Phase Order, Codebase Reference) match the owner export pasted into chat on May 28, 2026.

**Session merge updates** (supersede parts of this export):

1. **Rogue party skills** — fully designed in May 28 session (was "NOT YET DESIGNED" in export)
2. **Warrior/Mage/Cleric CDs and unlock floors** — filled in session (export had `?` for many CDs)
3. **V1 scope** — Rogue ships in v1 with session kit; combo classes stay grayed until designed
4. **Debuff ownership** — Rogue primary debuffer; other classes keep utility debuffs

---

## Open Items (owner input)

| Item | Status |
| --- | --- |
| Rogue skill list | **Closed** — see canonical handoff |
| Mage passive unlock floors | Open — suggest 101/150/200/250 |
| Cleric passive unlock floors | Open — suggest 101/150/200/250 |
| Mend/Light name collision | Open — rename pairs |
| Tome of Ice optional toggle | Open — propose UX |
| Staff of Life vs 1 HP revive | Open — recommend **replace** (20% not 1 HP) |
| Per-boss passive spreadsheet | Open — infra v1, content later |
| Theme passives (8 zones) | Open — Hell only for v1 |
| **War Cry unlock floor** | **Conflict** — export says Lv **1**, session used Lv **4** |

---

*End of indexed handoff. Full narrative sections preserved in owner export; implementation details merged in party-mode-canonical-handoff.md.*
