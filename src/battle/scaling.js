/**
 * Floor scaling, boss detection, and shop inflation curves (floor 100 target).
 *
 * Phase 2+: capstone skills per combo at floor 500 on that combo's bestFloorReached.
 * Phase 3: quad class "omnipotent" when all four bases reach floor 1000.
 */

export const SCALING_CONFIG = {
  displayMilestone: 100,
  ultimateMilestone: 1000,
  /** HUD label (shows long-run goal). */
  maxFloorLabel: 1000,
  comboUnlockFloor: 100,
  mageKnightUnlockFloor: 100,
  comboShopPriceMult: 3,
  mageKnightShopPriceMult: 3,
  poisonTickPercent: 0.3334,
  poisonMaxTurns: 3,
  lifestealBase: 0.33,
  lifestealCap: 0.5,
  lifestealStepEvery: 10,
  lifestealStep: 0.03,
  bossEveryNFloors: 10,
  megaBossRound: 100,

  shopMaxBoost: 100,
  comboShopMaxBoost: 200,
  maxSkillLevel: 100,
  comboMaxSkillLevel: 200,

  hpPriceBase: 120,
  hpPriceGrowth: 1.48,
  atkPriceBase: 200,
  atkPriceGrowth: 1.55,
  defPriceBase: 150,
  defPriceGrowth: 1.5,
  spPriceBase: 160,
  spPriceGrowth: 1.52,
  skillPriceBase: 180,
  skillPriceGrowth: 1.54,

  /** Per-purchase stat jump at tier n (1-based). */
  hpDelta: (tier) => 2 * tier,
  atkDelta: (tier) => 5 * tier,
  defDelta: (tier) => Math.max(1, tier),
  spDelta: (tier) => 1,

  enemyIndexRate: 0.75,
  enemyScalePower: 1.85,
  enemyScaleDivisor: 28,
  bossHpMult: 1.65,
  bossAtkMult: 1.35,
  bossRewardMult: 1.5,
};

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function isBossRound(round) {
  return (
    round > 0 &&
    (round % SCALING_CONFIG.bossEveryNFloors === 0 ||
      round === SCALING_CONFIG.megaBossRound)
  );
}

export function exponentialPrice(base, growth, level) {
  return Math.round(base * growth ** level);
}

export function hpPrice(level) {
  return exponentialPrice(
    SCALING_CONFIG.hpPriceBase,
    SCALING_CONFIG.hpPriceGrowth,
    level
  );
}

export function atkPrice(level) {
  return exponentialPrice(
    SCALING_CONFIG.atkPriceBase,
    SCALING_CONFIG.atkPriceGrowth,
    level
  );
}

export function defPrice(level) {
  return exponentialPrice(
    SCALING_CONFIG.defPriceBase,
    SCALING_CONFIG.defPriceGrowth,
    level
  );
}

export function spPrice(level) {
  return exponentialPrice(
    SCALING_CONFIG.spPriceBase,
    SCALING_CONFIG.spPriceGrowth,
    level
  );
}

export function skillPrice(level) {
  return exponentialPrice(
    SCALING_CONFIG.skillPriceBase,
    SCALING_CONFIG.skillPriceGrowth,
    level
  );
}

/** Camp weapon tier prices: starter free, then fixed prestige ladder (same all classes). */
export const WEAPON_FIXED_PRICES = [0, 100_000, 500_000, 1_000_000, 10_000_000];

export function weaponTierPrice(_classKey, tierIndex) {
  if (tierIndex < 0 || tierIndex >= WEAPON_FIXED_PRICES.length) return 0;
  return WEAPON_FIXED_PRICES[tierIndex];
}

/** Total HP bonus from n camp purchases. */
export function totalHpBonus(purchaseCount) {
  let sum = 0;
  for (let i = 1; i <= purchaseCount; i++) sum += SCALING_CONFIG.hpDelta(i);
  return sum;
}

export function totalAtkBonus(purchaseCount) {
  let sum = 0;
  for (let i = 1; i <= purchaseCount; i++) sum += SCALING_CONFIG.atkDelta(i);
  return sum;
}

export function totalDefBonus(purchaseCount) {
  let sum = 0;
  for (let i = 1; i <= purchaseCount; i++) sum += SCALING_CONFIG.defDelta(i);
  return sum;
}

export function totalSpBonus(purchaseCount) {
  let sum = 0;
  for (let i = 1; i <= purchaseCount; i++) sum += SCALING_CONFIG.spDelta(i);
  return sum;
}

export function nextHpDelta(currentLevel) {
  return SCALING_CONFIG.hpDelta(currentLevel + 1);
}

export function nextAtkDelta(currentLevel) {
  return SCALING_CONFIG.atkDelta(currentLevel + 1);
}

