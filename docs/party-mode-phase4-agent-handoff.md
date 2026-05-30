# Party Mode — Phase 4 Agent Handoff

**Read this first** for Phase 4 and later. Phases 1–3 are done on `cursor/party-mode-phase3-content-0d7a`. Full design: [party-mode-canonical-handoff.md](./party-mode-canonical-handoff.md).

---

## Quick context

| Item | Value |
| --- | --- |
| Phase 3 branch | `cursor/party-mode-phase3-content-0d7a` |
| Phase 4 branch | `cursor/party-mode-phase4-ui-handoff-0d7a` |
| PR chain | [#1](https://github.com/nikomillender-dotcom/boss-rush/pull/1) data · [#2](https://github.com/nikomillender-dotcom/boss-rush/pull/2) engine · [#3](https://github.com/nikomillender-dotcom/boss-rush/pull/3) content |
| Prod | https://boss-rush-six.vercel.app |
| Design source | `docs/party-mode-canonical-handoff.md` |

---

## Setup

```bash
git fetch origin
git checkout cursor/party-mode-phase4-ui-handoff-0d7a
# or: git checkout cursor/party-mode-phase3-content-0d7a && git pull
npm install
npm run dev
```

**Verify before changing combat numbers:**

```bash
node tools/party-skill-balance-test.mjs
node tools/party-combat-smoke-test.mjs
node tools/skill-cooldown-test.mjs
node tools/auto-control-test.mjs
npm run build
```

---

## Done (do not redo)

| Phase | Delivered |
| --- | --- |
| **1** | `partySkillUnlocks`, `PARTY_SKILLS_V1`, `party-skill-balance-test.mjs`, save fields |
| **2** | Title Solo/Party, `party-select`, speed turn order, minimal battle, retreat, post-boss heal |
| **3** | `partyCombat.js`, `partyEnemyAI.js`, `partyShop.js`, camp shop, equipment/potency, 4×4 select |
| **4 (UI slice)** | Phase 4 handoff doc, **active-cat command dock** (no 3-letter skill buttons) |

---

## Immediate priority (Phase 4 backlog)

Work after the UI slice lands on `cursor/party-mode-phase4-ui-handoff-0d7a`:

1. **Doggod @ floor 500** — encounter + music (`doggod.ogg`)
2. **Freeplay 2000+** — scaling / tier rules per canonical doc
3. **Boss passive infra** — spreadsheet-driven passives on boss floors
4. **Combo party kits** — unlock 4×4 combo classes in select
5. **Passives in combat** — e.g. Staff of Life 20% heal after boss
6. **i18n** — Spanish and remaining party strings

---

## Party flow

```
title → party-select → battle → party-shop → battle → …
```

- Run coins accumulate during battle; on floor clear → `partyWallet` deposit at shop
- Retreat: lose half run coins, return to `party-select`
- Skill unlocks: `applyFloorUnlocks` on new best floor (persisted)

---

## File map

| Area | Path |
| --- | --- |
| Engine hook | `BossRush.jsx` — `useGameEngine` party block (~3364–3770) |
| Battle UI | `src/party/PartyBattleScreen.jsx` |
| Command dock | `src/party/PartyCommandDock.jsx` |
| Combat pure | `src/party/partyCombat.js` |
| Enemy AI | `src/party/partyEnemyAI.js` |
| Shop | `src/party/partyShop.js`, `PartyShopScreen.jsx` |
| Select | `PartySelectScreen.jsx` |
| Turn order | `src/combat/turnSystem.js` |
| Skills data | `src/content/skillDefinitions.js` |
| Stats | `src/party/partyLeveling.js`, `classDefinitions.js` |

---

## Engine contracts

- **Do not** change CDs, unlock floors, or stack caps in `skillDefinitions.js` without updating `tools/party-skill-balance-test.mjs`.
- Solo mode: gate with `gameMode !== "party"`.
- Party skills: `getPartySkill(classKey, id)`, `executePartySkill`, `executePartyFight`, `executePartyDefend`.

### Key hooks (BossRush.jsx)

| Hook | Role |
| --- | --- |
| `startPartyRun` | Init members, floor 1, first enemy |
| `partyFight` / `partyDefend` | Basic commands for active cat |
| `partyUseSkill` | Sets `partyPendingSkillId` if ally target needed |
| `partyPickAlly` / `partyCancelTarget` | Ally targeting flow |
| `partyResolveSkill` | Calls `executePartySkill` |
| `partyReadySkillsForActive` | Ready skills only (legacy name) |
| `partyAllSkillsForActive` | All unlocked skills + `cooldownLeft` for dock |
| `continuePartyFromShop` | Next floor after camp |
| `handlePartyVictory` | Floor clear → shop |

---

## Battle UX (Phase 4)

- **Deprecated:** 3-letter skill boxes (`FIR`, `WAR`, …).
- **Current:** Active-cat **command dock** — Fight / Defend / Skills toggle; skills panel shows **icon + full name + CD**; gold border on active cat; ally-target banner uses skill name (e.g. Restore).
- Distinct from solo: four cat tiles stay visible; commands bind to **active** cat only; gold chrome vs solo blue skill panel.

---

## Definition of done (Phase 4 UI)

- [ ] `docs/party-mode-phase4-agent-handoff.md` exists (this file)
- [ ] Local handoff points here for Phase 4+
- [ ] Canonical handoff UI line updated (no 3-letter boxes)
- [ ] Party floor 1: Fight / Defend / Skills, not abbreviations
- [ ] Skills list shows e.g. **Fire** with icon, not `FIR`
- [ ] Restore (or other ally skills) shows clear pick-ally banner
- [ ] Solo battle unchanged
- [ ] All verify commands above pass

---

## Open UX note

Canonical spec line ~140 in `party-mode-canonical-handoff.md` should stay aligned with the command dock wording so future agents do not reintroduce abbreviations.
