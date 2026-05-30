# Party Mode — Local Agent Handoff

**Phase 4+ → see [party-mode-phase4-agent-handoff.md](./party-mode-phase4-agent-handoff.md).**

**Read this first** for Phases 1–3 history. Then use [party-mode-canonical-handoff.md](./party-mode-canonical-handoff.md) for full design detail.

---

## Quick context

Boss Rush is a React/Vite PWA. **Solo mode** lives in `BossRush.jsx` (~5300 lines). **Party Mode** is a separate loop: 4 cats, 50 floors/zone, floor-based stats, permanent skill unlocks, separate wallet. Phase 1 landed the **data contract** only. **No party UI or combat engine yet.**

| Item | Value |
| --- | --- |
| Base branch | `Full-JRPG-Style` |
| Work branch | `cursor/party-mode-phase1-32ac` |
| Draft PR | https://github.com/nikomillender-dotcom/boss-rush/pull/1 |
| Prod | https://boss-rush-six.vercel.app |
| Design source of truth | `docs/party-mode-canonical-handoff.md` |
| Owner plan file (optional) | `Plan JRPG Mode` (repo root, may be untracked) |

---

## Setup (local)

```bash
git fetch origin
git checkout cursor/party-mode-phase1-32ac
npm install
npm run dev
```

**Verify before changing code:**

```bash
node tools/party-skill-balance-test.mjs   # must pass (60+ checks)
node tools/skill-cooldown-test.mjs
node tools/war-cry-test.mjs
node tools/save-meta-test.mjs
node tools/auto-control-test.mjs
npm run build
```

Add to `package.json` when convenient:

```json
"party:balance": "node tools/party-skill-balance-test.mjs"
```

---

## What Phase 1 already did (do not redo)

| Done | Location |
| --- | --- |
| Party base stats + speed (Rogue 10, Mage 7, Warrior 6, Cleric 4) | `src/content/classDefinitions.js` |
| All v1 skills + passives (CDs, unlock floors, tags) | `src/content/skillDefinitions.js` |
| Stack caps, DOT, resistance, CC | `src/combat/statusEffects.js` |
| `getStatsAtLevel`, unlock merge | `src/party/partyLeveling.js` |
| 50-floor zones, tier helper, party scaling | `src/battle/scaling.js` |
| Save fields + load migration | `BossRush.jsx` — `createDefaultPartySave`, `mergePartySaveFields` |
| Contract test | `tools/party-skill-balance-test.mjs` |

**Solo mode must stay working.** Gate all party behavior behind `gameMode === "party"` or `isPartyMode`.

---

## What is NOT built yet

- Title screen **Solo / Party** buttons
- Scenes: `party-select`, `party-shop`
- `useGameEngine` party branch (`party[]`, `activeIndex`, speed turn order)
- Party battle UI (enemy top, log middle, 4 cats bottom)
- Skill execution wired to `PARTY_SKILLS_V1`
- Enemy species pools / theme passives (beyond data shapes in docs)
- Doggod encounter wiring
- i18n strings for new UI

---

## Phase 2 — Recommended next slice (vertical slice)

Goal: player can pick Party Mode, pick 4 base classes, start a run, see party stats from floor level, and enter a **minimal** battle loop (even stub enemy AI) without breaking solo.

### Step 1 — Mode flag + title screen

**File:** `BossRush.jsx`

- In `useGameEngine`, add state:
  - `gameMode`: `"solo" | "party" | null` (null on title)
  - or `isPartyMode` boolean set when Party is chosen
- Extend `scene` union: add `"party-select"`, `"party-shop"` (battle can reuse `"battle"` with party flag)
- **`TitleScreen` (~4083):** add buttons after START:
  - Solo Mode → existing `setScene("select")`, `gameMode = "solo"`
  - Party Mode → `setScene("party-select")`, `gameMode = "party"`
- Root render (~5251): branch on `game.scene === "party-select"` etc.

### Step 2 — Minimal party select (base 4 only)

**New file:** `src/party/PartySelectScreen.jsx` (or inline in BossRush first)

- Pick exactly 4 unique keys from `PARTY_CLASS_KEYS`
- Reject duplicates; persist `lastPartyComp` on start
- v1: skip 4x4 combo/mystery grid polish; a simple 4-slot picker is enough for slice
- Use `getStatLetterCard` from `classDefinitions.js` for popup if time

