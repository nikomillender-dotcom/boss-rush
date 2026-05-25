/**
 * Boss skip ledger + canAutoSkipBoss (no React).
 */
import {
  canAutoSkipBoss,
  syncBossesDefeatedFromBestFloor,
  isBossRound,
} from "../src/battle/scaling.js";

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

const save = {
  classes: {
    mage: {
      bestFloorReached: 35,
      bossesDefeated: [],
    },
  },
};

const synced = syncBossesDefeatedFromBestFloor(save.classes.mage);
assert(synced.bossesDefeated.includes(10), "infers floor 10 boss from best 35");
assert(synced.bossesDefeated.includes(30), "infers floor 30 boss from best 35");
assert(!synced.bossesDefeated.includes(40), "does not infer unbeaten floor 40");

assert(
  canAutoSkipBoss({ classes: { mage: synced } }, "mage", 10),
  "can skip beaten floor 10"
);
assert(
  !canAutoSkipBoss({ classes: { mage: synced } }, "mage", 40),
  "cannot skip unbeaten floor 40"
);
assert(isBossRound(100), "floor 100 is boss");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
