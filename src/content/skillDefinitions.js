/**
 * Party Mode v1 skill + passive data contract.
 *
 * Cooldowns and unlock floors are LOCKED per docs/party-mode-canonical-handoff.md.
 * This module is pure data + small selectors so it can be imported by both the
 * Vite app (BossRush.jsx) and the Node balance test (tools/party-skill-balance-test.mjs).
 *
 * Confirmed defaults applied:
 * - War Cry unlock floor = 1 (export value; "party 4" = 4-turn duration)
 * - Mend/Light name collisions renamed (Restore / Prayer of Mending / Arcane Light / Holy Light)
 * - Shadow Mark: Rogue skills deal 2x vs Marked (no party-wide amp in v1)
 * - Mage/Cleric passive unlock floors: 101 / 150 / 200 / 250 spread
 *
 * Tags:
 * - ignoreCooldownReduction: Wind/Regroup/Speedster cannot lower these
 * - noWindReduction: specifically immune to Wind (Forbidden Magic)
 */

export const POST_DOGGOD = "post_doggod";

/** Skill effect type vocabulary used by the combat resolver. */
export const SKILL_TYPES = {
  DAMAGE: "damage",
  DAMAGE_DOT: "damage_dot",
  HEAL: "heal",
  PARTY_HEAL: "party_heal",
  PARTY_BUFF: "party_buff",
  PARTY_BLOCK: "party_block",
  SELF_BUFF: "self_buff",
  STATUS: "status",
  DEBUFF: "debuff",
  REFLECT: "reflect",
  CLEANSE: "cleanse",
  CD_MANIP: "cd_manip",
  LIFESTEAL: "lifesteal",
  MARK: "mark",
  FINISHER: "finisher",
  SACRIFICE: "sacrifice",
  ECONOMY: "economy",
  MULTI_STATUS: "multi_status",
};

