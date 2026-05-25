/**
 * Afterburn carrier count by Fire camp level.
 */
import { afterburnCarriers } from "../src/battle/scaling.js";

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

console.log("afterburnCarriers (1 + floor(lv/10)):");
assert(afterburnCarriers(0) === 1, "Lv0 → 1 carrier");
assert(afterburnCarriers(9) === 1, "Lv9 → 1 carrier");
assert(afterburnCarriers(10) === 2, "Lv10 → 2 carriers");
assert(afterburnCarriers(19) === 2, "Lv19 → 2 carriers");
assert(afterburnCarriers(20) === 3, "Lv20 → 3 carriers");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
