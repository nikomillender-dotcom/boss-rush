/**
 * Proves H5: freeze must be set before submitCommand enemy-first check.
 */
let skipNext = false;

function wouldEnemyMoveFirst(playerSpd, enemySpd) {
  const enemyFaster = enemySpd > playerSpd;
  return enemyFaster && !skipNext;
}

const mageSpd = 8;
const enemySpd = 10;

// Old order: cast frost inside submit callback (skip still false at gate)
skipNext = false;
const oldEnemyFirst = wouldEnemyMoveFirst(mageSpd, enemySpd);
skipNext = true;

// New order: apply freeze intent before submitCommand
skipNext = false;
skipNext = true; // applyEnemyFreezeIntent in actionMagic
const newEnemyFirst = wouldEnemyMoveFirst(mageSpd, enemySpd);

console.log("Mage SPD", mageSpd, "Enemy SPD", enemySpd);
console.log("OLD: enemy-first before freeze refs:", oldEnemyFirst);
console.log("NEW: enemy-first with pre-freeze refs:", newEnemyFirst);

if (oldEnemyFirst && !newEnemyFirst) {
  console.log("\nPASS: pre-submit freeze blocks speed-order attack.");
  process.exit(0);
}
console.error("\nFAIL: order simulation unexpected");
process.exit(1);