export const PARTY_SKILLS_V1 = {
  warrior: [
    { id: "power_strike", name: "Power Strike", icon: "💥", cooldown: 2, unlock: 1, type: "damage", multiplier: 2.25 },
    { id: "war_cry", name: "War Cry", icon: "📯", cooldown: 5, unlock: 1, type: "party_buff", effect: "atk_up", potency: 0.2, duration: 4 },
    { id: "shield_party", name: "Shield Party", icon: "🛡️", cooldown: 9, unlock: 9, type: "party_block", selfCdPenalty: 2, tags: ["ignoreCooldownReduction"] },
    { id: "rampart", name: "Rampart", icon: "🧱", cooldown: 6, unlock: 21, type: "party_buff", effect: "def_up", potency: 0.2, duration: 4 },
    { id: "berserk", name: "Berserk", icon: "😡", cooldown: 8, unlock: 49, type: "status", effect: "berserk", duration: 3, accuracy: { normal: 1.0, miniBoss: 0.5, boss: 0.25 } },
    { id: "swordplay", name: "Swordplay", icon: "⚔️", cooldown: 6, unlock: 99, type: "damage", selfBuff: { effect: "atk_up", potency: 0.5, duration: 1 }, hits: [0.75, 0.75] },
    { id: "regroup", name: "Regroup", icon: "🔄", cooldown: 12, unlock: 200, type: "cd_manip", allyCdDelta: -1 },
    { id: "shieldstrike", name: "Shieldstrike", icon: "🛡️⚔️", cooldown: 1, unlock: 250, type: "damage", usesDefense: true, multiplier: 1.5, selfDebuff: { effect: "def_down", stacks: 1, duration: 2 } },
  ],
  mage: [
    { id: "fire", name: "Fire", icon: "🔥", cooldown: 1, unlock: 1, type: "damage_dot", multiplier: 1.1, applies: { effect: "burn", stacks: 1 } },
    { id: "ice", name: "Ice", icon: "❄️", cooldown: 3, unlock: 4, type: "damage", multiplier: 0.85, applies: { effect: "freeze", minTurns: 1, maxTurns: 3, bossMaxTurns: 1 } },
    { id: "restore", name: "Restore", icon: "💚", cooldown: 2, unlock: 9, type: "heal", healPercent: 0.2, target: "ally" },
    { id: "thunder", name: "Thunder", icon: "⚡", cooldown: 5, unlock: 19, type: "damage", multiplier: 2.25, allCdDelta: 1 },
    { id: "wind", name: "Wind", icon: "🌪️", cooldown: 4, unlock: 49, type: "damage", multiplier: 0.6, allyCdDelta: -1 },
    { id: "arcane_light", name: "Arcane Light", icon: "✨", cooldown: 6, unlock: 99, type: "damage", multiplier: 3, clericAllyCdDelta: 1 },
    { id: "dark", name: "Dark", icon: "🌑", cooldown: 8, unlock: 199, type: "damage", multiplier: 4, rogueAllyCdDelta: 1 },
    { id: "forbidden_magic", name: "Forbidden Magic", icon: "📕", cooldown: 14, unlock: POST_DOGGOD, type: "multi_status", multiplier: 1, applies: [{ effect: "poison", stacks: 1 }, { effect: "bleed", stacks: 1 }, { effect: "berserk", duration: 2 }, { effect: "burn", stacks: 1 }], tags: ["ignoreCooldownReduction", "noWindReduction"] },
  ],
  rogue: [
    { id: "pickpocket", name: "Pickpocket", icon: "💰", cooldown: 6, unlock: 1, type: "economy", oncePerBattle: true, winningsMult: 1.2, failChance: 0.2 },
    { id: "shiv", name: "Shiv", icon: "🔪", cooldown: 3, unlock: 1, type: "damage_dot", multiplier: 0.9, applies: { effect: "bleed", stacks: 1 } },
    { id: "crippling_cut", name: "Crippling Cut", icon: "🩸", cooldown: 4, unlock: 4, type: "damage", multiplier: 0.6, applies: { effect: "def_down", stacks: 1 } },
    { id: "venom_tip", name: "Venom Tip", icon: "🧪", cooldown: 3, unlock: 9, type: "damage_dot", multiplier: 1.0, applies: { effect: "poison", stacks: 1 } },
    { id: "shadow_mark", name: "Shadow Mark", icon: "🎯", cooldown: 8, unlock: 19, type: "mark", multiplier: 0.8, applies: { effect: "marked", duration: 3 }, rogueVsMarkedMult: 2 },
    { id: "smoke_bomb", name: "Smoke Bomb", icon: "💨", cooldown: 8, unlock: 49, type: "debuff", applies: { effect: "blind", enemyActions: 2 } },
    { id: "expose_weakness", name: "Expose Weakness", icon: "🔓", cooldown: 9, unlock: 99, type: "debuff", multiplier: 0.5, applies: { effect: "def_down", stacks: 2 }, bonusIfStatus: { effect: "atk_down", stacks: 1 } },
    { id: "execution_thread", name: "Execution Thread", icon: "🧵", cooldown: 10, unlock: 199, type: "finisher", multiplier: 1.8, perDebuffMult: 0.35, perDebuffCap: 1.4, bossPerDebuffCap: 1.0 },
    { id: "death_spiral", name: "Death Spiral", icon: "🌀", cooldown: 12, unlock: 250, type: "finisher", perStackMult: 0.75, totalMultCap: 5, consumesEnemyStatuses: true, reapplies: { effect: "bleed", stacks: 1 } },
  ],
  cleric: [
    { id: "nosferatu", name: "Nosferatu", icon: "🦇", cooldown: 2, unlock: 1, type: "lifesteal", multiplier: 1, healPercentOfDamage: 0.5 },
    { id: "toxic_prayer", name: "Toxic Prayer", icon: "☠️", cooldown: 2, unlock: 1, type: "debuff", applies: { effect: "poison", stacks: 1 } },
    { id: "cure", name: "Cure", icon: "🙏", cooldown: 3, unlock: 4, type: "cleanse", target: "ally" },
    { id: "aegis_shield", name: "Aegis Shield", icon: "🪞", cooldown: 5, unlock: 9, type: "reflect", reflectPercent: 0.5, duration: 1, target: "ally" },
    { id: "wound_care", name: "Wound Care", icon: "💊", cooldown: 4, unlock: 19, type: "heal", healPercent: 0.5, target: "ally" },
    { id: "prayer_of_mending", name: "Prayer of Mending", icon: "🌟", cooldown: 7, unlock: 49, type: "party_heal", healPercent: 0.33 },
    { id: "holy_flame", name: "Holy Flame", icon: "🔥", cooldown: 2, unlock: 99, type: "damage", multiplier: 1, bonusVsTags: { monster: 2, hell: 2 } },
    { id: "holy_light", name: "Holy Light", icon: "🌅", cooldown: 7, unlock: 199, type: "damage", multiplier: 3.5, lightCdDelta: 2, clericAllyCdDelta: 1, bonusVsTags: { monster: 2, hell: 2 }, tags: ["light"] },
    { id: "fallen_angel", name: "Fallen Angel", icon: "😇", cooldown: 16, unlock: 250, type: "sacrifice", selfHpLossPercent: 0.99, fullPartyHeal: true, cleanseParty: true, resetAllyCooldowns: true, tags: ["ignoreCooldownReduction"] },
  ],
};

