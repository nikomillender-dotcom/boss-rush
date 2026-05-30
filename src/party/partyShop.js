/**
 * Party camp shop: weapons, armor, skill potency at 0.4× solo-equivalent prices.
 */

import { WEAPON_FIXED_PRICES } from "../battle/scaling.js";
import { getPartySkill, PARTY_SKILLS_V1 } from "../content/skillDefinitions.js";
import { POTENCY_MAX_LEVEL } from "./partyEquipment.js";

export const PARTY_SHOP_PRICE_MULT = 0.4;

export const PARTY_ARMOR_PRICES = [0, 40_000, 200_000, 400_000, 800_000];

export function partyShopPrice(basePrice) {
  return Math.round(Math.max(0, basePrice) * PARTY_SHOP_PRICE_MULT);
}

export function weaponUpgradePrice(classKey, nextTier) {
  if (nextTier < 0 || nextTier >= WEAPON_FIXED_PRICES.length) return 0;
  return partyShopPrice(WEAPON_FIXED_PRICES[nextTier]);
}

export function armorUpgradePrice(nextTier) {
  if (nextTier < 0 || nextTier >= PARTY_ARMOR_PRICES.length) return 0;
  return partyShopPrice(PARTY_ARMOR_PRICES[nextTier]);
}

/** Potency upgrade: scales with skill CD and current level. */
export function potencyUpgradePrice(skill, currentLevel) {
  if (!skill || currentLevel >= POTENCY_MAX_LEVEL) return 0;
  const base = 80 + skill.cooldown * 40 + currentLevel * 120;
  return partyShopPrice(base);
}

export function listPotencyOffers(classKey, unlockedIds, equipment) {
  const skills = PARTY_SKILLS_V1[classKey] ?? [];
  const unlocked = new Set(unlockedIds ?? []);
  return skills
    .filter((s) => unlocked.has(s.id))
    .map((s) => {
      const level = equipment?.skillPotency?.[s.id] ?? 0;
      return {
        skillId: s.id,
        name: s.name,
        icon: s.icon,
        level,
        maxed: level >= POTENCY_MAX_LEVEL,
        price: potencyUpgradePrice(s, level),
      };
    })
    .filter((o) => !o.maxed);
}

export function canAfford(wallet, price) {
  return price > 0 && wallet >= price;
}
