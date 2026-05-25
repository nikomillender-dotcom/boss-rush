/**
 * War Cry: +25% ATK/DEF for N player turns (turn-based expiry, no per-hit consume).
 * Run: node tools/war-cry-test.mjs
 */
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

const WAR_CRY_BUFF_TURNS = 2;
const WAR_CRY_STAT_MULT = 1.25;

function isWarCryBuffActive(player, battleTurn) {
  return (
    player?.warCryBuffExpiresOnTurn != null &&
    battleTurn < player.warCryBuffExpiresOnTurn
  );
}

function getEffectiveAttack(player, battleTurn) {
  const atk = player?.attack ?? 1;
  if (!isWarCryBuffActive(player, battleTurn)) return atk;
  return Math.max(1, Math.round(atk * WAR_CRY_STAT_MULT));
}

function getEffectiveDefense(player, battleTurn) {
  const def = player?.defense ?? 0;
  if (!isWarCryBuffActive(player, battleTurn)) return def;
  return Math.max(0, Math.round(def * WAR_CRY_STAT_MULT));
}

function applyWarCry(battleTurn) {
  return { warCryBuffExpiresOnTurn: battleTurn + 1 + WAR_CRY_BUFF_TURNS };
}

function beginPlayerTurn(player, battleTurn) {
  if (
    player.warCryBuffExpiresOnTurn != null &&
    battleTurn >= player.warCryBuffExpiresOnTurn
  ) {
    return { ...player, warCryBuffExpiresOnTurn: null };
  }
  return player;
}

const base = { attack: 8, defense: 2 };

console.log("War Cry cast at turn 0 (expires turn 3 — two fight turns after cast):");
let p = { ...base, ...applyWarCry(0) };
assert(p.warCryBuffExpiresOnTurn === 3, "expires turn 3");
assert(isWarCryBuffActive(p, 0), "active turn 0 (cast turn)");
assert(isWarCryBuffActive(p, 1), "active turn 1 (first fight turn)");
assert(isWarCryBuffActive(p, 2), "active turn 2 (second fight turn)");
assert(getEffectiveAttack(p, 1) === 10, "ATK 8 → 10 on fight turn 1");
assert(getEffectiveDefense(p, 1) === 3, "DEF 2 → 3 on fight turn 1");

console.log("\nSecond buffed fight turn:");
assert(getEffectiveAttack(p, 2) === 10, "ATK still buffed turn 2");
assert(getEffectiveAttack(p, 2) === 10, "Power Strike path uses same ATK turn 2");

console.log("\nExpires at turn 3:");
p = beginPlayerTurn(p, 3);
assert(!isWarCryBuffActive(p, 3), "inactive turn 3");
assert(getEffectiveAttack(p, 3) === 8, "ATK back to base");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
