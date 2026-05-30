# Party Mode — Canonical Implementation Handoff

**Branch:** `Full-JRPG-Style`  
**Status:** Ready to implement  
**Sources merged:**

1. Old-laptop export ([party-mode-handoff.md](./party-mode-handoff.md) + owner paste)
2. [Plan JRPG Mode](../Plan%20JRPG%20Mode)
3. May 28, 2026 planning session (Rogue kit, skill CDs, balance rules)

**Rule:** If this doc conflicts with `Plan JRPG Mode` prose, **this doc wins**. If this doc conflicts with the old export on Rogue or skill CDs, **this doc wins** (session + owner confirmation).

---

## Readiness verdict

| Question | Answer |
| --- | --- |
| Enough to start a thorough Party Mode? | **Yes** |
| Enough to ship full v1 in one pass? | **No** — enemy content (~80 species pools, ~50 boss passives) is incremental |
| Safe to start Phase 1 today? | **Yes** — data, save, turn math, vertical slice |
| Blockers before Phase 1? | **None critical** — 5 owner confirmations below (can default) |

---

## Why we are building this

Solo Boss Rush stays the incremental/AFK-friendly mode. Party Mode is the **hardcore JRPG mode**: 4 cats, speed-based turns, floor leveling, permanent skill unlocks, equipment-focused camp, separate grind. Inspired by FF5 Ancient Cave but keeping Boss Rush's dog themes, camp loop, and Vercel PWA shell.

---

## Resolved decisions (do not re-debate)

| Decision | Final answer |
| --- | --- |
| Party size | 4 unique cats, no duplicates |
| Base classes | All 4 unlocked in party mode from start |
| Combo classes | Solo unlock only (both parents floor 100); **v1 ship base 4 only**, combos grayed |
| Wallets / progression | Fully separate (`partyWallet`, `partyEquipment`, `partyRecords`) |
| Leveling | Floor = level; death resets level to 0 |
| Skills | **Permanently unlocked** once first reached; never lost on wipe |
| Speed (party) | Rogue **10**, Mage **7**, Warrior **6**, Cleric **4** (NOT solo Mage 8 / Cleric 7) |
| Turn order | Speed sort → all alive cats act → enemy → slowed cats |
| Boss actions | Trash/mini 1; boss/capstone 2; Doggod **3** |
| Floors | 50/zone, boss every 5, mini-boss on 4/9/14/19/24/29/34/39/44/49 |
| Post-boss heal | KO → **1 HP**; alive → **100%** (Staff of Life: **20%** instead of 1 HP — pending confirm) |
| Retreat | Lose **50%** of **run** coins; reset to level 0 |
| Stacks | Buff max **2**, debuff max **3** |
| Bleed | **4%** max HP/stack/turn + **DEF-down** on apply |
| Shop | Weapons + **armor (new)** + skill potency; **0.4×** prices; no stat boosts |
| Targeting | Enemy auto-target; player picks ally for single-target heals/buffs |
| Solo mode | **Untouched** on this branch |
| Per-boss passives | **Yes** long-term; v1 = **infra + Doggod only**; owner spreadsheet TBD |
| Code extraction | Incremental from `BossRush.jsx` into `src/party/`, `src/combat/`, `src/content/` |

---

## Rejected alternatives (do not re-propose)

Shared wallet/progression, permanent stat shop upgrades, 100-floor party zones, front/back rows, left-to-right turns, player picks enemy target, animated sprites, skills reset on death, party Mage SPD 8 / Cleric SPD 7, 50% shop discount, post-boss 50% HP revival, round-robin ignoring speed.

---

## Contradictions resolved

| Issue | Wrong | Correct |
| --- | --- | --- |
| Party Mage/Cleric speed | 8 / 7 | **7 / 4** |
| Turn system name | Round-robin | **Speed-based** |
| Species abilities | 2 per species | **6 slots**, tier gates access |
| Post-boss heal | 50% revival | **KO=1HP, alive=full** |
| Price cut | 50% | **60% off (×0.4)** |
| Skills on death | Reset | **Permanent unlocks** |
| Old export: Rogue | Not designed | **Designed** (session) |
| Tier string | `"Boss"` | `"boss"` lowercase |

### Needs owner confirm (one pick each)

