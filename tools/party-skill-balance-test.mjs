/**
 * Party Mode v1 balance + data contract checks.
 * Run: node tools/party-skill-balance-test.mjs
 *
 * Validates the locked spec in docs/party-mode-canonical-handoff.md so future
 * edits to the data files cannot silently drift from the agreed numbers.
 */

import {
  PARTY_SKILLS_V1,
  PARTY_PASSIVES_V1,
  skillIdsUnlockedByFloor,
  getPartySkill,
  hasTag,
  POST_DOGGOD,
} from "../src/content/skillDefinitions.js";
import {
  PARTY_BASE_STATS,
  PARTY_CLASS_KEYS,
  getStatLetter,
  getStatLetterCard,
} from "../src/content/classDefinitions.js";
import { getStatsAtLevel, mergeSkillUnlocks } from "../src/party/partyLeveling.js";
import {
  applyStatus,
  computeDotDamage,
  statMultiplier,
  countUniqueDebuffs,
  rollCrowdControl,
  STACK_CAPS,
  STAT_DEBUFF_FLOOR,
  TIER_RESISTANCE,
} from "../src/combat/statusEffects.js";
import {
  getEnemyTierForFloor,
  getZoneIndexForPartyFloor,
  getTierForFreeplay,
  PARTY_MODE_FLOOR_CONFIG,
} from "../src/battle/scaling.js";

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("OK:", msg);
  }
}

// ── Speed tiers (Rogue 10 > Mage 7 > Warrior 6 > Cleric 4) ──
ok(PARTY_BASE_STATS.rogue.speed === 10, "Rogue speed 10");
ok(PARTY_BASE_STATS.mage.speed === 7, "Mage speed 7 (party, not solo 8)");
ok(PARTY_BASE_STATS.warrior.speed === 6, "Warrior speed 6");
ok(PARTY_BASE_STATS.cleric.speed === 4, "Cleric speed 4 (party, not solo 7)");

const speeds = PARTY_CLASS_KEYS.map((k) => PARTY_BASE_STATS[k].speed);
ok(
  speeds.join() === [6, 7, 10, 4].join(),
  "speed order check (turn sort handled at runtime)"
);

// ── Leveling math: Warrior at floor 50 = 112/53/27 ──
const w50 = getStatsAtLevel("warrior", 50);
ok(w50.maxHp === 112, `Warrior L50 HP 112 (got ${w50.maxHp})`);
ok(w50.attack === 53, `Warrior L50 ATK 53 (got ${w50.attack})`);
ok(w50.defense === 27, `Warrior L50 DEF 27 (got ${w50.defense})`);
ok(w50.speed === 6, "Warrior speed never grows");

// ── Skill CD / unlock locks (spot checks) ──
const locks = [
  ["warrior", "power_strike", 2, 1],
  ["warrior", "shield_party", 9, 9],
  ["warrior", "shieldstrike", 1, 250],
  ["mage", "fire", 1, 1],
  ["mage", "dark", 8, 199],
  ["rogue", "pickpocket", 6, 1],
  ["rogue", "shadow_mark", 8, 19],
  ["rogue", "death_spiral", 12, 250],
  ["cleric", "fallen_angel", 16, 250],
  ["cleric", "prayer_of_mending", 7, 49],
];
for (const [cls, id, cd, unlock] of locks) {
  const s = getPartySkill(cls, id);
  ok(s && s.cooldown === cd, `${cls}.${id} CD ${cd} (got ${s?.cooldown})`);
  ok(s && s.unlock === unlock, `${cls}.${id} unlock ${unlock} (got ${s?.unlock})`);
}

// ── Renamed collisions present, old names absent ──
ok(getPartySkill("mage", "restore"), "Mage Mend renamed to Restore");
ok(getPartySkill("mage", "arcane_light"), "Mage Light renamed to Arcane Light");
ok(getPartySkill("cleric", "prayer_of_mending"), "Cleric Mend renamed");
ok(getPartySkill("cleric", "holy_light"), "Cleric Light renamed to Holy Light");

