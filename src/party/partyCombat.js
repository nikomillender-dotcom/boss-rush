/**
 * Party Mode skill + fight resolver (pure functions).
 */

import { rollFightDamage } from "../battle/ff1TurnResolver.js";
import {
  applyStatus,
  computeDotDamage,
  countUniqueDebuffs,
  rollCrowdControl,
  statMultiplier,
  tickDurations,
  hasStatus,
} from "../combat/statusEffects.js";
import { getPartySkill, hasTag } from "../content/skillDefinitions.js";
import { potencyMultiplier, getPotencyLevel } from "./partyEquipment.js";
import { enemyResistanceTier } from "./partyEnemyAI.js";

export function skillAbbrev(name) {
  const clean = String(name ?? "").replace(/[^a-zA-Z]/g, "");
  return clean.slice(0, 3).toUpperCase() || "???";
}

export function initCooldowns(classKey, unlockedIds) {
  const cds = {};
  for (const id of unlockedIds ?? []) {
    cds[id] = 0;
  }
  return cds;
}

export function isSkillReady(member, skillId) {
  return (member.cooldowns?.[skillId] ?? 0) <= 0;
}

export function setSkillCooldown(member, skill, extra = 0) {
  const base = skill.cooldown + extra;
  return {
    ...member,
    cooldowns: { ...member.cooldowns, [skill.id]: base },
  };
}

export function tickMemberCooldowns(member) {
  const cds = { ...member.cooldowns };
  for (const key of Object.keys(cds)) {
    if (cds[key] > 0) cds[key] -= 1;
  }
  return { ...member, cooldowns: cds };
}

export function tickPartyCooldowns(members) {
  return members.map(tickMemberCooldowns);
}

export function tickPartyBuffs(buffs) {
  return tickDurations(buffs ?? {});
}

function potencyFor(member, skill, equipment) {
  const level = getPotencyLevel(equipment, skill.id);
  return potencyMultiplier(level);
}

function effectiveAtk(member, partyBuffs, enemyStatuses) {
  const selfMult = statMultiplier(member.statuses, "atk");
  const partyMult = statMultiplier(partyBuffs, "atk");
  return Math.max(1, Math.round(member.attack * selfMult * partyMult));
}

function calcSkillDamage(attacker, skill, enemy, partyBuffs, equipment, { hitMult = 1 } = {}) {
  const pot = potencyFor(attacker, skill, equipment);
  const tier = enemyResistanceTier(enemy);
  const enemySts = enemy.statuses ?? {};
  let mult = (skill.multiplier ?? 1) * pot * hitMult;
  if (skill.usesDefense) {
    return Math.max(1, Math.round(attacker.defense * mult));
  }
  if (skill.type === "finisher" && skill.id === "execution_thread") {
    const debuffs = countUniqueDebuffs(enemySts);
    const cap =
      tier === "boss" || tier === "doggod"
        ? (skill.bossPerDebuffCap ?? 1)
        : (skill.perDebuffCap ?? 1.4);
    mult *= 1 + Math.min(cap, debuffs * (skill.perDebuffMult ?? 0.35));
  }
  if (skill.type === "finisher" && skill.id === "death_spiral") {
    let stacks = 0;
    for (const entry of Object.values(enemySts)) {
      if ((entry?.stacks ?? 0) > 0) stacks += entry.stacks;
    }
    mult *= Math.min(skill.totalMultCap ?? 5, 1 + stacks * (skill.perStackMult ?? 0.75));
  }
  if (skill.rogueVsMarkedMult && hasStatus(enemySts, "marked")) {
    mult *= skill.rogueVsMarkedMult;
  }
  const atk = effectiveAtk(attacker, partyBuffs, enemySts);
  return Math.max(1, Math.round(atk * mult));
}

/** Doggod takes 25% less damage from party hits (canonical). */
export function applyPartyEnemyDamage(enemy, rawDamage) {
  if (!enemy?.isDoggod || rawDamage <= 0) return rawDamage;
  const reduction = enemy.damageReduction ?? 0.25;
  return Math.max(1, Math.round(rawDamage * (1 - reduction)));
}