| Item | Option A | Option B |
| --- | --- | --- |
| **War Cry unlock** | Floor **1** (old export) | Floor **4** (session; "party 4" in notes = 4 turns duration) |
| **Staff of Life** | Replaces 1 HP → **20%** revive | Stacks on top of 1 HP |
| **Mend/Light names** | Mage: Restore / Arcane Light; Cleric: Prayer of Mending / Holy Light | Owner picks |
| **Shadow Mark** | Rogue skills **2×** vs Marked only (session) | Party-wide amp on Marked |

**Recommended defaults:** War Cry floor **1**, Staff of Life **replaces**, rename collision as suggested, Shadow Mark **Rogue-only 2×**.

---

## Mode flow

```
title → Solo: select → shop → battle     (unchanged)
title → Party: party-select → party-shop → battle
```

State: `isPartyMode` / `gameMode: "solo" | "party"` set at title, persists run.

---

## Floor system (party)

- 10 zones × 50 floors = 500 (+ freeplay)
- Zone themes: human → monster → hell → space → alien → mirror → heaven_low → olympus → pantheon → angelic (Doggod @ 500)
- Scaling: `effectiveRound = partyFloor * 2` for enemy stats
- Freeplay 2000+: trash tier → boss ability access

```javascript
function getEnemyTierForFloor(floor) {
  const floorInZone = ((floor - 1) % 50) + 1;
  if (floorInZone % 5 === 0) return "boss";
  if (floorInZone % 5 === 4) return "miniBoss";
  return "trash";
}
```

---

## Floor-based leveling

All cats share party floor as level. Speed never grows.

| Class | Base HP | HP/Lv | Base ATK | ATK/Lv | Base DEF | DEF/Lv | SPD |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Warrior | 12 | +2.0 | 3 | +1.0 | 2 | +0.5 | 6 |
| Mage | 6 | +1.0 | 4 | +1.5 | 1 | +0.25 | 7 |
| Rogue | 7 | +1.0 | 3 | +1.25 | 0 | +0.25 | 10 |
| Cleric | 10 | +1.5 | 2 | +0.5 | 2 | +0.5 | 4 |

**Persists after wipe:** skill unlocks, equipment, potency, partyWallet, records  
**Resets:** level/stats, current floor, run coins (retreat: half run coins lost)

---

## Skill system rules

- Unlock on **first-ever** reach of floor milestone → append to `partySkillUnlocks[classKey]`
- Potency purchased in camp (0.4× prices), levels 0–5 (1.0 → 1.75×)
- `ignoreCooldownReduction`: Shield Party, Forbidden Magic, Fallen Angel; Forbidden immune to Wind
- Battle UX: active-cat command dock; icon + full skill name; CD visible; ally picker for single-target heals/buffs
- **Debuff ownership:** Rogue = primary; others = utility only

---

## Locked skill tables (v1 implementation)

### Warrior

| Skill | CD | Unlock | Effect |
| --- | ---: | ---: | --- |
| Power Strike | 2 | 1 | 2.25× ATK damage |
| War Cry | 4 or 5 | **1 or 4** ⚠ | +20% ATK party buff, 4 turns |
| Shield Party | 9 | 9 | Party block next hit; +2 CD all Warrior skills |
| Rampart | 6 | 21 | +20% DEF party, 4 turns |
| Berserk | 8 | 49 | Berserk 3 turns; 100/50/25% vs normal/mini/boss |
| Swordplay | 6 | 99 | +50% ATK 1 turn; 2× 0.75× hits |
| Regroup | 12 | 200 | −1 CD all party skills |
| Shieldstrike | 1 | 250 | 1.5× DEF-scaling; self −33% DEF 2 turns |

| Passive | Unlock | Effect |
| --- | ---: | --- |
| Dog Hunter | 101 | +25% vs human zone dogs |
| Training | 200 | +0.5% crit per boss defeated; crit 1.75× |
| Tough Skin | 250 | +10% DEF |
| Master Warrior | Post-Doggod | +1% all stats per boss defeated |

### Mage