// ── Cooldown-immunity tags ──
ok(hasTag(getPartySkill("warrior", "shield_party"), "ignoreCooldownReduction"), "Shield Party ignores CD reduction");
ok(hasTag(getPartySkill("mage", "forbidden_magic"), "ignoreCooldownReduction"), "Forbidden Magic ignores CD reduction");
ok(hasTag(getPartySkill("mage", "forbidden_magic"), "noWindReduction"), "Forbidden Magic immune to Wind");
ok(hasTag(getPartySkill("cleric", "fallen_angel"), "ignoreCooldownReduction"), "Fallen Angel ignores CD reduction");

// ── Post-Doggod unlocks ──
ok(getPartySkill("mage", "forbidden_magic").unlock === POST_DOGGOD, "Forbidden Magic post-Doggod");

// ── Floor-1 unlock sets ──
ok(skillIdsUnlockedByFloor("rogue", 1).sort().join() === ["pickpocket", "shiv"].sort().join(), "Rogue floor-1 = pickpocket+shiv");
ok(skillIdsUnlockedByFloor("warrior", 1).join() === ["power_strike", "war_cry"].join(), "Warrior floor-1 = power_strike+war_cry");

// ── Perma unlocks only grow (simulate wipe) ──
let unlocks = mergeSkillUnlocks([], "warrior", 9);
ok(unlocks.includes("shield_party"), "reach floor 9 unlocks Shield Party");
unlocks = mergeSkillUnlocks(unlocks, "warrior", 1); // simulate death reset to floor 1
ok(unlocks.includes("shield_party"), "Shield Party persists after reset to floor 1");

// ── Stack caps ──
let st = {};
for (let i = 0; i < 5; i++) st = applyStatus(st, "poison", { stacks: 1 });
ok(st.poison.stacks === STACK_CAPS.debuff, `poison caps at ${STACK_CAPS.debuff}`);
let buff = {};
for (let i = 0; i < 5; i++) buff = applyStatus(buff, "atk_up", { stacks: 1 });
ok(buff.atk_up.stacks === STACK_CAPS.buff, `atk_up caps at ${STACK_CAPS.buff}`);

// ── DOT potency + boss resistance (bleed 4%/stack) ──
const maxHp = 100;
let bleed = applyStatus({}, "bleed", { stacks: 3 });
ok(computeDotDamage(bleed, maxHp, "normal") === 12, "3x bleed = 12 on 100HP normal");
ok(computeDotDamage(bleed, maxHp, "boss") === Math.round(12 * 0.7), "boss DOT at 70%");
ok(computeDotDamage(bleed, maxHp, "doggod") === Math.round(12 * 0.5), "Doggod DOT at 50%");

// ── Stat debuff floor ──
let shred = {};
for (let i = 0; i < 3; i++) shred = applyStatus(shred, "def_down", { stacks: 1 });
const dm = statMultiplier(shred, "def", "normal");
ok(dm >= STAT_DEBUFF_FLOOR, `def debuff respects floor ${STAT_DEBUFF_FLOOR} (got ${dm.toFixed(2)})`);
ok(Math.abs(dm - 0.4) < 1e-9, "3x def_down = 0.4x (40%) normal");

// ── Berserk immunity on Doggod (deterministic rng) ──
ok(rollCrowdControl("berserk", "doggod", 1, () => 0) === false, "Doggod immune to berserk");
ok(rollCrowdControl("berserk", "normal", 1, () => 0) === true, "normal can be berserked");
// Berserk reliability comes from tier CC (boss=0.25); skill accuracy table mirrors it,
// so callers pass base accuracy 1.0 and let tier resistance decide.
ok(rollCrowdControl("berserk", "boss", 1, () => 0.2) === true, "boss berserk lands under 25%");
ok(rollCrowdControl("berserk", "boss", 1, () => 0.3) === false, "boss berserk fails over 25%");
ok(rollCrowdControl("berserk", "miniBoss", 1, () => 0.4) === true, "mini-boss berserk lands under 50%");

