/**
 * FF1-style turn helpers: speed order, fight damage, enemy specials, auto hints.
 */

export function compareSpeed(aSpd, bSpd, aIsPlayer = false) {
  if (aSpd !== bSpd) return bSpd - aSpd;
  return aIsPlayer ? -1 : 1;
}

/** Who acts first this round: "player" | "enemy" */
export function firstActor(playerSpeed, enemySpeed) {
  return compareSpeed(playerSpeed, enemySpeed, true) <= 0 ? "player" : "enemy";
}

export function rollFightDamage(attack, variance, isCrit, critMultiplier) {
  const raw = Math.max(1, attack + randomVariance(variance));
  return {
    damage: Math.round(isCrit ? raw * critMultiplier : raw),
    isCrit,
  };
}

function randomVariance(variance) {
  if (!variance) return 0;
  return Math.floor(Math.random() * (variance * 2 + 1)) - variance;
}

export function rollEnemySpecial(template) {
  if (!template?.special) return { rawAttackMult: 1, specialName: null };
  if (Math.random() >= template.special.chance) {
    return { rawAttackMult: 1, specialName: null };
  }
  return {
    rawAttackMult: template.special.damageMult,
    specialName: template.special.name,
  };
}

export function calcDamageToPlayer(
  rawAttack,
  { hasBlockBuff, defense, blockReduction, blockReductionOverride }
) {
  const raw = Math.max(1, rawAttack);
  const wasBlocked = Boolean(hasBlockBuff);
  let afterBlock = raw;
  if (wasBlocked) {
    const mult =
      blockReductionOverride != null ? blockReductionOverride : blockReduction;
    afterBlock = Math.max(1, Math.floor(raw * mult));
  }
  const damage = Math.max(1, afterBlock - (defense ?? 0));
  return { damage, wasBlocked, rawAttack: raw, afterBlock, defense: defense ?? 0 };
}

export function formatPlayerDamageLog(enemy, result, specialName) {
  const { damage, wasBlocked, rawAttack, afterBlock, defense } = result;
  const who = `${enemy.icon} ${enemy.name}`;
  const lead = specialName ? `${who} uses ${specialName}! ` : `${who} `;
  if (wasBlocked) {
    let chain = `${rawAttack} → ${afterBlock}`;
    if (defense > 0) chain += ` → ${damage}`;
    return `${lead}attacks! Blocked: ${chain} dmg`;
  }
  if (defense > 0 && rawAttack > damage) {
    return `${lead}strikes! ${rawAttack} → ${damage} dmg (DEF ${defense})`;
  }
  return `${lead}strikes for ${damage} damage!`;
}

/** Rough max damage enemy may deal (for auto-loss interrupt). */
export function estimateMaxEnemyHit(enemy, template) {
  const mult = template?.special?.damageMult ?? 1.55;
  return Math.max(1, Math.round(enemy.attack * mult));
}

export function wouldAutoLose(player, enemy, template, blockReduction) {
  if (!player || !enemy) return false;
  const maxHit = estimateMaxEnemyHit(enemy, template);
  const result = calcDamageToPlayer(maxHit, {
    hasBlockBuff: player.hasBlockBuff,
    defense: player.defense,
    blockReduction,
    blockReductionOverride: player.blockReductionNext,
  });
  return player.hp <= result.damage * 2;
}

const DAMAGE_SKILL_TYPES = [
  "damage",
  "damage_freeze",
  "damage_afterburn",
  "damage_steal",
  "damage_lifesteal",
];

/** Skill is off cooldown and castable (cooldown-only magic). */
export function isSkillReady(skill) {
  return skill && skill.currentCooldown <= 0;
}

/** Pick best ready skill for auto-magic (lowest index ready skill). */
export function pickAutoSkill(skills, _currentSp, options = {}) {
  if (!skills?.length) return null;
  const ready = (s) => isSkillReady(s);
  if (options.preferDamage) {
    for (let i = 0; i < skills.length; i++) {
      const s = skills[i];
      if (DAMAGE_SKILL_TYPES.includes(s.type) && ready(s)) return i;
    }
  }
  for (let i = 0; i < skills.length; i++) {
    if (ready(skills[i])) return i;
  }
  return null;
}

export function hasAnyReadySkill(skills) {
  return skills?.some((s) => isSkillReady(s)) ?? false;
}
