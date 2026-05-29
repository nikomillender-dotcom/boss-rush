/**
 * Floor-based leveling for Party Mode. Level == current floor. Stats reset on wipe,
 * but skill unlocks persist (handled by the save layer, not here).
 *
 * Pure functions only. Source of truth: docs/party-mode-canonical-handoff.md
 */

import {
  PARTY_BASE_STATS,
  GROWTH_RATES,
  PARTY_CLASS_KEYS,
} from "../content/classDefinitions.js";
import {
  skillIdsUnlockedByFloor,
  passiveIdsUnlockedByFloor,
} from "../content/skillDefinitions.js";

/** Stats for a class at a given floor/level (speed never grows). */
export function getStatsAtLevel(classKey, level) {
  const base = PARTY_BASE_STATS[classKey];
  const growth = GROWTH_RATES[classKey];
  if (!base || !growth) return null;
  const lvl = Math.max(0, Number(level) || 0);
  return {
    maxHp: Math.floor(base.maxHp + growth.hp * lvl),
    attack: Math.floor(base.attack + growth.atk * lvl),
    defense: Math.floor(base.defense + growth.def * lvl),
    speed: base.speed,
  };
}

/**
 * Merge newly reached unlocks into a persistent unlock list.
 * `current` is the saved string[] of unlocked skill ids; returns a new array.
 */
export function mergeSkillUnlocks(current, classKey, floor) {
  const reached = skillIdsUnlockedByFloor(classKey, floor);
  const set = new Set([...(current ?? []), ...reached]);
  return [...set];
}

export function mergePassiveUnlocks(current, classKey, floor) {
  const reached = passiveIdsUnlockedByFloor(classKey, floor);
  const set = new Set([...(current ?? []), ...reached]);
  return [...set];
}

/**
 * Apply a reached floor to a full partySkillUnlocks map for every class.
 * Returns a new map; never removes previously earned unlocks.
 */
export function applyFloorUnlocks(partySkillUnlocks, floor) {
  const next = {};
  for (const key of PARTY_CLASS_KEYS) {
    next[key] = mergeSkillUnlocks(partySkillUnlocks?.[key], key, floor);
  }
  return next;
}

/** Build a fresh, level-0 combatant for a class using earned skill unlocks. */
export function buildPartyMember(classKey, level, unlockedSkillIds = []) {
  const stats = getStatsAtLevel(classKey, level);
  if (!stats) return null;
  return {
    classKey,
    level,
    ...stats,
    hp: stats.maxHp,
    statuses: {},
    ko: false,
    unlockedSkillIds: [...unlockedSkillIds],
  };
}
