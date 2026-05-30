/**
 * Party camp equipment: weapon/armor tiers and skill potency (0–5 → 1.0–1.75×).
 */

import { getStatsAtLevel } from "./partyLeveling.js";

export const POTENCY_MAX_LEVEL = 5;

/** Potency multiplier at level n (0-based purchases → levels 0–5). */
export function potencyMultiplier(level) {
  const n = Math.max(0, Math.min(POTENCY_MAX_LEVEL, Number(level) || 0));
  return 1 + n * 0.15;
}

export function getPotencyLevel(equipment, skillId) {
  return Math.max(0, Number(equipment?.skillPotency?.[skillId]) || 0);
}

/** Apply persistent weapon/armor tiers on top of floor stats. */
export function applyEquipmentStats(classKey, floor, equipment) {
  const base = getStatsAtLevel(classKey, floor);
  if (!base) return null;
  const weaponTier = Math.max(0, Number(equipment?.weaponTier) || 0);
  const armorTier = Math.max(0, Number(equipment?.armorTier) || 0);
  return {
    maxHp: Math.round(base.maxHp * (1 + armorTier * 0.05)),
    attack: Math.round(base.attack * (1 + weaponTier * 0.1)),
    defense: Math.round(base.defense * (1 + armorTier * 0.08)),
    speed: base.speed,
  };
}

/** Merge equipment + battle state onto a party member record. */
export function hydratePartyMember(member, floor, equipment) {
  const stats = applyEquipmentStats(member.classKey, floor, equipment);
  if (!stats) return member;
  const ratio = member.maxHp > 0 ? member.hp / member.maxHp : 1;
  const maxHp = stats.maxHp;
  return {
    ...member,
    ...stats,
    maxHp,
    hp: Math.min(maxHp, Math.max(0, Math.round(maxHp * ratio))),
    cooldowns: member.cooldowns ?? {},
    statuses: member.statuses ?? {},
    defendActive: Boolean(member.defendActive),
    partyBlock: Boolean(member.partyBlock),
    reflect: member.reflect ?? null,
  };
}
