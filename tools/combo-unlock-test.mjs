/**
 * Dual-combo unlock matrix (no React).
 */
import { SCALING_CONFIG } from "../src/battle/scaling.js";

const UNLOCK = SCALING_CONFIG.comboUnlockFloor;

const COMBOS = {
  mage_knight: ["warrior", "mage"],
  sage: ["mage", "cleric"],
  templar: ["warrior", "cleric"],
  duelist: ["warrior", "rogue"],
  arcanist: ["mage", "rogue"],
  plaguecat: ["rogue", "cleric"],
};

function isComboUnlocked(classes, parents) {
  return parents.every((p) => (classes[p]?.bestFloorReached ?? 0) >= UNLOCK);
}

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  OK: ${msg}`);
  } else {
    fail++;
    console.error(`  FAIL: ${msg}`);
  }
}

const base = {
  warrior: { bestFloorReached: 99 },
  mage: { bestFloorReached: 100 },
  rogue: { bestFloorReached: 100 },
  cleric: { bestFloorReached: 100 },
};

assert(!isComboUnlocked(base, COMBOS.mage_knight), "mage_knight locked if warrior < 100");

const unlocked = {
  ...base,
  warrior: { bestFloorReached: 100 },
};
assert(isComboUnlocked(unlocked, COMBOS.mage_knight), "mage_knight unlock at 100/100");
assert(isComboUnlocked(unlocked, COMBOS.duelist), "duelist unlock when warrior+rogue at 100");
assert(isComboUnlocked(unlocked, COMBOS.sage), "sage unlock when mage+cleric at 100");
assert(!isComboUnlocked({ cleric: { bestFloorReached: 50 }, mage: { bestFloorReached: 100 } }, COMBOS.sage), "sage needs both parents");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
