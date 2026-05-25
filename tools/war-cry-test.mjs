/**
 * War Cry crit buff expires after N player turns (battleTurn window).
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

const CRIT_BUFF_TURNS = 2;

function warCryActive(player, battleTurn) {
  return (
    (player.critBuffTurnsLeft ?? 0) > 0 &&
    (player.critBuffExpiresOnTurn == null ||
      battleTurn < player.critBuffExpiresOnTurn)
  );
}

function applyWarCry(battleTurn) {
  return {
    critBuffTurnsLeft: CRIT_BUFF_TURNS,
    critBuffExpiresOnTurn: battleTurn + CRIT_BUFF_TURNS,
  };
}

function beginPlayerTurn(player, battleTurn) {
  if (
    player.critBuffExpiresOnTurn != null &&
    battleTurn >= player.critBuffExpiresOnTurn
  ) {
    return { ...player, critBuffTurnsLeft: 0, critBuffExpiresOnTurn: null };
  }
  return player;
}

console.log("War Cry cast at turn 0:");
let p = applyWarCry(0);
assert(warCryActive(p, 0), "active on cast turn");
assert(warCryActive(p, 1), "active turn 1");

console.log("\nExpires when battleTurn reaches expiresOnTurn:");
p = beginPlayerTurn(p, 2);
assert(!warCryActive(p, 2), "inactive at turn 2");
assert(p.critBuffTurnsLeft === 0, "charges cleared");

console.log("\nCrit on fight still respects expiry:");
p = applyWarCry(5);
assert(warCryActive(p, 6), "mid window");
p = beginPlayerTurn(p, 7);
assert(!warCryActive(p, 7), "expired at 7");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
