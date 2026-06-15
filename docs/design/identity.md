# Boss Rush — Design Identity (v1)

Source of truth for **what Boss Rush is, what it is not, and how balance patches must behave.** Future patches reference this doc before touching numbers. If a patch wants to add a fifth genre or a mechanic that violates the rules below, the answer is no.

Author: Niko + agent, after first paid sale.
Trigger: first paying player's husband (the second human to ever play) complained that Cleric felt bad, Rogue gold was invisible, and the first 100 floors were too easy. Symptoms were real. Diagnosis: not a balance bug, an identity confusion.

---

## 1. The elevator pitch (one sentence)

> **Boss Rush is an AFK mobile tower climber where your class pick changes how your idle run plays out, and bosses are the gate that forces you to come back and tune your build.**

If a future feature does not serve that sentence, it does not ship.

---

## 2. The four candidate identities (and why we picked one)

The game was unintentionally trying to be all four. Each genre has different balance rules, so tuning for one breaks another. Picking one as the load-bearing pillar lets the others become flavor.

| Candidate | Reference titles | Codebase fit | Verdict |
|---|---|---|---|
| **A. AFK tower climber** | Tap Titans 2, Idle Slayer, NGU Idle | **Highest.** AUTO mode is first-class, save/resume is built, mobile PWA, license-gated meta progression. | **Picked.** |
| B. Active JRPG roguelite | Slay the Spire, Loop Hero | Medium. Skill cooldowns and fire-after-ice combo support active play, but our AUTO polish argues against making manual timing load-bearing. | Reject. |
| C. Pure incremental | Antimatter Dimensions, NGU Idle | Low. Classes already have real mechanical differences we would be throwing away. | Reject. |
| D. Roguelite arena | Hades, Vampire Survivors | Low. Meta saves and permanent license-gated progression already exist. | Reject. |

**Boss Rush is A (AFK tower climber).** Incremental math is the flavor of the numbers. JRPG is the visual skin. Roguelite is the run structure. None of those three are load-bearing.

---

## 3. The four design pillars

Every balance decision must obey these. They are ordered: when two conflict, the higher pillar wins.

### Pillar 1: AFK is load-bearing

- Every class must have a meaningful AUTO playstyle. If a class only works when the player is tapping skills manually, it does not exist for this game.
- AUTO is the default expectation, not a toggle the player must discover.
- Cleric on AUTO must auto-heal at thresholds (current AUTO already does, verify it works for all heal skills).
- Rogue on AUTO must be measurably the highest gold/min class. Right now it is not.
- "Watching your build run" is a feature, not a placeholder.

### Pillar 2: Incremental math, with diminishing returns past a soft cap

- ATK is the primary stat. That is correct and stays.
- BUT ATK upgrade returns must soft-cap somewhere (target: ~floor 100), so sideways stats catch up at high floors.
- Sideways stats (crit, poison, freeze, lifesteal, gold) must **compound**, not add flat. A flat +X% is invisible against the streak coin scaling system.
- The point of a soft cap is not to nerf attack builds; it is to make non-attack builds shine in the late run.

### Pillar 3: Roguelite structural, not arcade

- Death = restart, but meta-progression (coins, upgrades, unlocks) persists. Already shipped, do not regress.
- Class choice matters per-run. Replay incentive comes from "try the rogue path tonight" and getting a measurably different outcome.
- Combo classes (mage_knight, sage, templar, duelist, arcanist, plaguecat) are the prestige reward and must feel like prestige, not duplicates.

### Pillar 4: JRPG is cosmetic only

- Skills, sprites, music, weapon names are flavor. They sell the fantasy.
- Do NOT add combat mechanics that require manual timing to feel good. Manual-timing depth is for the first 10 floors and demo wall, not the long tail.
- The fire-after-ice combo is acceptable because AUTO already executes it correctly. Combos that AUTO cannot execute are not acceptable.

---

## 4. Class identity rules

Pulled from the actual classes in [BossRush.jsx](../../BossRush.jsx) line 447 (`const CLASSES`).

Stats shown are baseline (pre-upgrade) HP/ATK from the source.

### Base classes

#### Warrior — Tabby Knight (12 HP, 3 ATK, 2 DEF)

- **Fantasy:** the durable cat with a sword that just keeps swinging.
- **AFK role:** safest default. Lowest risk of dying, slowest progression. The "I want to leave it running" pick.
- **Current state:** fine. War Cry buff + Shield Wall heal + Power Strike all stack with AUTO. Not the regression class.
- **Direction:** leave alone unless data says otherwise. Use Warrior as the baseline that other classes are measured against.

#### Mage — Whisker Mage (6 HP, 4 ATK, 1 DEF)

- **Fantasy:** glass cannon spellcaster, big numbers on cooldown.
- **AFK role:** spike floors. Best burst per cooldown window, weakest between casts.
- **Current state:** fine. Fire-after-ice combo now grants the 1.10x bonus (v1.0.4 shipped). Mend self-heals on AUTO.
- **Direction:** leave alone. Mage is the active-play darling and AUTO handles it cleanly.

#### Rogue — Shadow Cat (7 HP, 3 ATK, 0 DEF)

