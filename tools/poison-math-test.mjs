/**
 * Poison tick math (no React).
 */
import { poisonTickDamage, SCALING_CONFIG } from "../src/battle/scaling.js";

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

const maxHp = 100;
const tick = poisonTickDamage(maxHp);
assert(
  tick === Math.ceil(maxHp * SCALING_CONFIG.poisonTickPercent),
  "tick uses 33.34% of max HP (ceiled)"
);

let hp = maxHp;
for (let turn = 0; turn < 3; turn++) {
  hp = Math.max(0, hp - poisonTickDamage(maxHp));
}
assert(hp <= 0, "three poison ticks kill a full-HP trash enemy");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
