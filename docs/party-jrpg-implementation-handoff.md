# Party JRPG Mode — Implementation Handoff

> **Superseded by [party-mode-canonical-handoff.md](./party-mode-canonical-handoff.md)** (merged old-laptop export + May 28 session). Use that file for implementation.

**Branch:** `Full-JRPG-Style`  
**Status:** Ready to implement Phase A (data + combat math). No party mode code exists yet (`partyWallet`, `isPartyMode`, etc. are not in the repo).  
**Source docs:** [party-mode-canonical-handoff.md](./party-mode-canonical-handoff.md), [party-mode-handoff.md](./party-mode-handoff.md), [Plan JRPG Mode](/workspace/Plan%20JRPG%20Mode)

---

## Executive summary

Party Mode is a **separate game loop** from Solo Mode:

- 4 unique cats per run (no duplicate classes)
- 50 floors per zone, boss every 5, mini-boss on floor before boss (4, 9, 14, …)
- Floor-based stats (level = floor); **death resets stats to floor 0**
- **Skills are permanently unlocked once earned** (survive death reset)
- Separate `partyWallet`, equipment, records
- Speed-based turn order within party, then enemy
- Stackable buffs/debuffs, species-based enemy AI, bosses with 2 actions, Doggod with 3

Solo Mode must keep working unchanged until party paths are explicitly gated.

---

## Readiness assessment

### Sufficient to start (yes)

| Area | Confidence | Notes |
| --- | --- | --- |
| Mode flow | High | Title → party-select → party-shop → battle |
| Party combat loop | High | `party[]`, `activeIndex`, KO, wipe, retreat 50% coins |
| Floor structure | High | 50-floor zones, boss/mini-boss cadence defined |
| Skill kits (4 classes) | High | CDs + unlock floors locked in balance spec |
| Status/stack rules | High | Buff 2, debuff 3, bleed 4% + DEF-down |
| Save separation | High | `partyWallet`, `partyEquipment`, `partyRecords` |
| UI layout | Medium-high | Wireframes in plan; implement incrementally |
| Enemy species pools | Medium | Pattern clear; content volume is large but incremental |

### Resolve before or during Phase 1 (open items)

| # | Topic | Recommendation | Owner decision |
| --- | --- | --- | --- |
| 1 | **Speed stats** | Use user top-note: Rogue **10**, Mage **7**, Warrior **6**, Cleric **4**. Ignore older plan table (Mage 8 / Cleric 7). | Confirm once |
| 2 | **Shadow Mark** | Locked v1: **Rogue skills only** deal 2x vs Marked. Party-wide amp is optional later. | Confirm if party amp wanted |
| 3 | **Mage/Cleric passive unlock floors** | Default: **101 / 150 / 200 / 250** OR ship v1 without Mage/Cleric passives | Pick one |
| 4 | **Per-boss enemy passives** | User was considering (~50 bosses). **Defer to Phase 2**; use **theme passives** first (Hell burn on hit, etc.) | Confirm defer OK |
| 5 | **Bleed rider** | **DEF-down** on apply (not ATK-down) | Locked |
| 6 | **Cleric skill unlock floors** | Not in original notes; balance spec inferred 1/4/9/19/49/99/199/250 | Confirm table |
| 7 | **Rogue at floor 1** | Pickpocket + Shiv both unlock 1 | OK for economy identity |

**Verdict:** Information is **sufficient to begin**. Open items are narrow; none block scaffolding data files, save fields, or a vertical slice (one zone, 4 base classes, trash + boss).

---

## Confirmed design decisions (from Plan JRPG Mode)

| Topic | Decision |
| --- | --- |
| Party duplicates | No |
| Base classes in party mode | All 4 unlocked at start |
| Combo classes | Unlocked via solo (both parents floor 100) |
| Post-boss heal | KO → 1 HP; alive → full HP |
| Retreat | Lose **50%** of run coins |
| Rows/formation | None; shared damage |
| Progression | Floor = level; wipe resets floor progress |
| Wallets | `wallet` (solo) vs `partyWallet` (party) |
| Debuffs | Stackable |
| Enemy actions | `actionsPerTurn`: trash 1, boss 2, Doggod 3 |
| Freeplay | Floor 2000+: trash can access boss-tier ability pool |

### Top-of-file user notes (must not lose)

