/**
 * Nosferatu lifesteal percent curve (no React).
 */
import { lifestealPercent } from "../src/battle/scaling.js";

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

const lv0 = lifestealPercent(0);
assert(Math.abs(lv0 - 0.33) < 0.001, "Lv0 lifesteal is 33%");
assert(Math.floor(100 * lv0) === 33, "100 damage at Lv0 heals 33 HP");

const lv60 = lifestealPercent(60);
assert(lv60 <= 0.5, "lifesteal capped at 50%");
assert(lv60 === 0.5, "camp level 60+ reaches 50% cap");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
