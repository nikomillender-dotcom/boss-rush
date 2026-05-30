/**
 * Smoke tests for party combat resolver (no locked-number drift).
 * Run: node tools/party-combat-smoke-test.mjs
 */

import { executePartyFight, executePartySkill } from "../src/party/partyCombat.js";
import { partyShopPrice, PARTY_SHOP_PRICE_MULT } from "../src/party/partyShop.js";
import { hellBurnOnHit } from "../src/party/partyEnemyAI.js";
import { getPartySkill } from "../src/content/skillDefinitions.js";
import { buildPartyMember } from "../src/party/partyLeveling.js";

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("OK:", msg);
  }
}

ok(PARTY_SHOP_PRICE_MULT === 0.4, "shop price mult 0.4");
ok(partyShopPrice(1000) === 400, "partyShopPrice 1000 → 400");

const warrior = buildPartyMember("warrior", 10, ["power_strike", "war_cry"]);
const enemy = {
  name: "Test Dog",
  hp: 50,
  maxHp: 50,
  attack: 5,
  partyTier: "trash",
  statuses: {},
};
const fight = executePartyFight({
  attacker: warrior,
  enemy,
  partyBuffs: {},
  equipment: {},
  rng: () => 0.5,
});
ok(fight.enemy.hp < 50, "party fight deals damage");

const mage = buildPartyMember("mage", 5, ["fire"]);
const fire = getPartySkill("mage", "fire");
const fireResult = executePartySkill({
  skill: fire,
  casterIndex: 0,
  members: [mage],
  enemy: { ...enemy, statuses: {} },
  partyBuffs: {},
  equipmentByClass: {},
  floor: 5,
  battleFlags: {},
  rng: () => 0,
});
ok(fireResult.enemy.hp < enemy.hp, "fire skill damages");
ok(fireResult.enemy.statuses?.burn, "fire applies burn");

ok(hellBurnOnHit(101), "hell theme at party floor 101");
ok(!hellBurnOnHit(50), "not hell at floor 50");

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nAll party combat smoke tests passed");