function applyToEnemy(enemy, damage, statusesPatch) {
  const finalDamage = applyPartyEnemyDamage(enemy, damage);
  const hp = Math.max(0, enemy.hp - finalDamage);
  let statuses = enemy.statuses ?? {};
  for (const patch of statusesPatch) {
    if (!patch) continue;
    const landed = patch.landed !== false;
    if (!landed) continue;
    statuses = applyStatus(statuses, patch.effect, {
      stacks: patch.stacks ?? 1,
      duration: patch.duration,
    });
  }
  return { ...enemy, hp, statuses };
}

function tryApplyStatus(enemy, spec, tier, rng = Math.random) {
  if (!spec?.effect) return { landed: false };
  const accuracy = spec.accuracy?.[tier] ?? spec.accuracy?.normal ?? 1;
  const landed = rollCrowdControl(spec.effect, tier, accuracy, rng);
  return { ...spec, landed };
}

/** All unlocked skills with cooldown state (for party command dock). */
export function listPartySkills(member) {
  return (member.unlockedSkillIds ?? [])
    .map((id) => getPartySkill(member.classKey, id))
    .filter(Boolean)
    .map((s) => {
      const cooldownLeft = member.cooldowns?.[s.id] ?? 0;
      return {
        id: s.id,
        name: s.name,
        icon: s.icon,
        cooldown: s.cooldown,
        cooldownLeft,
        ready: cooldownLeft <= 0,
        description: s.description,
      };
    });
}

export function listReadySkills(member, equipment) {
  void equipment;
  return listPartySkills(member).filter((s) => s.ready);
}

export function needsAllyTarget(skill) {
  return (
    skill?.target === "ally" ||
    skill?.type === "heal" ||
    skill?.type === "reflect" ||
    skill?.type === "cleanse"
  );
}

/**
 * Basic fight command (respects enemy berserk only for enemy — player fight normal).
 */
export function executePartyFight({
  attacker,
  enemy,
  partyBuffs,
  equipment,
  rng = Math.random,
}) {
  const atk = effectiveAtk(attacker, partyBuffs, enemy.statuses ?? {});
  const { damage, isCrit } = rollFightDamage(atk, 2, rng() < 0.08, 1.75);
  let mult = 1;
  if (attacker.classKey === "rogue" && hasStatus(enemy.statuses, "marked")) {
    mult = 2;
  }
  const finalDamage = Math.max(1, Math.round(damage * mult));
  const nextEnemy = applyToEnemy(enemy, finalDamage, []);
  const logs = [
    `${attacker.classKey} fights for ${finalDamage}${isCrit ? " CRIT" : ""}`,
  ];
  return { enemy: nextEnemy, logs, killed: nextEnemy.hp <= 0 };
}

export function executePartyDefend(attacker) {
  return {
    member: { ...attacker, defendActive: true },
    logs: [`${attacker.classKey} defends`],
  };
}

/**
 * Execute a party skill. Returns updated state slices + log lines.
 */