export function nextDefDelta(currentLevel) {
  return SCALING_CONFIG.defDelta(currentLevel + 1);
}

export function nextSpDelta(currentLevel) {
  return SCALING_CONFIG.spDelta(currentLevel + 1);
}

/** Round-based enemy HP/ATK scale — ramps toward floor 100. */
export function getEnemyRoundScale(round) {
  const r = Math.max(1, round);
  const base = 1 + (r / SCALING_CONFIG.enemyScaleDivisor) ** SCALING_CONFIG.enemyScalePower;
  const lateBump = r > 50 ? 1 + (r - 50) * 0.02 : 1;
  return base * lateBump;
}

export function getEnemyPoolIndex(round, enemyCount) {
  return clamp(
    Math.floor((round - 1) * SCALING_CONFIG.enemyIndexRate),
    0,
    enemyCount - 1
  );
}

export function buildEnemy(round, enemies, gameConfig = {}) {
  const index = getEnemyPoolIndex(round, enemies.length);
  const template = enemies[index];
  let scale = getEnemyRoundScale(round);
  const boss = isBossRound(round);

  if (boss) {
    scale *= SCALING_CONFIG.bossHpMult;
  }

  let attack = Math.max(1, Math.round(template.attack * scale));
  if (boss) {
    attack = Math.max(1, Math.round(attack * SCALING_CONFIG.bossAtkMult));
  }

  let reward = Math.round(template.reward * scale);
  if (boss) {
    reward = Math.round(reward * SCALING_CONFIG.bossRewardMult);
  }

  const speed = template.speed ?? 5;

  return {
    ...template,
    poolIndex: index,
    hp: Math.round(template.maxHp * scale),
    maxHp: Math.round(template.maxHp * scale),
    attack,
    reward,
    speed,
    isBoss: boss,
    freezeTurnsLeft: 0,
    poisonTurnsLeft: 0,
  };
}

export function comboShopPrice(basePrice) {
  return Math.round(basePrice * SCALING_CONFIG.comboShopPriceMult);
}

/** @deprecated use comboShopPrice */
export function mageKnightPrice(basePrice) {
  return comboShopPrice(basePrice);
}

export function lifestealPercent(skillLevel) {
  const level = Math.max(0, Number(skillLevel) || 0);
  const bonus =
    Math.floor(level / SCALING_CONFIG.lifestealStepEvery) * SCALING_CONFIG.lifestealStep;
  return Math.min(SCALING_CONFIG.lifestealCap, SCALING_CONFIG.lifestealBase + bonus);
}

export function poisonTickDamage(enemyMaxHp) {
  return Math.max(1, Math.ceil(enemyMaxHp * SCALING_CONFIG.poisonTickPercent));
}

export function hasDefeatedBoss(classMeta, floor) {
  return Array.isArray(classMeta?.bossesDefeated) && classMeta.bossesDefeated.includes(floor);
}

/** Backfill boss ledger from best floor (older saves may lack bossesDefeated). */
export function syncBossesDefeatedFromBestFloor(classMeta) {
  if (!classMeta) return classMeta;
  const best = Math.max(0, Number(classMeta.bestFloorReached) || 0);
  const defeated = new Set(
    Array.isArray(classMeta.bossesDefeated)
      ? classMeta.bossesDefeated.map(Number).filter((n) => n > 0)
      : []
  );
  for (let floor = SCALING_CONFIG.bossEveryNFloors; floor <= best; floor += SCALING_CONFIG.bossEveryNFloors) {
    if (isBossRound(floor)) defeated.add(floor);
  }
  if (best >= SCALING_CONFIG.megaBossRound && isBossRound(SCALING_CONFIG.megaBossRound)) {
    defeated.add(SCALING_CONFIG.megaBossRound);
  }
  const bossesDefeated = [...defeated].sort((a, b) => a - b);
  return { ...classMeta, bossesDefeated };
}

export function canAutoSkipBoss(save, classKey, round) {
  if (!isBossRound(round) || !classKey) return false;
  const meta = syncBossesDefeatedFromBestFloor(save?.classes?.[classKey]);
  return hasDefeatedBoss(meta, round);
}

/** Fire afterburn chip when the next enemy enters (scales with Fire camp level). */
export function afterburnChip(fireSkillLevel, enemyMaxHp) {
  const level = Math.max(0, Number(fireSkillLevel) || 0);
  const raw = 1 + Math.floor(level / 10);
  const cap = Math.max(1, Math.ceil(enemyMaxHp * 0.05));
  return Math.min(raw, cap);
}

/** How many consecutive enemy spawns take entry afterburn (Fire camp level). */
export function afterburnCarriers(fireSkillLevel) {
  const level = Math.max(0, Number(fireSkillLevel) || 0);
  return 1 + Math.floor(level / 10);
}
