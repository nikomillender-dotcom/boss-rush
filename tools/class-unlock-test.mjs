/**
 * Base/combo class unlock gates (account best floor).
 */
import { SCALING_CONFIG } from "../src/battle/scaling.js";

const BASE_CLASS_UNLOCK_FLOOR = {
  warrior: 0,
  mage: 5,
  rogue: 20,
  cleric: 50,
};

const COMBO_UNLOCK_FLOOR = SCALING_CONFIG.comboUnlockFloor;

function getAccountBestFloor(save) {
  let best = Math.max(0, Number(save?.records?.rounds) || 0);
  for (const key of ["warrior", "mage", "rogue", "cleric"]) {
    best = Math.max(best, save?.classes?.[key]?.bestFloorReached ?? 0);
  }
  return best;
}

function isBaseClassUnlocked(save, classKey) {
  const need = BASE_CLASS_UNLOCK_FLOOR[classKey] ?? 0;
  return getAccountBestFloor(save) >= need;
}

function isComboUnlocked(save, parents) {
  return parents.every(
    (p) => (save?.classes?.[p]?.bestFloorReached ?? 0) >= COMBO_UNLOCK_FLOOR
  );
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

const empty = { records: { rounds: 0 }, classes: {} };

console.log("Warrior always unlocked:");
assert(isBaseClassUnlocked(empty, "warrior"), "floor 0");

console.log("\nMage at floor 5:");
assert(!isBaseClassUnlocked({ ...empty, records: { rounds: 4 } }, "mage"), "4 blocks");
assert(isBaseClassUnlocked({ ...empty, records: { rounds: 5 } }, "mage"), "5 unlocks");
assert(
  isBaseClassUnlocked(
    { records: { rounds: 0 }, classes: { rogue: { bestFloorReached: 20 } } },
    "mage"
  ),
  "any class best floor counts"
);

console.log("\nRogue at 20 / Cleric at 50:");
assert(!isBaseClassUnlocked({ records: { rounds: 19 } }, "rogue"), "rogue 19");
assert(isBaseClassUnlocked({ records: { rounds: 20 } }, "rogue"), "rogue 20");
assert(!isBaseClassUnlocked({ records: { rounds: 49 } }, "cleric"), "cleric 49");
assert(isBaseClassUnlocked({ records: { rounds: 50 } }, "cleric"), "cleric 50");

console.log("\nCombo needs floor 100 on both parents:");
const mkParents = ["warrior", "mage"];
assert(!isComboUnlocked(empty, mkParents), "none");
assert(
  !isComboUnlocked(
    {
      classes: {
        warrior: { bestFloorReached: 100 },
        mage: { bestFloorReached: 99 },
      },
    },
    mkParents
  ),
  "one parent short"
);
assert(
  isComboUnlocked(
    {
      classes: {
        warrior: { bestFloorReached: 100 },
        mage: { bestFloorReached: 100 },
      },
    },
    mkParents
  ),
  "both at 100"
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