export function executePartySkill({
  skill,
  casterIndex,
  members,
  enemy,
  partyBuffs = {},
  targetIndex = null,
  equipmentByClass = {},
  floor = 1,
  battleFlags = {},
  rng = Math.random,
}) {
  const caster = members[casterIndex];
  if (!caster || !skill) return { members, enemy, partyBuffs, logs: [], battleFlags };

  const tier = enemyResistanceTier(enemy);
  const resistKey = tier === "miniBoss" ? "miniBoss" : tier;
  const equip = equipmentByClass[caster.classKey] ?? {};
  let nextMembers = [...members];
  let nextEnemy = { ...enemy };
  let nextBuffs = { ...partyBuffs };
  const logs = [];
  let nextFlags = { ...battleFlags };
  let runCoinBonus = 0;

  const applyCd = (m, sk, extra = 0) => setSkillCooldown(m, sk, extra);

  const damageSkill = (multOverride) => {
    const dmg = calcSkillDamage(caster, { ...skill, multiplier: multOverride ?? skill.multiplier }, nextEnemy, nextBuffs, equip);
    const patches = [];
    if (skill.applies) {
      const specs = Array.isArray(skill.applies) ? skill.applies : [skill.applies];
      for (const spec of specs) {
        patches.push(tryApplyStatus(nextEnemy, spec, resistKey, rng));
      }
    }
    nextEnemy = applyToEnemy(nextEnemy, dmg, patches);
    logs.push(`${skill.icon} ${skill.name} — ${dmg} damage`);
    return dmg;
  };

  switch (skill.type) {
    case "damage": {
      if (skill.hits) {
        let total = 0;
        for (const hitMult of skill.hits) {
          const dmg = calcSkillDamage(caster, skill, nextEnemy, nextBuffs, equip, { hitMult });
          nextEnemy = applyToEnemy(nextEnemy, dmg, []);
          total += dmg;
        }
        logs.push(`${skill.name} — ${total} total`);
      } else {
        damageSkill();
      }
      if (skill.selfBuff) {
        const m = nextMembers[casterIndex];
        nextMembers[casterIndex] = {
          ...m,
          statuses: applyStatus(m.statuses, skill.selfBuff.effect, {
            stacks: 1,
            duration: skill.selfBuff.duration,
          }),
        };
      }
      if (skill.selfDebuff) {
        const m = nextMembers[casterIndex];
        nextMembers[casterIndex] = {
          ...m,
          statuses: applyStatus(m.statuses, skill.selfDebuff.effect, {
            stacks: skill.selfDebuff.stacks ?? 1,
            duration: skill.selfDebuff.duration,
          }),
        };
      }
      break;
    }
    case "damage_dot":
    case "debuff":
    case "mark": {
      damageSkill();
      if (skill.applies?.effect === "blind") {
        nextEnemy = {
          ...nextEnemy,
          blindActionsLeft: Math.max(
            nextEnemy.blindActionsLeft ?? 0,
            skill.applies.enemyActions ?? 2
          ),
        };
      }
      if (skill.bonusIfStatus && countUniqueDebuffs(nextEnemy.statuses) > 0) {
        const bonus = skill.bonusIfStatus;
        nextEnemy = {
          ...nextEnemy,
          statuses: applyStatus(nextEnemy.statuses, bonus.effect, {
            stacks: bonus.stacks ?? 1,
          }),
        };
      }
      break;
    }
    case "lifesteal": {
      const dmg = damageSkill();
      const heal = Math.floor(dmg * (skill.healPercentOfDamage ?? 0.5));
      const m = nextMembers[casterIndex];
      nextMembers[casterIndex] = {
        ...m,
        hp: Math.min(m.maxHp, m.hp + heal),
      };
      logs.push(`Nosferatu heals ${heal} HP`);
      break;
    }
    case "heal": {
      const idx = targetIndex ?? casterIndex;
      const target = nextMembers[idx];
      const heal = Math.max(1, Math.floor(target.maxHp * (skill.healPercent ?? 0.2) * potencyFor(caster, skill, equip)));
      nextMembers[idx] = { ...target, hp: Math.min(target.maxHp, target.hp + heal), ko: false };
      logs.push(`${skill.name} heals ${target.classKey} for ${heal}`);
      break;
    }
    case "party_heal": {
      nextMembers = nextMembers.map((m) => {
        const heal = Math.max(1, Math.floor(m.maxHp * (skill.healPercent ?? 0.33) * potencyFor(caster, skill, equip)));
        return { ...m, hp: Math.min(m.maxHp, m.hp + heal), ko: false };
      });
      logs.push(`${skill.name} heals the party`);
      break;
    }
    case "party_buff": {
      nextBuffs = applyStatus(nextBuffs, skill.effect, {
        stacks: 1,
        duration: skill.duration ?? 4,
      });
      logs.push(`${skill.name} — party ${skill.effect}`);
      break;
    }
    case "party_block": {
      nextMembers = nextMembers.map((m) => ({ ...m, partyBlock: true }));
      const pen = skill.selfCdPenalty ?? 0;
      nextMembers[casterIndex] = applyCd(nextMembers[casterIndex], skill, pen);
      logs.push(`Shield Party blocks the next hit (+${pen} CD on Warrior skills)`);
      break;
    }
    case "reflect": {
      const idx = targetIndex ?? casterIndex;
      const target = nextMembers[idx];
      nextMembers[idx] = {
        ...target,
        reflect: { percent: skill.reflectPercent ?? 0.5, turns: skill.duration ?? 1 },
      };
      logs.push(`Aegis on ${target.classKey}`);
      break;
    }
    case "cleanse": {
      const idx = targetIndex ?? casterIndex;
      nextMembers[idx] = { ...nextMembers[idx], statuses: {} };
      logs.push(`Cure cleanses ${nextMembers[idx].classKey}`);
      break;
    }
    case "status": {
      const spec = tryApplyStatus(nextEnemy, skill, resistKey, rng);
      if (spec.landed) {
        nextEnemy = {
          ...nextEnemy,
          statuses: applyStatus(nextEnemy.statuses, skill.effect, { duration: skill.duration }),
        };
        logs.push(`${skill.name} applied`);
      } else {
        logs.push(`${skill.name} resisted`);
      }
      break;
    }
    case "multi_status": {
      const dmg = calcSkillDamage(caster, skill, nextEnemy, nextBuffs, equip);
      const patches = (skill.applies ?? []).map((spec) => tryApplyStatus(nextEnemy, spec, resistKey, rng));
      nextEnemy = applyToEnemy(nextEnemy, dmg, patches);
      logs.push(`Forbidden Magic — ${dmg} damage`);
      break;
    }
    case "finisher": {
      if (skill.consumesEnemyStatuses) {
        const sts = nextEnemy.statuses ?? {};
        let mult = 1;
        for (const entry of Object.values(sts)) {
          if ((entry?.stacks ?? 0) > 0) mult += skill.perStackMult ?? 0.75;
        }
        mult = Math.min(skill.totalMultCap ?? 5, mult);
        const dmg = calcSkillDamage(caster, skill, nextEnemy, nextBuffs, equip, { hitMult: mult });
        nextEnemy = applyToEnemy(nextEnemy, dmg, []);
        if (skill.reapplies) {
          nextEnemy = {
            ...nextEnemy,
            statuses: applyStatus({}, skill.reapplies.effect, { stacks: skill.reapplies.stacks ?? 1 }),
          };
        } else {
          nextEnemy = { ...nextEnemy, statuses: {} };
        }
        logs.push(`Death Spiral — ${dmg} damage`);
      } else {
        damageSkill();
      }
      break;
    }
    case "cd_manip": {
      nextMembers = nextMembers.map((m) => {
        let cds = { ...m.cooldowns };
        for (const key of Object.keys(cds)) {
          const sk = getPartySkill(m.classKey, key);
          if (sk && hasTag(sk, "ignoreCooldownReduction")) continue;
          cds[key] = Math.max(0, (cds[key] ?? 0) + (skill.allyCdDelta ?? -1));
        }
        return { ...m, cooldowns: cds };
      });
      logs.push(`Regroup — cooldowns ${skill.allyCdDelta ?? -1}`);
      break;
    }
    case "economy": {
      if (skill.oncePerBattle && nextFlags[`${caster.classKey}_${skill.id}`]) {
        logs.push(`${skill.name} already used this battle`);
        break;
      }
      if (rng() < (skill.failChance ?? 0)) {
        logs.push(`${skill.name} failed`);
      } else {
        runCoinBonus = Math.round((enemy.reward ?? 10) * ((skill.winningsMult ?? 1.2) - 1));
        logs.push(`${skill.name} +${runCoinBonus} run coins`);
      }
      nextFlags[`${caster.classKey}_${skill.id}`] = true;
      break;
    }
    case "sacrifice": {
      const loss = Math.max(1, Math.floor(caster.maxHp * (skill.selfHpLossPercent ?? 0.99)));
      nextMembers[casterIndex] = { ...caster, hp: Math.max(1, caster.hp - loss) };
      if (skill.fullPartyHeal) {
        nextMembers = nextMembers.map((m) => ({ ...m, hp: m.maxHp, ko: false, statuses: {} }));
      }
      if (skill.resetAllyCooldowns) {
        nextMembers = nextMembers.map((m) => {
          const cds = {};
          for (const k of Object.keys(m.cooldowns ?? {})) cds[k] = 0;
          return { ...m, cooldowns: cds };
        });
      }
      logs.push(`Fallen Angel — party restored`);
      break;
    }
    default:
      logs.push(`${skill.name} (unhandled)`);
  }

  // Thunder / Wind / Dark / Light CD side effects
  if (skill.allCdDelta) {
    nextMembers = nextMembers.map((m) => {
      const cds = { ...m.cooldowns };
      for (const k of Object.keys(cds)) cds[k] = Math.max(0, (cds[k] ?? 0) + skill.allCdDelta);
      return { ...m, cooldowns: cds };
    });
  }
  if (skill.allyCdDelta && skill.type !== "cd_manip") {
    nextMembers = nextMembers.map((m) => {
      const cds = { ...m.cooldowns };
      for (const k of Object.keys(cds)) {
        const sk = getPartySkill(m.classKey, k);
        if (sk && hasTag(sk, "noWindReduction")) continue;
        cds[k] = Math.max(0, (cds[k] ?? 0) + skill.allyCdDelta);
      }
      return { ...m, cooldowns: cds };
    });
  }
  if (skill.clericAllyCdDelta) {
    nextMembers = nextMembers.map((m) => {
      if (m.classKey !== "cleric") return m;
      const cds = { ...m.cooldowns };
      for (const k of Object.keys(cds)) cds[k] = Math.max(0, (cds[k] ?? 0) + skill.clericAllyCdDelta);
      return { ...m, cooldowns: cds };
    });
  }
  if (skill.rogueAllyCdDelta) {
    nextMembers = nextMembers.map((m) => {
      if (m.classKey !== "rogue") return m;
      const cds = { ...m.cooldowns };
      for (const k of Object.keys(cds)) cds[k] = Math.max(0, (cds[k] ?? 0) + skill.rogueAllyCdDelta);
      return { ...m, cooldowns: cds };
    });
  }

  if (skill.type !== "party_block") {
    nextMembers[casterIndex] = applyCd(nextMembers[casterIndex], skill);
  }

  return {
    members: nextMembers,
    enemy: nextEnemy,
    partyBuffs: nextBuffs,
    logs,
    battleFlags: nextFlags,
    runCoinBonus,
    killed: nextEnemy.hp <= 0,
  };
}

/** End-of-enemy-phase DOT on enemy. */
export function tickEnemyDot(enemy) {
  const tier = enemyResistanceTier(enemy);
  const dmg = computeDotDamage(enemy.statuses, enemy.maxHp, tier);
  if (dmg <= 0) return { enemy, log: null };
  const hp = Math.max(0, enemy.hp - dmg);
  return { enemy: { ...enemy, hp, statuses: tickDurations(enemy.statuses) }, log: `DOT ${dmg} on ${enemy.name}` };
}

/** Doggod regen at the start of its turn (2% max HP). */
export function tickDoggodRegen(enemy) {
  if (!enemy?.isDoggod || enemy.hp <= 0 || enemy.hp >= enemy.maxHp) {
    return { enemy, log: null };
  }
  const regen = Math.max(1, Math.floor(enemy.maxHp * (enemy.regenPercent ?? 0.02)));
  const hp = Math.min(enemy.maxHp, enemy.hp + regen);
  return { enemy: { ...enemy, hp }, log: `${enemy.name} regenerates ${regen} HP` };
}