export const PARTY_PASSIVES_V1 = {
  warrior: [
    { id: "dog_hunter", name: "Dog Hunter", unlock: 101, effect: "damage_vs_human_dogs", value: 0.25 },
    { id: "training", name: "Training", unlock: 200, effect: "crit_per_boss", value: 0.005, critMult: 1.75 },
    { id: "tough_skin", name: "Tough Skin", unlock: 250, effect: "def_up", value: 0.1 },
    { id: "master_warrior", name: "Master Warrior", unlock: POST_DOGGOD, effect: "global_per_boss", value: 0.01 },
  ],
  mage: [
    { id: "tome_of_fire", name: "Tome of Fire", unlock: 101, effect: "burn_double" },
    { id: "tome_of_ice", name: "Tome of Ice", unlock: 150, effect: "ice_double_freeze_one", toggleable: true },
    { id: "tome_of_flight", name: "Tome of Flight", unlock: 200, effect: "wind_zero_cd_double" },
    { id: "providence", name: "Providence", unlock: 250, effect: "power_up_cd_up", powerValue: 0.2, cdPenalty: 1 },
  ],
  rogue: [
    { id: "mug", name: "Mug", unlock: 200, effect: "pickpocket_attack", multiplier: 0.8 },
    { id: "speedster", name: "Speedster", unlock: 250, effect: "rogue_cd_reduction", value: 1 },
    { id: "master_rogue", name: "Master Rogue", unlock: POST_DOGGOD, effect: "pickpocket_max", winningsMult: 1.4, failChance: 0 },
  ],
  cleric: [
    { id: "staff_of_healing", name: "Staff of Healing", unlock: 101, effect: "heal_potency", value: 1.25 },
    { id: "holy_aura", name: "Holy Aura", unlock: 150, effect: "zone_combat_mod" },
    { id: "staff_of_life", name: "Staff of Life", unlock: 200, effect: "boss_revive_percent", value: 0.2, replacesDefaultRevive: true },
    { id: "master_cleric", name: "Master Cleric", unlock: POST_DOGGOD, effect: "overheal", value: 1.1 },
  ],
};

/** Numeric unlock floors only (POST_DOGGOD excluded; handled by trophy flag). */
export function getSkillUnlockFloor(skill) {
  return typeof skill.unlock === "number" ? skill.unlock : Infinity;
}

/** Skill ids unlockable at or below a given floor for a class. */
export function skillIdsUnlockedByFloor(classKey, floor) {
  const list = PARTY_SKILLS_V1[classKey] ?? [];
  return list
    .filter((s) => typeof s.unlock === "number" && s.unlock <= floor)
    .map((s) => s.id);
}

/** Passive ids unlockable at or below a given floor for a class. */
export function passiveIdsUnlockedByFloor(classKey, floor) {
  const list = PARTY_PASSIVES_V1[classKey] ?? [];
  return list
    .filter((p) => typeof p.unlock === "number" && p.unlock <= floor)
    .map((p) => p.id);
}

/** Lookup a skill definition by class + id. */
export function getPartySkill(classKey, skillId) {
  return (PARTY_SKILLS_V1[classKey] ?? []).find((s) => s.id === skillId) ?? null;
}

export function hasTag(skill, tag) {
  return Array.isArray(skill?.tags) && skill.tags.includes(tag);
}