### Step 3 — Initialize party run state

**New file:** `src/party/partyState.js` (helpers)

```javascript
// Pseudocode shape
party: [
  { classKey, hp, maxHp, attack, defense, speed, statuses: {}, skills: [...] },
  // x4
]
floor: 1  // also level
partyRunCoins: 0
activeIndex: 0
```

- Build members with `buildPartyMember(classKey, floor, save.partySkillUnlocks[classKey])`
- On floor advance: `getStatsAtLevel`, reapply maxHp scaling policy (decide: heal to new max vs keep %)
- On wipe: reset floor to 0, keep `partySkillUnlocks` and `partyWallet` / equipment per design

### Step 4 — Wire save on milestones

When party reaches a new **best floor** for the account:

```javascript
import { applyFloorUnlocks } from "./src/party/partyLeveling.js";
save.partySkillUnlocks = applyFloorUnlocks(save.partySkillUnlocks, floor);
save.partyRecords.bestFloor = Math.max(save.partyRecords.bestFloor, floor);
persistSave(save);
```

Call when clearing a floor or on game over if that floor was a new high.

### Step 5 — Speed turn order (combat hook)

**New file:** `src/combat/turnSystem.js`

```javascript
import { PARTY_BASE_STATS } from "../content/classDefinitions.js";

export function sortPartyBySpeed(party, { slowClassKeys = [] } = {}) {
  const alive = party.filter((m) => m.hp > 0);
  const normal = alive.filter((m) => !slowClassKeys.includes(m.classKey));
  const slow = alive.filter((m) => slowClassKeys.includes(m.classKey));
  normal.sort((a, b) => b.speed - a.speed);
  return [...normal, ...slow]; // slow act after enemy in full resolver
}
```

Integrate in `useGameEngine` party branch: after all cats act → `processEnemyTurn` → slowed cats (if any).

### Step 6 — Stub party battle (prove loop)

- Reuse existing enemy build from catalog for floor 1 trash
- Use `getEnemyTierForFloor(floor)` from `scaling.js`
- One command per active cat: Fight / Skills (subset) / Defend / Run
- Run: retreat = lose 50% `partyRunCoins`, return to camp
- Post-boss (floor % 5 === 0): KO → 1 HP, alive → full heal (`Staff of Life` passive → 20% when implemented)

Do **not** implement full species AI in this slice unless time; random trash attack is OK.

---

## Key integration points in BossRush.jsx

| Symbol | Line (approx) | Notes |
| --- | ---: | --- |
| `createDefaultSave` | ~917 | Already spreads `createDefaultPartySave()` |
| `mergePartySaveFields` | ~933 | Merges party fields on load |
| `loadSave` / `persistSave` | ~1052 / ~1158 | Party fields persist automatically if on save object |
| `useGameEngine` | ~1574 | Add party state + scene handlers here |
| `TitleScreen` | ~4083 | Add mode buttons |
| `App` render | ~5251 | Scene switch for party screens |
| `CLASSES` | ~447 | Solo skills only; party uses `PARTY_SKILLS_V1` |

**Imports already added at top of BossRush.jsx:**

```javascript
import { PARTY_CLASS_KEYS } from "./src/content/classDefinitions.js";
import { skillIdsUnlockedByFloor } from "./src/content/skillDefinitions.js";
```

Add as needed:

```javascript
import { PARTY_SKILLS_V1, getPartySkill } from "./src/content/skillDefinitions.js";
import { getStatsAtLevel, buildPartyMember, applyFloorUnlocks } from "./src/party/partyLeveling.js";
import { getEnemyTierForFloor, getEnemyRoundScaleParty } from "./src/battle/scaling.js";
```

---

## Locked rules (do not re-debate)

See canonical handoff § "Resolved decisions" and § "Rejected alternatives". Highlights:

- Separate `partyWallet` (not solo `wallet`)
- Perma skill unlocks; death resets **level/floor**, not unlocks
- No duplicate classes in party
- Speed: 10 / 7 / 6 / 4
- Buff max 2, debuff max 3, bleed 4% + def down
- Retreat: 50% run coins lost
- Combo classes: grayed in v1; solo unlock only
- Solo mode unchanged on this branch

---

## Owner defaults already applied in code