1. Skills = **perma unlockables** across floor-0 resets  
2. Speed tiers: Rogue 10, Mage 7, Warrior 6, Cleric 4  
3. Boss-specific passives: TBD (see open item #4)  
4. Buff max **2** stacks, debuff max **3**; bleed **4%/turn** + stat rider  
5–7. UI layout approvals; differential heal; separate mode confirmed  

---

## Locked v1 skill tables (implementation source of truth)

Cooldowns and unlock levels below override any conflicting prose in the long plan.

### Warrior

| Skill | CD | Unlock |
| --- | ---: | ---: |
| Power Strike | 2 | 1 |
| War Cry | 5 | 4 |
| Shield Party | 9 | 9 |
| Rampart | 6 | 21 |
| Berserk | 8 | 49 |
| Swordplay | 6 | 99 |
| Regroup | 12 | 200 |
| Shieldstrike | 1 | 250 |

| Passive | Unlock |
| --- | ---: |
| Dog Hunter | 101 |
| Training | 200 |
| Tough Skin | 250 |
| Master Warrior | Post-Doggod |

### Mage

| Skill | CD | Unlock |
| --- | ---: | ---: |
| Fire | 1 | 1 |
| Ice | 3 | 4 |
| Mend | 2 | 9 |
| Thunder | 5 | 19 |
| Wind | 4 | 49 |
| Light | 6 | 99 |
| Dark | 8 | 199 |
| Forbidden Magic | 14 | Post-Doggod |

Passives (Tome of Fire/Ice/Flight, Providence): unlock floors **TBD** — see open item #3.

### Cleric

| Skill | CD | Unlock |
| --- | ---: | ---: |
| Nosferatu | 2 | 1 |
| Toxic Prayer | 2 | 1 |
| Cure | 3 | 4 |
| Aegis Shield | 5 | 9 |
| Wound Care | 4 | 19 |
| Mend (party) | 7 | 49 |
| Holy Flame | 2 | 99 |
| Light | 7 | 199 |
| Fallen Angel | 16 | 250 |

Passives (Staff of Life/Healing, Holy Aura, Master Cleric): unlock floors **TBD**.

### Rogue

| Skill | CD | Unlock |
| --- | ---: | ---: |
| Pickpocket | 6 | 1 |
| Shiv | 3 | 1 |
| Crippling Cut | 4 | 4 |
| Venom Tip | 3 | 9 |
| Shadow Mark | 8 | 19 |
| Smoke Bomb | 8 | 49 |
| Expose Weakness | 9 | 99 |
| Execution Thread | 10 | 199 |
| Death Spiral | 12 | 250 |

| Passive | Unlock |
| --- | ---: |
| Mug | 200 |
| Speedster | 250 |
| Master Rogue | Post-Doggod |

**Rogue pacing:** Base CDs stay high; **Speedster** at 250 is the intentional power spike. **Master Rogue** = 1.4x winnings, no fail.

### Skill metadata tags

- `ignoreCooldownReduction`: Shield Party, Forbidden Magic, Fallen Angel  
- Forbidden Magic: not affected by Wind  
- New types to implement: `party_heal`, `party_buff`, `mark`, `economy`, `finisher`  

---

## Status and resistance contract

### Stacks

- Buffs: max **2**  
- Debuffs: max **3**  
- Bleed: **4%** max HP/stack/turn + **1 DEF-down** on apply  
- Burn: **3%**/stack/turn  
- Poison: **5%**/stack/turn  
- ATK/DEF up/down: **±20%** per stack  
- Floor: stats not below **40%** of base from debuffs alone  

### Berserk

- Only basic attack, **2.5x** damage, 3 turns, does not stack  
- Apply rates: 100% normal / 50% mini-boss / 25% boss; **Doggod immune**  

### Boss resistance

| Tier | CC | DOT | Stat debuffs |
| --- | --- | --- | --- |
| Mini-boss | 50% | 100% | 100% |
| Boss | 25% | 70% | 80% |
| Doggod | Berserk immune | 50% | 70% |

### Debuff role split

- **Rogue:** primary debuffer (mark, finisher scaling, consume)  
- **Mage:** burn/freeze utility  
- **Cleric:** poison + cleanse/heal  
- **Warrior:** berserk, DEF break on Shieldstrike, party buffs  

---

## Architecture map

### Current repo (relevant)

| Path | Role |
| --- | --- |
| [BossRush.jsx](/workspace/BossRush.jsx) (~5300 lines) | Solo orchestrator: engine, UI, save, combat |
| [src/battle/scaling.js](/workspace/src/battle/scaling.js) | Solo scaling; add `PARTY_MODE_FLOOR_CONFIG` here |
| [src/content/enemyThemes.js](/workspace/src/content/enemyThemes.js) | Themes, enemy catalog |
| [src/battle/ff1TurnResolver.js](/workspace/src/battle/ff1TurnResolver.js) | Existing turn resolver (reference only) |
| [tools/auto-control-test.mjs](/workspace/tools/auto-control-test.mjs) | Combat regression pattern |

### Target modules (create)

```
src/content/skillDefinitions.js    # PARTY_SKILLS_V1
src/content/classDefinitions.js      # growth, speed, passive metadata
src/content/enemySpecies.js          # 6-ability pools per species
src/combat/statusEffects.js          # stacks, resistance, tick order
src/combat/enemyAI.js              # targeting, tier ability access
src/combat/turnSystem.js             # speed order, slow, actionsPerTurn
src/party/partyLeveling.js           # getStatsAtLevel(floor)
src/party/partyState.js              # party[] helpers, KO, heal after boss
src/party/PartySelectScreen.jsx
src/party/PartyShopScreen.jsx
src/party/PartyBattleScene.jsx
```

Keep **solo** in `BossRush.jsx` until extraction is safe; gate party with `gameMode === "party"`.

---

## Save schema additions

```javascript
{
  // existing solo fields unchanged...

  partyWallet: 0,
  partySkillUnlocks: {
    warrior: ["power_strike", ...],  // permanent once earned
    mage: [],
    rogue: [],
    cleric: [],
  },
  partyEquipment: {
    warrior: { weaponTier, armorTier, skillPotency: {} },
    // per class
  },
  partyRecords: {
    bestFloor: 0,
    bestComp: null,
    totalRuns: 0,
    highestBossDefeated: null,
    doggodDefeated: false,
  },
  lastPartyComp: ["warrior", "mage", "rogue", "cleric"],
  partyUnlocks: {},  // future classes
}
```

**Unlock rule:** On reaching unlock floor (or boss milestone), append skill id to `partySkillUnlocks[classKey]`. Wipe does **not** remove entries.

---

## Implementation phases (recommended order)

### Phase 1 — Data + math (no UI)

1. `skillDefinitions.js`, `classDefinitions.js`, `statusEffects.js`  
2. `PARTY_MODE_FLOOR_CONFIG` + `getEnemyTierForFloor` in scaling  
3. Save migration for party fields  
4. `tools/party-skill-balance-test.mjs`  

### Phase 2 — Engine vertical slice

1. `gameMode` on title screen  
2. Minimal party-select (4 base classes only)  
3. `usePartyEngine` or branch in `useGameEngine`: `party`, `activeIndex`  
4. Speed turn order + one enemy + trash/boss tiers  
5. Post-boss heal + retreat 50%  

### Phase 3 — Content + UI polish

1. Party battle layout (enemy top, log middle, party bottom)  
2. Species ability pools + theme passives  
3. Party shop (weapons, armor, potency, 0.4 price mult)  
4. 4x4 party grid + combos grayed  
5. i18n, responsive iPhone tests  

### Phase 4 — Late systems

1. Doggod kit (3 actions, resistances)  
2. Freeplay 2000+ escalation  
3. Per-boss passives (if approved)  
4. Mage/Cleric passives when unlock floors decided  

---

## Doggod (party floor 500 / solo 1000)

- `actionsPerTurn: 3`  
- Passives: regen 2%, 25% damage reduction, 50% DOT potency, berserk immune  
- Capstone skills: Forbidden Magic (Mage), Master Warrior/Rogue, etc. gated post-Doggod  

---

## Testing checklist

```bash
node tools/auto-control-test.mjs          # solo must stay green
node tools/party-skill-balance-test.mjs   # add in Phase 1
npm run build
```

Manual: iPhone 14–16 Pro Max widths; PWA cache (`AGENTS.md`); build stamp on title.

---

## Risks (from plan + code reality)

| Risk | Mitigation |
| --- | --- |
| BossRush.jsx size | Extract party to `src/party/` early; do not grow monolith |
| Solo regression | `gameMode` gate; run existing tools every commit |
| Speedster + Wind CD loops | `ignoreCooldownReduction` + min 1 CD floor |
| Marked/finisher overtuning | Boss finisher cap +1.0x unique debuff bonus |
| Save migration | Version field + defaults for missing party keys |

---

## What to review with the user (5 minutes)

1. Shadow Mark: Rogue-only 2x vs party amp?  
2. Mage/Cleric passive unlock floors or defer passives?  
3. Per-boss passives: defer to Phase 4?  
4. Cleric inferred unlock table OK?  

If all “yes / use recommendations,” start **Phase 1** immediately.

---

## Related commands

```bash
npm install
npm run build
node tools/skill-cooldown-test.mjs
node tools/war-cry-test.mjs
```

**Production:** https://boss-rush-six.vercel.app — deploy per [AGENTS.md](/workspace/AGENTS.md).

---

*Handoff generated for agent continuity after machine switch. Update this file when open items are resolved.*