// ── Unique debuff count (finisher scaling input) ──
let multi = applyStatus({}, "poison", { stacks: 2 });
multi = applyStatus(multi, "bleed", { stacks: 1 });
multi = applyStatus(multi, "def_down", { stacks: 1 });
multi = applyStatus(multi, "marked", {}); // marked excluded
ok(countUniqueDebuffs(multi) === 3, `3 unique debuffs (got ${countUniqueDebuffs(multi)})`);

// ── Execution Thread cap respected (boss vs normal) ──
const exec = getPartySkill("rogue", "execution_thread");
function execMult(uniqueDebuffs, isBoss) {
  const cap = isBoss ? exec.bossPerDebuffCap : exec.perDebuffCap;
  const bonus = Math.min(cap, uniqueDebuffs * exec.perDebuffMult);
  return exec.multiplier + bonus;
}
ok(execMult(10, false) === 1.8 + 1.4, "Execution Thread normal cap +1.4x");
ok(execMult(10, true) === 1.8 + 1.0, "Execution Thread boss cap +1.0x");

// ── Floor tier cadence ──
ok(getEnemyTierForFloor(5) === "boss", "floor 5 boss");
ok(getEnemyTierForFloor(4) === "miniBoss", "floor 4 mini-boss");
ok(getEnemyTierForFloor(3) === "trash", "floor 3 trash");
ok(getEnemyTierForFloor(50) === "boss", "floor 50 capstone-boss");
ok(getEnemyTierForFloor(49) === "miniBoss", "floor 49 mini-boss");
ok(getEnemyTierForFloor(55) === "boss", "floor 55 boss (zone 2)");

// ── Zone mapping + freeplay escalation ──
ok(getZoneIndexForPartyFloor(1) === 0, "floor 1 zone 0");
ok(getZoneIndexForPartyFloor(500) === 9, "floor 500 zone 9 (Doggod)");
ok(getZoneIndexForPartyFloor(9999) === 9, "freeplay clamps to last zone");
ok(getTierForFreeplay("trash", 2000) === "boss", "freeplay 2000+ trash becomes boss");
ok(getTierForFreeplay("trash", 1999) === "trash", "below 2000 trash stays trash");
ok(PARTY_MODE_FLOOR_CONFIG.doggodFloor === 500, "Doggod at floor 500");

// ── Resistance table sanity ──
ok(TIER_RESISTANCE.boss.dot === 0.7, "boss DOT coefficient 0.7");
ok(TIER_RESISTANCE.doggod.berserkImmune === true, "doggod berserk immune flag");

// ── Stat letter rankings (party-select popup) ──
ok(getStatLetter("spd", 10) === "S", "SPD 10 = S");
ok(getStatLetter("hp", 12) === "S", "HP 12 = S");
ok(getStatLetterCard("rogue").spd === "S", "Rogue SPD card = S");
ok(getStatLetterCard("warrior").hp === "S", "Warrior HP card = S");
// Threshold table is the precise rule: ATK 2 => C (export's "Cleric ATK D" card
// contradicted its own threshold table; thresholds win).
ok(getStatLetterCard("cleric").atk === "C", "Cleric ATK 2 => C per threshold table");
ok(getStatLetterCard("cleric").hp === "A", "Cleric HP 10 => A");

// ── Passive unlock spread (Mage/Cleric 101/150/200/250) ──
ok(PARTY_PASSIVES_V1.mage.map((p) => p.unlock).slice(0, 3).join() === [101, 150, 200].join(), "Mage passive spread 101/150/200");
ok(PARTY_PASSIVES_V1.cleric.find((p) => p.id === "staff_of_life").replacesDefaultRevive === true, "Staff of Life replaces default revive");

console.log(failed ? `\n${failed} failed` : "\nAll passed");
process.exit(failed ? 1 : 0);
