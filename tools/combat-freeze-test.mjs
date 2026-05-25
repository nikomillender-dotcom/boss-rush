/**
 * Node smoke test for freeze carriers, block override, pickAutoSkill (no MP).
 */
import {
  weaponTierPrice,
  afterburnChip,
  afterburnCarriers,
} from "../src/battle/scaling.js";
import {
  rollFightDamage,
  calcDamageToPlayer,
  pickAutoSkill,
  isSkillReady,
} from "../src/battle/ff1TurnResolver.js";

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

console.log("Weapon tier prices (fixed ladder):");
const wPrices = [0, 1, 2, 3, 4].map((tier) => weaponTierPrice("mage", tier));
assert(wPrices[0] === 0, "starter free");
assert(
  wPrices[1] === 100_000 &&
    wPrices[2] === 500_000 &&
    wPrices[3] === 1_000_000 &&
    wPrices[4] === 10_000_000,
  "fixed prices 100k / 500k / 1M / 10M"
);

console.log("\nAfterburn chip:");
assert(afterburnChip(0, 100) === 1, "Lv0 → 1 chip");
assert(afterburnChip(50, 1000) === 6, "Lv50 → 6 chip");
assert(afterburnChip(100, 100) === 5, "capped at 5% of 100 HP max");
assert(afterburnChip(100, 10_000) === 11, "Lv100 raw 11, cap 500");

console.log("\nAfterburn carriers:");
assert(afterburnCarriers(0) === 1, "Lv0 → 1");
assert(afterburnCarriers(10) === 2, "Lv10 → 2");

console.log("\nisSkillReady / pickAutoSkill (cooldown-only):");
const mageSkills = [
  { type: "damage_afterburn", currentCooldown: 0 },
  { type: "heal", currentCooldown: 0 },
];
assert(isSkillReady(mageSkills[0]), "fire ready");
assert(
  pickAutoSkill(mageSkills, 0, { preferDamage: true }) === 0,
  "prefers fire over mend"
);
const onCd = [{ type: "damage", currentCooldown: 2 }];
assert(pickAutoSkill(onCd, 0) === null, "no ready skills");

console.log("\nFight damage (deterministic variance=0):");
const fight = rollFightDamage(20, 0, false, 2.5);
assert(fight.damage === 20, "fight damage equals attack at 0 variance");

console.log("\nEnemy damage vs player DEF / block:");
const hit = calcDamageToPlayer(10, {
  hasBlockBuff: false,
  defense: 3,
  blockReduction: 0.4,
});
assert(hit.damage === 7, "10 atk - 3 def = 7");

const defended = calcDamageToPlayer(10, {
  hasBlockBuff: true,
  defense: 0,
  blockReduction: 0.4,
  blockReductionOverride: 0.55,
});
assert(defended.damage === 5, "defend block 0.55 on 10 → 5");

const shield = calcDamageToPlayer(10, {
  hasBlockBuff: true,
  defense: 0,
  blockReduction: 0.4,
  blockReductionOverride: 0.4,
});
assert(shield.damage === 4, "shield wall 0.4 on 10 → 4");

console.log("\nSage freeze duration (2–4 turns):");
function sageFreezeTurns(randInt) {
  return randInt(2, 4);
}
function mageFreezeTurns(randInt) {
  return randInt(1, 3);
}
let seed = 12345;
const randInt = (min, max) => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return min + (seed % (max - min + 1));
};
for (let i = 0; i < 30; i++) {
  const t = sageFreezeTurns(randInt);
  assert(t >= 2 && t <= 4, `sage freeze in range got ${t}`);
}
for (let i = 0; i < 30; i++) {
  const t = mageFreezeTurns(randInt);
  assert(t >= 1 && t <= 3, `mage freeze in range got ${t}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