| Skill | CD | Unlock | Effect |
| --- | ---: | ---: | --- |
| Fire | 1 | 1 | 1.1× + burn |
| Ice | 3 | 4 | 0.85× + freeze 1–3 turns (boss max 1) |
| Mend → **Restore** ⚠ | 2 | 9 | Heal one ally 20% max HP |
| Thunder | 5 | 19 | 2.25×; +1 CD all skills |
| Wind | 4 | 49 | 0.6×; −1 CD all ally skills |
| Light → **Arcane Light** ⚠ | 6 | 99 | 3×; +1 CD Cleric ally skills |
| Dark | 8 | 199 | 4×; +1 CD Rogue ally skills |
| Forbidden Magic | 14 | Post-Doggod | 1×; poison+bleed+berserk(2t)+burn |

| Passive | Unlock (proposed) | Effect |
| --- | ---: | --- |
| Tome of Fire | 101 | Burn DOT doubled on target |
| Tome of Ice | 150 | Ice 2× damage; freeze fixed 1 turn (optional toggle TBD) |
| Tome of Flight | 200 | Wind 0 damage; −2 CD all allies |
| Providence | 250 | +20% skill power; +1 base CD all Mage skills |

### Cleric

| Skill | CD | Unlock | Effect |
| --- | ---: | ---: | --- |
| Nosferatu | 2 | 1 | 1×; heal self 50% dealt |
| Toxic Prayer | 2 | 1 | Poison stack |
| Cure | 3 | 4 | Cleanse one ally |
| Aegis Shield | 5 | 9 | Reflect 50% on one ally, 1 turn |
| Wound Care | 4 | 19 | Heal one ally 50% |
| Mend → **Prayer of Mending** ⚠ | 7 | 49 | Heal all allies 33% |
| Holy Flame | 2 | 99 | 1×; 2× vs monster/hell dogs |
| Light → **Holy Light** ⚠ | 7 | 199 | 3.5×; CD manip; 2× vs monster/hell |
| Fallen Angel | 16 | 250 | Self 99% HP; full party heal+cleanse+reset CDs |

| Passive | Unlock (proposed) | Effect |
| --- | ---: | --- |
| Staff of Healing | 101 | Heals 1.25× |
| Holy Aura | 150 | Hell: party 1.1× dealt; Pantheon/Heaven: 0.9× taken |
| Staff of Life | 200 | Post-boss KO revive **20%** HP (not 1) |
| Master Cleric | Post-Doggod | Overheal to 110% max HP |

### Rogue (session — supersedes old export)

| Skill | CD | Unlock | Effect |
| --- | ---: | ---: | --- |
| Pickpocket | 6 | 1 | Once/battle; 1.2× winnings; 20% fail |
| Shiv | 3 | 1 | 0.9× + 1 bleed |
| Crippling Cut | 4 | 4 | 0.6× + 25% DEF down |
| Venom Tip | 3 | 9 | 1.0× + 1 poison |
| Shadow Mark | 8 | 19 | 0.8×; Marked 3 turns; Rogue hits **2×** vs Marked |
| Smoke Bomb | 8 | 49 | Blind 2 enemy actions |
| Expose Weakness | 9 | 99 | 0.5×; 50% DEF down; +ATK down if any status on target |
| Execution Thread | 10 | 199 | 1.8×; +0.35× per unique debuff (cap +1.4×; boss +1.0×) |
| Death Spiral | 12 | 250 | 0.75× per consumed stack (cap 5×); consume enemy statuses; +1 bleed |

| Passive | Unlock | Effect |
| --- | ---: | --- |
| Mug | 200 | Pickpocket also 0.8× + random poison or bleed |
| Speedster | 250 | −1 CD all Rogue skills (intentional late spike) |
| Master Rogue | Post-Doggod | Pickpocket 1.4× winnings, 0% fail |

---

## Status / resistance

**Debuffs (party, max 3):** atk_down/def_down −25%/stack/4t; slow (act after enemy); poison 5%; burn 3%; bleed 4%+def_down; berserk (basic only 2.5×, no stack)

**Buffs (enemy, max 2):** atk_up/def_up +25%; regen 5%; haste

**Boss resistance:** mini CC 50%; boss CC 25%, DOT 70%, stat debuffs 80%; Doggod berserk immune, DOT 50%, stat debuffs 70%

---

## Enemy system (v1 pragmatic)

- **6 ability slots** per species: basic, single, aoe, buff, debuff, lifesteal
- **Tier access:** trash = basic+single; mini = +aoe+(buff|debuff); boss = all 6
- **v1 content shortcut:** generic pools per **theme** for trash; unique pools for capstones + Doggod
- **Theme passives v1:** Hell = infernal burn on hit only; others null
- **Boss passives v1:** infrastructure only; populate Doggod; spreadsheet later