| Topic | Default used |
| --- | --- |
| War Cry unlock | Floor **1** |
| Mend/Light names | Restore, Prayer of Mending, Arcane Light, Holy Light |
| Shadow Mark | Rogue skills **2×** vs Marked only |
| Mage/Cleric passive floors | 101 / 150 / 200 / 250 |
| Staff of Life | `replacesDefaultRevive: true` (20% not 1 HP) |
| Cleric ATK letter | **C** (threshold table; export card said D) |

If owner disagrees, change `skillDefinitions.js` and update `party-skill-balance-test.mjs`.

---

## Open for later (not blocking Phase 2 slice)

- Per-boss passive spreadsheet (~50 bosses) — infra only; Doggod kit in docs
- Theme passives beyond Hell
- Full 6-ability species pools per enemy
- Party camp shop UI (armor, potency 0.4× prices)
- Combo party skill lists
- `package.json` script for balance test

---

## Testing discipline

After every meaningful change:

```bash
node tools/party-skill-balance-test.mjs
node tools/skill-cooldown-test.mjs
npm run build
```

If you change CDs, unlock floors, stacks, or resistance — **update the balance test** in the same PR.

Manual: `npm run dev` → Solo still works end-to-end → Party path reaches battle without console errors.

---

## Suggested branch / PR workflow

```bash
git checkout cursor/party-mode-phase1-32ac
git pull
git checkout -b cursor/party-mode-phase2-engine-32ac
# ... work ...
git push -u origin cursor/party-mode-phase2-engine-32ac
```

Update PR #1 or open a new PR against `Full-JRPG-Style` with:

- What slice works (title → party select → battle stub)
- Test commands run
- Screenshots or short screen recording if UI changed

---

## File tree (party-related)

```
docs/
  party-mode-local-agent-handoff.md   ← this file
  party-mode-canonical-handoff.md     ← full design
  party-mode-handoff.md               ← index to export
src/
  content/
    classDefinitions.js
    skillDefinitions.js
    enemyThemes.js                    ← existing catalog
  combat/
    statusEffects.js
    turnSystem.js                     ← CREATE in Phase 2
  party/
    partyLeveling.js
    partyState.js                     ← CREATE in Phase 2
    PartySelectScreen.jsx             ← CREATE in Phase 2
  battle/
    scaling.js
BossRush.jsx
tools/
  party-skill-balance-test.mjs
```

---

## Definition of done (Phase 2 slice)

- [x] Title shows Solo / Party; solo path unchanged
- [x] Party select picks 4 base classes; saves `lastPartyComp`
- [x] Party run uses `getStatsAtLevel` and `partySkillUnlocks`
- [x] Reaching new floor merges skill unlocks into save
- [x] Battle loop: speed-ordered cat turns, then enemy; KO skip
- [x] `party-skill-balance-test.mjs` still passes; solo tests still pass; `npm run build` passes

---

*Phase 2 vertical slice landed on `cursor/party-mode-phase2-engine-0d7a`.*

---

## Phase 3 — Content + UI polish

Goal: camp loop, wired skills, enemy variety, polished battle/select UI.

### Definition of done (Phase 3)

- [x] Party camp (`party-shop`) after each floor; run coins deposit to `partyWallet`
- [x] Shop: weapon, armor, skill potency at **0.4×** prices
- [x] All party skills executable via compact skill buttons + ally targeting
- [x] Enemy tier actions + Hell burn-on-hit theme passive
- [x] Battle layout polish (HP bar, skill abbr, active cat border)
- [x] Party select **4×4** grid (bases + grayed combos / `??` slots)
- [x] `party-skill-balance-test.mjs` still passes; `party:combat` smoke test added

### New / updated files (Phase 3)

| File | Role |
| --- | --- |
| `src/party/partyCombat.js` | Skill + fight resolver |
| `src/party/partyShop.js` | 0.4× camp prices |
| `src/party/partyEnemyAI.js` | Tier attacks + Hell burn |
| `src/party/partyEquipment.js` | Weapon/armor/potency on stats |
| `src/party/PartyShopScreen.jsx` | Camp UI |
| `tools/party-combat-smoke-test.mjs` | Resolver smoke tests |

### Deferred (Phase 4)

- Doggod 3-action kit, freeplay 2000+, per-boss passive spreadsheet, combo party kits, full i18n pass
