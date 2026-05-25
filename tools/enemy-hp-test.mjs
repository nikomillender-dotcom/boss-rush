/**
 * Enemy HP bar: scaled hp must equal scaled maxHp at spawn.
 * Run: node tools/enemy-hp-test.mjs
 */
import { buildEnemyFromCatalog, resolveEnemyTemplate } from "../src/content/enemyThemes.js";

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

for (const round of [1, 2, 10, 100]) {
  const template = resolveEnemyTemplate(round);
  const enemy = buildEnemyFromCatalog(round, template);
  assert(
    enemy.hp === enemy.maxHp,
    `round ${round} ${enemy.name}: hp ${enemy.hp} === maxHp ${enemy.maxHp}`
  );
  assert(enemy.hp >= template.maxHp, `round ${round}: scaled hp >= template base ${template.maxHp}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