- **Fantasy:** greedy opportunist. Coins snowball, kills are fast and risky.
- **AFK role:** **the gold-per-minute class.** This is the role the codebase wants Rogue to play but the math does not deliver.
- **Current failure:** Pickpocket has `stealRange: [5, 25]` — a flat per-cast steal on a 6-turn cooldown. By floor 50 the streak coin system is generating more passive gold than Pickpocket ever can. A user with "enough coins" feels Rogue's gold perk is invisible. Husband's complaint is correct.
- **Direction (no numbers yet):** Pickpocket steals must scale with a **compounding** modifier (multiplier grows per kill within a run, capped). OR introduce a rogue-exclusive "treasure floor" or "lootable enemy" that other classes cannot trigger. OR Pickpocket steal becomes %of-enemy-coin-drop rather than flat. Pick one for v1.0.6; do not stack all three.

#### Cleric — Whisker Cleric (10 HP, 2 ATK, 2 DEF)

- **Fantasy:** the cat that never dies. Slow grinder, poison clock, life drain.
- **AFK role:** **the longest-survival class.** This is what Cleric should be: leave it on overnight, wake up on floor 300.
- **Current failure:** Toxic Prayer + Nosferatu + Aegis Mirror are sideways stats in a game where ATK wins. Husband's complaint "abilities suck" is really "abilities don't matter because I out-DPS the need for sustain." Heals only matter when something can kill you, and nothing on AUTO kills a Cleric.
- **Direction (no numbers yet):** Cleric must have a passive **%max HP regen per turn** so the survivability fantasy is always on. Nosferatu damage stays sideways, but its lifesteal must scale with %missing HP (so it does more when you actually need it). Toxic Prayer's poison must scale enemy %max HP, not raw damage, so it remains relevant past the ATK soft cap. Net result: a Cleric run reaches a higher floor than a Warrior run with the same upgrades, on AUTO.

### Combo classes (prestige)

The six combo classes (`mage_knight`, `sage`, `templar`, `duelist`, `arcanist`, `plaguecat`) currently have empty `skills: []` and inherit from parent classes via `isComboClassKey` and `calcComboSkillDamage`. Their stat lines are tankier and hit harder than base classes (e.g. mage_knight is 20 HP / 8 ATK vs. warrior's 12/3).

Combo class identity rule under this doc: **a combo class is the AFK fantasy of both parents at once.** No new mechanics. A duelist (warrior + rogue) should be a high-survivability gold-grinder. A plaguecat (rogue + cleric) should be the longest-survival gold-grinder. Etc. When per-combo skill design happens, the parent class identities above are the input.

Combo classes do NOT get exemptions from the soft-cap or compounding rules.

---

## 5. Testable hypotheses (the next three patches)

Three small, separately shippable patches. One verifiable claim each. No concrete numbers yet; those get locked during the patch itself, against the rules above.

### v1.0.5 — Cleric "survival" identity

- **Hypothesis:** a fresh Cleric run reaches a measurably higher floor than a fresh Warrior run with the same meta-upgrades, on AUTO, no babysitting.
- **Surface area:** Cleric skill scaling + passive regen, plus a single AUTO threshold so Nosferatu fires when HP drops below %X.
- **Verify:** [tools/auto-control-test.mjs](../../tools/auto-control-test.mjs) extended with class-comparison run, or a manual back-to-back run.

### v1.0.6 — Rogue "compounding gold" identity

- **Hypothesis:** a Rogue run at floor 100 yields ~2x the gold of a Warrior run at floor 100 with the same meta-upgrades.
- **Surface area:** Pickpocket scaling rework; possibly a rogue-only "loot drop" passive that compounds per kill.
- **Verify:** instrument the run, log gold-per-floor for both classes side-by-side. Pass = Rogue total at floor 100 ≥ 1.8x Warrior total.

### v1.0.7 — Early difficulty hook

- **Hypothesis:** average player session length on the free demo wall (currently floor 100) increases, because a visible difficulty spike at ~floor 25 and ~floor 50 forces a pause-and-tune moment instead of pure idle scroll.
- **Surface area:** enemy ATK/HP curve at specific floor breakpoints.
- **Verify:** Vercel Analytics session-length metric before and after deploy.

Each patch obeys Pillars 1-4. Each is independently shippable and revertable.

---

## 6. What this doc is NOT

- A balance spreadsheet.
- A code change.
- A new feature list.
- A roadmap.

If a future plan wants to add a fifth genre, a new mechanic that breaks AUTO, or a "let's add player skill expression" mode, this doc is what we hold up and say no.

---

## 7. Open questions (for the next design session, not this patch)

- Should the demo wall move from floor 100 → floor 50 if v1.0.7 makes floor 25-50 the real hook? (Marketing impact.)
- Are combo classes worth designing per-class skill sets, or should they remain inheritance-based?
- Does ATK soft-cap conflict with the existing weapon tier scaling (`attackMult: 2.5` at tier 4)?

These do not block any patch. They are TBD with data.

---

## 8. Changelog

- **2026-05-27** — v1 written after first paid sale. Husband-testing surfaced identity confusion; doc picks AFK tower climber and locks rules.
