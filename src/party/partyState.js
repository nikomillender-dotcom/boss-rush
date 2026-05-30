/**
 * Party run helpers: member roster, enemy build, retreat, post-boss heal.
 */

import {
  getEnemyTierForFloor,
  getEnemyRoundScaleParty,
  getZoneIndexForPartyFloor,
  PARTY_TIER_MULT,
} from "../battle/scaling.js";
import {
  resolveEnemyTemplate,
  THEME_BLOCKS,
} from "../content/enemyThemes.js";
import { buildPartyMember } from "./partyLeveling.js";
import { PARTY_CLASS_KEYS } from "../content/classDefinitions.js";
import { passiveIdsUnlockedByFloor } from "../content/skillDefinitions.js";
import { hydratePartyMember } from "./partyEquipment.js";
import { initCooldowns } from "./partyCombat.js";

/** Solo-equivalent round for catalog lookup (party compresses progression). */
export function partyFloorToSoloRound(partyFloor) {
  return Math.max(1, Number(partyFloor) || 1) * 2;
}

/**
 * Build a scaled enemy for the current party floor.
 * Uses theme trash/miniboss pools via solo round mapping; applies party tier multipliers.
 */
export function buildPartyEnemy(partyFloor) {
  const floor = Math.max(1, Number(partyFloor) || 1);
  const effectiveRound = partyFloorToSoloRound(floor);
  const template = resolveEnemyTemplate(effectiveRound);
  const partyTier = getEnemyTierForFloor(floor);
  const mult = PARTY_TIER_MULT[partyTier] ?? PARTY_TIER_MULT.trash;
  const scale = getEnemyRoundScaleParty(floor);

  const scaledMaxHp = Math.max(1, Math.round(template.maxHp * mult.hp * scale));
  const attack = Math.max(1, Math.round(template.attack * mult.atk * scale));
  const reward = Math.max(1, Math.round(template.reward * mult.reward * scale));

  const zoneIdx = getZoneIndexForPartyFloor(floor);
  const themeBlock = THEME_BLOCKS[zoneIdx] ?? THEME_BLOCKS[0];

  return {
    catalogId: template.id,
    name: template.name,
    icon: template.icon,
    spriteKey: template.spriteKey,
    themeId: template.theme,
    flipSprite: Boolean(template.flipSprite || themeBlock?.flipSprite),
    tier: partyTier,
    partyTier,
    maxHp: scaledMaxHp,
    hp: scaledMaxHp,
    attack,
    reward,
    speed: template.speed ?? 5,
    lore: template.lore,
    actionsPerTurn: mult.actionsPerTurn ?? 1,
    isBoss: partyTier === "boss" || partyTier === "capstone",
    freezeTurnsLeft: 0,
    poisonTurnsLeft: 0,
  };
}

/** Initialize four party members at the current floor with saved unlocks. */
export function createPartyRoster(comp, floor, partySkillUnlocks, partyEquipment = {}) {
  const keys = comp?.length === 4 ? comp : PARTY_CLASS_KEYS;
  return keys.map((classKey) => {
    const base = buildPartyMember(classKey, floor, partySkillUnlocks?.[classKey] ?? []);
    const equip = partyEquipment?.[classKey];
    const hydrated = hydratePartyMember(base, floor, equip);
    return {
      ...hydrated,
      cooldowns: initCooldowns(classKey, hydrated.unlockedSkillIds),
    };
  });
}

/** Validate comp: exactly 4 unique base class keys. */
export function isValidPartyComp(comp) {
  if (!Array.isArray(comp) || comp.length !== 4) return false;
  const set = new Set(comp);
  if (set.size !== 4) return false;
  return comp.every((k) => PARTY_CLASS_KEYS.includes(k));
}

/** Retreat penalty: lose half of run coins (rounded down). */
export function retreatRunCoinLoss(runCoins) {
  return Math.floor(Math.max(0, Number(runCoins) || 0) / 2);
}

/** Whether any unlocked passive includes Staff of Life. */
export function partyHasStaffOfLife(partySkillUnlocks, clericFloor) {
  const passives = passiveIdsUnlockedByFloor("cleric", clericFloor);
  return passives.includes("staff_of_life");
}

/**
 * After a boss floor: KO cats revive to 1 HP (or 20% with Staff of Life), alive cats to full.
 */
export function applyPostBossHeal(members, { staffOfLife = false } = {}) {
  return members.map((m) => {
    const wasDown = m.hp <= 0 || m.ko;
    if (wasDown) {
      const hp = staffOfLife
        ? Math.max(1, Math.floor(m.maxHp * 0.2))
        : 1;
      return { ...m, hp, ko: false };
    }
    return { ...m, hp: m.maxHp, ko: false };
  });
}

/** Rebuild stats at a new floor; optional full heal between fights. */
export function refreshPartyForFloor(
  members,
  floor,
  partySkillUnlocks,
  partyEquipment = {},
  { fullHeal = true } = {}
) {
  return members.map((m) => {
    const next = buildPartyMember(
      m.classKey,
      floor,
      partySkillUnlocks?.[m.classKey] ?? m.unlockedSkillIds
    );
    if (!next) return m;
    const hydrated = hydratePartyMember(
      {
        ...next,
        cooldowns: m.cooldowns ?? {},
        statuses: fullHeal ? {} : m.statuses ?? {},
        defendActive: false,
        partyBlock: false,
        reflect: null,
      },
      floor,
      partyEquipment?.[m.classKey]
    );
    if (fullHeal) {
      return { ...hydrated, hp: hydrated.maxHp, ko: false };
    }
    const ratio = m.maxHp > 0 ? m.hp / m.maxHp : 1;
    return {
      ...hydrated,
      hp: Math.max(1, Math.min(hydrated.maxHp, Math.ceil(hydrated.maxHp * ratio))),
      ko: false,
    };
  });
}

/** True when every member is KO. */
export function isPartyWiped(members) {
  return (members ?? []).every((m) => m.hp <= 0 || m.ko);
}