---

## Save schema (additions)

```javascript
partyWallet: 0,
partySkillUnlocks: { warrior: [], mage: [], rogue: [], cleric: [] },
partyEquipment: { /* weaponTier, armorTier, skillPotency per class */ },
partyRecords: { bestFloor, bestComp, totalRuns, highestBossDefeated, doggodDefeated },
lastPartyComp: ["warrior", "mage", "rogue", "cleric"],
partyUnlocks: {},
```

---

## UI (summary)

- **Party select:** 4×4 grid; base bright; combos grayed; 6 `??` slots
- **Camp:** tab ribbon per cat; weapons + armor + potency
- **Battle:** enemy top + status; log middle; party bottom with HP numbers; compact skills; yellow border on active cat

Responsive: test iPhone 14 and 16 Pro Max.

---

## Doggod @ party floor 500

`actionsPerTurn: 3`; regen 2%; 25% damage reduction; 50% DOT potency; berserk immune; Judgment execute <25% HP; full ability pool.

---

## V1 scope

**Ship:** mode toggle, party select (base 4), leveling, speed turns, party combat+KO, battle UI v1, 50-floor structure, separate save/wallet, equipment shop, permanent unlocks, all **four** class skill lists above, basic enemy abilities, stackable status, Doggod passives infra

**Defer:** combo party kits, full 80 species pools, 50 boss passives spreadsheet, 8 theme passives, freeplay 2000+, party auto-battle, full BossRush extraction

---

## Implementation phase order

1. Save + `partySkillUnlocks` migration — **DONE (Phase 1)**
2. `skillDefinitions.js`, `classDefinitions.js`, `statusEffects.js`, `partyLeveling.js`, scaling helpers — **DONE (Phase 1)**
3. Title mode toggle + `isPartyMode`  
4. Floor leveling + unlock tracking (data layer DONE; wire into engine)
5. Speed turn system + party state + KO/retreat/post-boss heal  
6. Battle UI vertical slice  
7. Enemy tiers + generic theme abilities  
8. Party select + camp  
9. Wire all class skills + balance script — **balance script DONE**
10. Polish i18n, responsive, Doggod  

### Phase 1 status (data + contract layer)

Implemented on branch `cursor/party-mode-phase1-32ac`:

| File | Contents |
| --- | --- |
| `src/content/classDefinitions.js` | base stats, party speed tiers, growth rates, stat-letter rankings |
| `src/content/skillDefinitions.js` | `PARTY_SKILLS_V1`, `PARTY_PASSIVES_V1`, unlock/CD selectors |
| `src/combat/statusEffects.js` | stack caps, DOT, stat floor, tier resistance, CC rolls, tick order |
| `src/party/partyLeveling.js` | `getStatsAtLevel`, perma unlock merge, member builder |
| `src/battle/scaling.js` | `PARTY_MODE_FLOOR_CONFIG`, tier mult, `getEnemyTierForFloor`, party scaling, freeplay |
| `BossRush.jsx` | party save defaults + load migration (`partyWallet`, `partySkillUnlocks`, `partyEquipment`, `partyRecords`) |
| `tools/party-skill-balance-test.mjs` | 60+ deterministic contract assertions |

Doc inconsistency resolved during implementation: the export's letter card listed
**Cleric ATK = D**, but its own threshold table maps ATK 2 → **C**. The threshold
table is the implementable rule; code returns **C**.

Solo mode untouched; `auto-control`, `skill-cooldown`, `war-cry`, `save-meta` tests
and `npm run build` all pass.

---

## Verification

```bash
node tools/auto-control-test.mjs    # solo regression
node tools/party-skill-balance-test.mjs  # add in Phase 1
npm run build
```

---

## Owner confirm list (5 min)

1. War Cry unlock floor 1 vs 4  
2. Staff of Life replaces 1 HP with 20%  
3. Skill rename pairs (Restore / Prayer of Mending / Arcane Light / Holy Light)  
4. Shadow Mark Rogue-only 2×  
5. Mage/Cleric passive floors 101/150/200/250 OK  

**Default all recommended → execute Phase 1.**

---

*Merged May 28, 2026. Supersedes scattered plan prose and old export gaps.*
