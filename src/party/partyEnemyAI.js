/**
 * Party Mode enemy actions: tier-gated ability picks + Hell theme burn on hit.
 */

import { getZoneIndexForPartyFloor } from "../battle/scaling.js";
import { applyStatus } from "../combat/statusEffects.js";

const THEME_IDS = [
  "human",
  "monster",
  "hell",
  "space",
  "alien",
  "mirror",
  "heaven_low",
  "olympus",
  "pantheon",
  "angelic",
];

export function themeIdForPartyFloor(floor) {
  const idx = getZoneIndexForPartyFloor(floor);
  return THEME_IDS[idx] ?? "human";
}

export function enemyResistanceTier(enemy) {
  if (
    enemy?.isDoggod ||
    (enemy?.partyTier === "capstone" && enemy?.catalogId?.includes("doggod"))
  ) {
    return "doggod";
  }
  if (enemy?.partyTier === "boss" || enemy?.isBoss) return "boss";
  if (enemy?.partyTier === "miniBoss") return "miniBoss";
  return "normal";
}

export function actionsThisTurn(enemy) {
  return Math.max(1, Number(enemy?.actionsPerTurn) || 1);
}

/**
 * Pick an attack line for one enemy action. Returns { damageMult, label, applyBurn }.
 */
export function pickEnemyAction(enemy, rng = Math.random, { targets = [] } = {}) {
  const tier = enemy?.partyTier ?? "trash";
  const r = rng();
  if (enemy?.isDoggod) {
    const wounded = targets.filter(
      (t) => t.hp > 0 && !t.ko && t.maxHp > 0 && t.hp / t.maxHp < 0.25
    );
    if (wounded.length && r < 0.35) {
      return { damageMult: 9, label: "Judgment", applyBurn: false, execute: true };
    }
    if (r < 0.2) return { damageMult: 1.6, label: "all-seeing strike", applyBurn: false };
    if (r < 0.45) return { damageMult: 1.35, label: "divine rend", applyBurn: false };
    if (r < 0.7) return { damageMult: 1.1, label: "leash snap", applyBurn: false };
    return { damageMult: 0.9, label: "omniscient howl", applyBurn: false };
  }
  if (tier === "boss" || tier === "capstone") {
    if (r < 0.35) return { damageMult: 1.4, label: "crush", applyBurn: false };
    if (r < 0.6) return { damageMult: 1.1, label: "rend", applyBurn: false };
    return { damageMult: 0.85, label: "howl", applyBurn: false };
  }
  if (tier === "miniBoss") {
    if (r < 0.4) return { damageMult: 1.25, label: "heavy swipe", applyBurn: false };
    return { damageMult: 1, label: "strike", applyBurn: false };
  }
  if (r < 0.25) return { damageMult: 1.15, label: "lunge", applyBurn: false };
  return { damageMult: 1, label: "bite", applyBurn: false };
}

export function hellBurnOnHit(floor) {
  return themeIdForPartyFloor(floor) === "hell";
}

/**
 * Resolve one enemy hit on a party member.
 */
export function resolveEnemyHit({
  enemy,
  target,
  floor,
  partyMembers,
  targetIndex,
  rng = Math.random,
}) {
  const action = pickEnemyAction(enemy, rng, {
    targets: partyMembers.filter((m) => m.hp > 0 && !m.ko),
  });
  let damage = Math.max(
    1,
    Math.round((enemy.attack ?? 1) * action.damageMult - Math.floor((target.defense ?? 0) / 2))
  );
  if (target.defendActive) {
    damage = Math.max(1, Math.floor(damage * 0.5));
  }
  if (target.partyBlock) {
    damage = 0;
  }

  let reflectDamage = 0;
  if (target.reflect?.percent && damage > 0) {
    reflectDamage = Math.max(1, Math.floor(damage * target.reflect.percent));
  }

  const nextHp = Math.max(0, target.hp - damage);
  const members = [...partyMembers];
  members[targetIndex] = {
    ...target,
    hp: nextHp,
    ko: nextHp <= 0,
    defendActive: false,
    partyBlock: false,
    reflect:
      target.reflect && target.reflect.turns > 1
        ? { ...target.reflect, turns: target.reflect.turns - 1 }
        : null,
  };

  let enemyStatuses = enemy.statuses ?? {};
  if (hellBurnOnHit(floor) && damage > 0) {
    enemyStatuses = applyStatus(enemyStatuses, "burn", { stacks: 1 });
  }

  const logs = [
    `${enemy.name} ${action.label}s ${target.classKey} for ${damage}`,
  ];
  if (hellBurnOnHit(floor) && damage > 0) {
    logs.push("Hell scorches — infernal burn applied");
  }
  if (reflectDamage > 0) {
    logs.push(`${target.classKey} reflects ${reflectDamage}`);
  }

  return {
    members,
    enemy: { ...enemy, statuses: enemyStatuses, hp: Math.max(0, enemy.hp - reflectDamage) },
    logs,
    damage,
    reflectDamage,
  };
}
