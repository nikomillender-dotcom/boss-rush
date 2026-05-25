/* global __APP_VERSION__, __BUILD_ID__ */

/**
 * ⚔️ BOSS RUSH — A turn-based RPG gauntlet
 *
 * Architecture overview:
 *   - GAME_CONFIG: all tunable numbers in one place
 *   - CLASSES / enemy catalog (src/content/enemyThemes.js): data-driven content
 *   - useGameEngine: custom hook with all game logic
 *   - Scene components: TitleScreen, ClassSelect, BattleScene, GameOverScreen
 *   - UI components: HUD, EnemyPanel, PlayerPanel, ActionButtons, SkillMenu, BattleLog, FloatingNumber
 *
 * Extending this game:
 *   - Add a class: add an entry to CLASSES with skills array
 *   - Add an enemy: add an entry to ENEMY_CATALOG in enemyThemes.js
 *   - Add a skill: add to a class's skills[] and add a handler in executeSkill()
 *   - Add a shop: create a ShopScreen component, add "shop" to scene state, trigger between rounds
 *   - Add equipment: extend player state with an `equipment` object, apply stat modifiers
 *   - Add sound: use Web Audio API or Howler.js, trigger in doAttack/doHeal/etc.
 *   - Add saving: serialize gameState to localStorage on win/round change
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  unlockAudio,
  playCampMusic,
  playThemeForRound,
  stopAllMusic,
  getMusicMuted,
  setMusicMuted,
} from "./src/audio/themeMusic.js";
import {
  SCALING_CONFIG,
  isBossRound,
  getEnemyPoolIndex,
  hpPrice,
  atkPrice,
  defPrice,
  spPrice,
  skillPrice,
  totalHpBonus,
  totalAtkBonus,
  totalDefBonus,
  nextHpDelta,
  nextAtkDelta,
  nextDefDelta,
  SCALING_CONFIG as BATTLE_SCALING,
  comboShopPrice,
  mageKnightPrice,
  canAutoSkipBoss,
  syncBossesDefeatedFromBestFloor,
  weaponTierPrice,
  afterburnChip,
  afterburnCarriers,
  lifestealPercent,
  poisonTickDamage,
} from "./src/battle/scaling.js";

import {
  rollFightDamage,
  rollEnemySpecial,
  calcDamageToPlayer,
  formatPlayerDamageLog,
  wouldAutoLose,
  pickAutoSkill,
  hasAnyReadySkill,
} from "./src/battle/ff1TurnResolver.js";
import { t, setLocale } from "./src/i18n/index.js";
import {
  resolveEnemyTemplate,
  buildEnemyFromCatalog,
  getCatalogEntry,
  getCatalogEntryByIndex,
  isFreePlayRound,
  isThemeTransitionFloor,
  getThemeBlock,
  getAllEnemySpriteKeys,
  FREE_PLAY_START,
} from "./src/content/enemyThemes.js";

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURATION — tweak these to balance the game
// ═══════════════════════════════════════════════════════════════════════

const GAME_CONFIG = {
  // Enemy scaling per round (softer early, harder after round 8)
  enemyScaleEarlyPerRound: 0.1,
  enemyScaleLatePerRound: 0.14,
  enemyScaleLateStartRound: 8,
  enemyBonusHpEveryRounds: 3,
  enemyBonusHpAfterRound: 10,
  enemyBonusHpPercent: 0.05,
  enemyIndexRate: 0.75,

  // Economy
  rewardMultiplier: 0.75,
  streakTiers: [
    [10, 8],
    [7, 6],
    [4, 3],
    [2, 2],
    [0, 1],
  ],

  // Combat
  attackVariance: 0,
  critMultiplier: 2.5,
  blockReduction: 0.4,
  defendBlockReduction: 0.55,
  warCryBuffTurns: 2,
  warCryStatMult: 1.25,
  fireMeltBonus: 1.1,

  // Timing (ms) — multiplied by 1 / battleSpeedMultiplier in combat
  enemyTurnDelay: 900,
  victoryDelay: 1600,
  deathDelay: 1200,
  winToEnemyTurn: 350,
  actionToEnemyTurn: 50,
  autoCommandDelay: 120,

  bossEveryNFloors: 10,
  battleSpeedOptions: [1, 2, 4],

  // UI
  maxLogEntries: 40,
  floatDuration: 1500,
};

// ═══════════════════════════════════════════════════════════════════════
// GAME DATA — classes, skills, and enemies
// ═══════════════════════════════════════════════════════════════════════

const CLASS_KEYS = ["warrior", "mage", "rogue", "cleric"];

const COMBO_CLASS_KEYS = [
  "mage_knight",
  "sage",
  "templar",
  "duelist",
  "arcanist",
  "plaguecat",
];

const COMBO_UNLOCK_FLOOR = BATTLE_SCALING.comboUnlockFloor ?? BATTLE_SCALING.mageKnightUnlockFloor;

const BASE_CLASS_UNLOCK_FLOOR = {
  warrior: 0,
  mage: 5,
  rogue: 20,
  cleric: 50,
};

const COMBO_SIGNATURE_SKILLS = {
  mage_knight: {
    id: "light",
    name: "Light",
    icon: "✨",
    description: "2.75× burst and full heal. Long cooldown.",
    cooldown: 9,
    type: "combo_light",
    multiplier: 2.75,
  },
  sage: {
    id: "bio",
    name: "Bio",
    icon: "🧬",
    description: "Strong hit and poison (3 turns).",
    cooldown: 5,
    type: "combo_bio",
    multiplier: 1.5,
    poisonTurns: 3,
    poisonPct: 0.3334,
  },
  templar: {
    id: "poison_shield",
    name: "Poison Shield",
    icon: "☠️🛡️",
    description: "Block next hit; poison foe on contact.",
    cooldown: 6,
    type: "combo_poison_shield",
    healAmount: 2,
    blockReduction: 0.4,
    poisonTurns: 3,
    poisonPct: 0.3334,
  },
  duelist: {
    id: "flurry_burst",
    name: "Flurry Burst",
    icon: "💢",
    description: "Huge damage; all skills +2 CD.",
    cooldown: 7,
    type: "combo_nuke_punish",
    multiplier: 3,
    punishCooldown: 2,
  },
  arcanist: {
    id: "dark_magic",
    name: "Dark Magic",
    icon: "🌑",
    description: "Massive nuke; all skills +2 CD.",
    cooldown: 8,
    type: "combo_dark_nuke",
    multiplier: 3.5,
    punishCooldown: 2,
  },
  plaguecat: {
    id: "toxic_smoke",
    name: "Toxic Smoke",
    icon: "💨☠️",
    description: "Evade next hit and poison the foe.",
    cooldown: 5,
    type: "combo_toxic_smoke",
    poisonTurns: 3,
    poisonPct: 0.3334,
  },
};

/** Dual-class definitions: parents, save unlock key, starter weapon id. */
const COMBO_CLASSES = {
  mage_knight: {
    parents: ["warrior", "mage"],
    unlockKey: "mageKnight",
    defaultWeaponId: "mk_claw_codex",
  },
  sage: {
    parents: ["mage", "cleric"],
    unlockKey: "sage",
    defaultWeaponId: "sage_meowmeteor",
  },
  templar: {
    parents: ["warrior", "cleric"],
    unlockKey: "templar",
    defaultWeaponId: "templar_sunblade",
  },
  duelist: {
    parents: ["warrior", "rogue"],
    unlockKey: "duelist",
    defaultWeaponId: "duelist_twinfang",
  },
  arcanist: {
    parents: ["mage", "rogue"],
    unlockKey: "arcanist",
    defaultWeaponId: "arcanist_trickwand",
  },
  plaguecat: {
    parents: ["rogue", "cleric"],
    unlockKey: "plaguecat",
    defaultWeaponId: "plaguecat_toxin",
  },
};

const DEFAULT_UNLOCKS = {
  mageKnight: false,
  sage: false,
  templar: false,
  duelist: false,
  arcanist: false,
  plaguecat: false,
};

const DEFAULT_WEAPON_IDS = {
  warrior: "wooden_sword",
  mage: "gnarled_staff",
  rogue: "rusty_dagger",
  cleric: "holy_rosary",
  mage_knight: "mk_claw_codex",
  sage: "sage_meowmeteor",
  templar: "templar_sunblade",
  duelist: "duelist_twinfang",
  arcanist: "arcanist_trickwand",
  plaguecat: "plaguecat_toxin",
};

function isComboClassKey(classKey) {
  return COMBO_CLASS_KEYS.includes(classKey);
}

function getComboDef(classKey) {
  return COMBO_CLASSES[classKey] ?? null;
}

function spriteKeyForClass(classKey) {
  if (CLASS_SPRITES[classKey]) return classKey;
  return classKey;
}

function getShopMaxBoost(classKey) {
  return isComboClassKey(classKey)
    ? SCALING_CONFIG.comboShopMaxBoost
    : SCALING_CONFIG.shopMaxBoost;
}

function getShopMaxSkillLevel(classKey) {
  return isComboClassKey(classKey)
    ? SCALING_CONFIG.comboMaxSkillLevel
    : SCALING_CONFIG.maxSkillLevel;
}

function getAccountBestFloor(save) {
  let best = Math.max(0, Number(save?.records?.rounds) || 0);
  for (const key of CLASS_KEYS) {
    best = Math.max(best, save?.classes?.[key]?.bestFloorReached ?? 0);
  }
  return best;
}

function isBaseClassUnlocked(save, classKey) {
  const need = BASE_CLASS_UNLOCK_FLOOR[classKey] ?? 0;
  return getAccountBestFloor(save) >= need;
}

function baseClassUnlockHint(classKey) {
  const need = BASE_CLASS_UNLOCK_FLOOR[classKey] ?? 0;
  if (need <= 0) return "";
  return t("select.classUnlock", { floor: need, name: getLocalizedClass(classKey).name });
}

const SHOP_CONFIG = {
  maxHpBoost: SCALING_CONFIG.shopMaxBoost,
  maxAtkBoost: SCALING_CONFIG.shopMaxBoost,
  maxDefBoost: SCALING_CONFIG.shopMaxBoost,
  maxSpBoost: SCALING_CONFIG.shopMaxBoost,
  maxSkillLevel: SCALING_CONFIG.maxSkillLevel,
  maxMageKnightSp: 32,
  hpPrice,
  atkPrice,
  defPrice,
  spPrice,
  skillPrice,
  maxFloorLabel: SCALING_CONFIG.maxFloorLabel,
};

const MAGE_KNIGHT_UNLOCK_FLOOR = BATTLE_SCALING.mageKnightUnlockFloor;

const WEAPON_BLUEPRINTS = [
  { id: "wooden_sword", classKey: "warrior", name: "Wooden Sword", tier: 0, attackMult: 1, description: "Starter blade." },
  { id: "iron_blade", classKey: "warrior", name: "Iron Blade", tier: 1, attackMult: 1.25, description: "×1.25 attack." },
  { id: "steel_cleaver", classKey: "warrior", name: "Steel Cleaver", tier: 2, attackMult: 1.5, description: "×1.5 attack." },
  { id: "warlord_axe", classKey: "warrior", name: "Warlord Axe", tier: 3, attackMult: 2, description: "×2 attack." },
  { id: "starfall_blade", classKey: "warrior", name: "Starfall Blade", tier: 4, attackMult: 2.5, description: "×2.5 attack." },
  { id: "gnarled_staff", classKey: "mage", name: "Gnarled Staff", tier: 0, attackMult: 1, description: "Starter focus." },
  { id: "crystal_staff", classKey: "mage", name: "Crystal Staff", tier: 1, attackMult: 1.25, description: "×1.25 attack." },
  { id: "arcane_scepter", classKey: "mage", name: "Arcane Scepter", tier: 2, attackMult: 1.5, description: "×1.5 attack." },
  { id: "void_tome", classKey: "mage", name: "Void Tome", tier: 3, attackMult: 2, description: "×2 attack." },
  { id: "cosmic_codex", classKey: "mage", name: "Cosmic Codex", tier: 4, attackMult: 2.5, description: "×2.5 attack." },
  { id: "rusty_dagger", classKey: "rogue", name: "Rusty Dagger", tier: 0, attackMult: 1, description: "Starter knife." },
  { id: "steel_dagger", classKey: "rogue", name: "Steel Dagger", tier: 1, attackMult: 1.25, description: "×1.25 attack." },
  { id: "assassin_blade", classKey: "rogue", name: "Assassin Blade", tier: 2, attackMult: 1.5, description: "×1.5 attack." },
  { id: "shadow_fang", classKey: "rogue", name: "Shadow Fang", tier: 3, attackMult: 2, description: "×2 attack." },
  { id: "eclipse_fang", classKey: "rogue", name: "Eclipse Fang", tier: 4, attackMult: 2.5, description: "×2.5 attack." },
  { id: "holy_rosary", classKey: "cleric", name: "Holy Rosary", tier: 0, attackMult: 1, description: "Starter focus." },
  { id: "blessed_censer", classKey: "cleric", name: "Blessed Censer", tier: 1, attackMult: 1.25, description: "×1.25 attack." },
  { id: "sanctum_chime", classKey: "cleric", name: "Sanctum Chime", tier: 2, attackMult: 1.5, description: "×1.5 attack." },
  { id: "dawn_reliquary", classKey: "cleric", name: "Dawn Reliquary", tier: 3, attackMult: 2, description: "×2 attack." },
  { id: "cathedral_bell", classKey: "cleric", name: "Cathedral Bell", tier: 4, attackMult: 2.5, description: "×2.5 attack." },
  { id: "mk_claw_codex", classKey: "mage_knight", name: "Claw & Codex", tier: 0, attackMult: 1, description: "Spellclaw starter." },
  { id: "mk_runeblade", classKey: "mage_knight", name: "Runeclaw Blade", tier: 1, attackMult: 1.25, description: "×1.25 attack." },
  { id: "mk_arcsteel", classKey: "mage_knight", name: "Arcsteel Talon", tier: 2, attackMult: 1.5, description: "×1.5 attack." },
  { id: "mk_stormtome", classKey: "mage_knight", name: "Stormtome Edge", tier: 3, attackMult: 2, description: "×2 attack." },
  { id: "mk_starclaw", classKey: "mage_knight", name: "Starclaw Codex", tier: 4, attackMult: 2.5, description: "×2.5 attack." },
  { id: "sage_meowmeteor", classKey: "sage", name: "Meowmeteor Staff", tier: 0, attackMult: 1, description: "Sage starter." },
  { id: "sage_lunar", classKey: "sage", name: "Lunar Whisk", tier: 1, attackMult: 1.25, description: "×1.25 attack." },
  { id: "sage_ether", classKey: "sage", name: "Ether Paw", tier: 2, attackMult: 1.5, description: "×1.5 attack." },
  { id: "sage_void", classKey: "sage", name: "Void Purr", tier: 3, attackMult: 2, description: "×2 attack." },
  { id: "sage_cosmic", classKey: "sage", name: "Cosmic Sage", tier: 4, attackMult: 2.5, description: "×2.5 attack." },
  { id: "templar_sunblade", classKey: "templar", name: "Sunclaw Blade", tier: 0, attackMult: 1, description: "Templar starter." },
  { id: "templar_dawn", classKey: "templar", name: "Dawn Guard", tier: 1, attackMult: 1.25, description: "×1.25 attack." },
  { id: "templar_aegis", classKey: "templar", name: "Aegis Paw", tier: 2, attackMult: 1.5, description: "×1.5 attack." },
  { id: "templar_radiant", classKey: "templar", name: "Radiant Claw", tier: 3, attackMult: 2, description: "×2 attack." },
  { id: "templar_solar", classKey: "templar", name: "Solar Templar", tier: 4, attackMult: 2.5, description: "×2.5 attack." },
  { id: "duelist_twinfang", classKey: "duelist", name: "Twinfang", tier: 0, attackMult: 1, description: "Duelist starter." },
  { id: "duelist_rapier", classKey: "duelist", name: "Rapier Claw", tier: 1, attackMult: 1.25, description: "×1.25 attack." },
  { id: "duelist_sabre", classKey: "duelist", name: "Sabre Pair", tier: 2, attackMult: 1.5, description: "×1.5 attack." },
  { id: "duelist_mirage", classKey: "duelist", name: "Mirage Fang", tier: 3, attackMult: 2, description: "×2 attack." },
  { id: "duelist_eclipse", classKey: "duelist", name: "Eclipse Duel", tier: 4, attackMult: 2.5, description: "×2.5 attack." },
  { id: "arcanist_trickwand", classKey: "arcanist", name: "Trickwand", tier: 0, attackMult: 1, description: "Arcanist starter." },
  { id: "arcanist_hex", classKey: "arcanist", name: "Hex Whisker", tier: 1, attackMult: 1.25, description: "×1.25 attack." },
  { id: "arcanist_mischief", classKey: "arcanist", name: "Mischief Rod", tier: 2, attackMult: 1.5, description: "×1.5 attack." },
  { id: "arcanist_phantom", classKey: "arcanist", name: "Phantom Codex", tier: 3, attackMult: 2, description: "×2 attack." },
  { id: "arcanist_trickster", classKey: "arcanist", name: "Trickster Star", tier: 4, attackMult: 2.5, description: "×2.5 attack." },
  { id: "plaguecat_toxin", classKey: "plaguecat", name: "Toxin Fang", tier: 0, attackMult: 1, description: "Plagueclaw starter." },
  { id: "plaguecat_spore", classKey: "plaguecat", name: "Spore Dagger", tier: 1, attackMult: 1.25, description: "×1.25 attack." },
  { id: "plaguecat_blight", classKey: "plaguecat", name: "Blight Claw", tier: 2, attackMult: 1.5, description: "×1.5 attack." },
  { id: "plaguecat_miasma", classKey: "plaguecat", name: "Miasma Edge", tier: 3, attackMult: 2, description: "×2 attack." },
  { id: "plaguecat_pandemic", classKey: "plaguecat", name: "Pandemic Fang", tier: 4, attackMult: 2.5, description: "×2.5 attack." },
];

const WEAPONS = WEAPON_BLUEPRINTS.map((w) => ({
  ...w,
  price: weaponTierPrice(w.classKey, w.tier),
}));

function getWeaponAttackMult(weapon) {
  if (!weapon) return 1;
  if (weapon.attackMult != null) return weapon.attackMult;
  const legacy = { 0: 1, 1: 1.25, 2: 1.5, 3: 2 };
  return legacy[weapon.attackBonus] ?? 1;
}

const CLASSES = {
  warrior: {
    name: "Tabby Knight",
    icon: "🐱⚔️",
    maxHp: 12,
    attack: 3,
    baseDefense: 2,
    speed: 6,
    attackType: "physical",
    attackLabel: "⚔️ Physical",
    weapon: "Wooden Sword",
    description: "War Cry → DEFEND → Power Strike. Shield Wall for emergencies.",
    skills: [
      {
        id: "power_strike",
        name: "Power Strike",
        icon: "💥",
        description: "Deal 2.25× physical damage",
        cooldown: 3,
        type: "damage",
        multiplier: 2.25,
      },
      {
        id: "shield_wall",
        name: "Shield Wall",
        icon: "🛡️",
        description: "Strong block next hit & restore 2 HP",
        cooldown: 4,
        type: "heal_block",
        healAmount: 2,
        blockReduction: 0.4,
      },
      {
        id: "war_cry",
        name: "War Cry",
        icon: "📯",
        description: "+25% ATK & DEF for 2 player turns",
        cooldown: 5,
        type: "buff_war_cry",
      },
    ],
  },

  mage: {
    name: "Whisker Mage",
    icon: "🐱🔮",
    maxHp: 6,
    attack: 4,
    baseDefense: 1,
    speed: 8,
    attackType: "magical",
    attackLabel: "🔮 Magical",
    weapon: "Gnarled Staff",
    description: "Freeze, stall, melt with Fire, or spike with Thunder.",
    skills: [
      {
        id: "fire",
        nameKey: "spell.fire.name",
        descKey: "spell.fire.desc",
        icon: "🔥",
        cooldown: 3,
        type: "damage_afterburn",
        multiplier: 1,
      },
      {
        id: "blizzard",
        nameKey: "spell.blizzard.name",
        descKey: "spell.blizzard.desc",
        icon: "❄️",
        cooldown: 4,
        type: "damage_freeze",
        multiplier: 0.85,
      },
      {
        id: "thunder",
        nameKey: "spell.thunder.name",
        descKey: "spell.thunder.desc",
        icon: "⚡",
        cooldown: 6,
        type: "damage",
        multiplier: 2,
      },
      {
        id: "mend",
        nameKey: "spell.mend.name",
        descKey: "spell.mend.desc",
        icon: "✨",
        cooldown: 4,
        type: "heal",
        healAmount: 6,
      },
    ],
  },

  rogue: {
    name: "Shadow Cat",
    icon: "🐱🗡️",
    maxHp: 7,
    attack: 3,
    baseDefense: 0,
    speed: 10,
    attackType: "physical",
    attackLabel: "🗡️ Physical",
    weapon: "Rusty Dagger",
    description: "Glass cannon: Backstab on CD 2. DEFEND between stabs.",
    skills: [
      {
        id: "backstab",
        name: "Backstab",
        icon: "🌑",
        description: "3× guaranteed critical hit",
        cooldown: 2,
        type: "damage",
        multiplier: 3,
        isCrit: true,
      },
      {
        id: "smoke_bomb",
        name: "Smoke Bomb",
        icon: "💨",
        description: "Evade next enemy attack",
        cooldown: 3,
        type: "buff_dodge",
      },
      {
        id: "pickpocket",
        name: "Pickpocket",
        icon: "💰",
        description: "Heavy hit + steal coins",
        cooldown: 6,
        type: "damage_steal",
        damageBase: 2,
        attackScale: 0.55,
        stealRange: [5, 25],
      },
    ],
  },

  cleric: {
    name: "Whisker Cleric",
    icon: "🐱✝️",
    maxHp: 10,
    attack: 2,
    baseDefense: 2,
    speed: 7,
    attackType: "magical",
    attackLabel: "✝️ Sacred",
    weapon: "Holy Rosary",
    description: "Poison clock, timed Aegis, Nosferatu sustain.",
    skills: [
      {
        id: "toxic_prayer",
        nameKey: "spell.toxicPrayer.name",
        descKey: "spell.toxicPrayer.desc",
        icon: "☠️",
        cooldown: 4,
        type: "apply_poison",
        poisonTurns: 3,
        poisonPct: 0.3334,
        damageBase: 1,
        attackScale: 0.2,
      },
      {
        id: "aegis_mirror",
        nameKey: "spell.aegisMirror.name",
        descKey: "spell.aegisMirror.desc",
        icon: "🪞",
        cooldown: 6,
        type: "reflect_guard",
      },
      {
        id: "nosferatu",
        nameKey: "spell.nosferatu.name",
        descKey: "spell.nosferatu.desc",
        icon: "🩸",
        cooldown: 3,
        type: "damage_lifesteal",
        multiplier: 1,
      },
    ],
  },

  mage_knight: {
    name: "Spellclaw Knight",
    nameKey: "combo.mageKnight.name",
    descKey: "combo.mageKnight.desc",
    icon: "🐱⚔️🔮",
    maxHp: 20,
    attack: 8,
    speed: 7,
    maxSp: 10,
    attackType: "hybrid",
    attackLabel: "⚔️🔮 Hybrid",
    weapon: "Claw & Codex",
    description: "Warrior and Mage arts united. Prestige camp costs 3×.",
    skills: [],
    hidden: false,
  },

  sage: {
    name: "Sage of the Meow",
    nameKey: "combo.sage.name",
    descKey: "combo.sage.desc",
    icon: "🐱🔮✝️",
    maxHp: 19,
    attack: 9,
    speed: 8,
    maxSp: 10,
    attackType: "hybrid",
    attackLabel: "🔮✝️ Hybrid",
    weapon: "Meowmeteor Staff",
    description: "Mage and Cleric arts united.",
    skills: [],
    hidden: true,
  },

  templar: {
    name: "Sunclaw Templar",
    nameKey: "combo.templar.name",
    descKey: "combo.templar.desc",
    icon: "🐱⚔️✝️",
    maxHp: 23,
    attack: 7,
    speed: 7,
    maxSp: 9,
    attackType: "hybrid",
    attackLabel: "⚔️✝️ Hybrid",
    weapon: "Sunclaw Blade",
    description: "Warrior and Cleric arts united.",
    skills: [],
    hidden: true,
  },

  duelist: {
    name: "Bladeclaw Duelist",
    nameKey: "combo.duelist.name",
    descKey: "combo.duelist.desc",
    icon: "🐱⚔️🗡️",
    maxHp: 22,
    attack: 6,
    speed: 9,
    maxSp: 8,
    attackType: "physical",
    attackLabel: "⚔️🗡️ Physical",
    weapon: "Twinfang",
    description: "Warrior and Rogue arts united.",
    skills: [],
    hidden: true,
  },

  arcanist: {
    name: "Trickclaw Arcanist",
    nameKey: "combo.arcanist.name",
    descKey: "combo.arcanist.desc",
    icon: "🐱🔮🗡️",
    maxHp: 18,
    attack: 8,
    speed: 9,
    maxSp: 10,
    attackType: "hybrid",
    attackLabel: "🔮🗡️ Hybrid",
    weapon: "Trickwand",
    description: "Mage and Rogue arts united.",
    skills: [],
    hidden: true,
  },

  plaguecat: {
    name: "Plagueclaw",
    nameKey: "combo.plaguecat.name",
    descKey: "combo.plaguecat.desc",
    icon: "🐱🗡️☠️",
    maxHp: 21,
    attack: 7,
    speed: 9,
    maxSp: 9,
    attackType: "hybrid",
    attackLabel: "🗡️☠️ Hybrid",
    weapon: "Toxin Fang",
    description: "Rogue and Cleric arts united.",
    skills: [],
    hidden: true,
  },
};

const SPRITE_CLASS_KEYS = [
  ...CLASS_KEYS,
  ...COMBO_CLASS_KEYS,
];

function catSpritePath(classKey, filename) {
  return `/sprites/cats/${classKey}/${filename}`;
}

const CLASS_SPRITES = Object.fromEntries(
  SPRITE_CLASS_KEYS.map((key) => [
    key,
    {
      box: catSpritePath(key, "box.png"),
      combat: {
        healthy: catSpritePath(key, "combat_healthy.png"),
        alert: catSpritePath(key, "combat_alert.png"),
        hurt: catSpritePath(key, "combat_hurt.png"),
      },
    },
  ])
);

const META_SAVE_KEY = "bossRush_save";
const LEGACY_SAVE_KEY = "bossRush_records";

function createDefaultSkillLevels(classKey) {
  const levels = {};
  for (const skill of CLASSES[classKey].skills) {
    levels[skill.id] = 0;
  }
  return levels;
}

/** Map legacy mage spell ids from older saves. */
function migrateMageSkillLevels(skillLevels) {
  if (!skillLevels || typeof skillLevels !== "object") return skillLevels ?? {};
  const next = { ...skillLevels };
  if (next.fireball != null && next.fire == null) {
    next.fire = next.fireball;
    delete next.fireball;
  }
  if (next.frost_bolt != null && next.blizzard == null) {
    next.blizzard = next.frost_bolt;
    delete next.frost_bolt;
  }
  return next;
}

function localizeSkillTemplate(baseSkill) {
  if (!baseSkill.nameKey) return baseSkill;
  return {
    ...baseSkill,
    name: t(baseSkill.nameKey),
    description: t(baseSkill.descKey),
  };
}

function localizeClassDef(classDef) {
  if (!classDef?.nameKey) return classDef;
  return {
    ...classDef,
    name: t(classDef.nameKey),
    description: t(classDef.descKey),
  };
}

function getLocalizedClass(classKey) {
  return localizeClassDef(CLASSES[classKey]);
}

function createDefaultClassMeta(classKey) {
  const hasWeapons = Boolean(DEFAULT_WEAPON_IDS[classKey]);
  return {
    hpBoost: 0,
    atkBoost: 0,
    defBoost: 0,
    spBoost: 0,
    skillLevels: CLASSES[classKey]?.skills?.length
      ? createDefaultSkillLevels(classKey)
      : {},
    equippedWeaponId: hasWeapons ? DEFAULT_WEAPON_IDS[classKey] : null,
    ownedWeaponIds: hasWeapons ? [DEFAULT_WEAPON_IDS[classKey]] : [],
    bossesDefeated: [],
    bestFloorReached: 0,
  };
}

function createDefaultComboMeta(comboKey) {
  const def = getComboDef(comboKey);
  const starter = def?.defaultWeaponId ?? DEFAULT_WEAPON_IDS[comboKey];
  const skillLevels = {};
  for (const skill of getComboSkillBases(comboKey)) {
    skillLevels[skill.id] = 0;
  }
  return {
    hpBoost: 0,
    atkBoost: 0,
    defBoost: 0,
    spBoost: 0,
    skillLevels,
    equippedWeaponId: starter,
    ownedWeaponIds: starter ? [starter] : [],
    bossesDefeated: [],
    bestFloorReached: 0,
  };
}

function ensureComboMeta(save, comboKey) {
  if (!save.classes[comboKey]) {
    save.classes[comboKey] = createDefaultComboMeta(comboKey);
  }
  return save.classes[comboKey];
}

function ensureClassMeta(save, classKey) {
  if (!save.classes[classKey]) {
    save.classes[classKey] = createDefaultClassMeta(classKey);
  }
  return save.classes[classKey];
}

function mergeMissingClassMetas(save) {
  let next = save;
  let changed = false;
  const classes = { ...save.classes };
  for (const key of CLASS_KEYS) {
    if (!classes[key]) {
      classes[key] = createDefaultClassMeta(key);
      changed = true;
    }
  }
  for (const comboKey of COMBO_CLASS_KEYS) {
    if (!classes[comboKey]) {
      classes[comboKey] = createDefaultComboMeta(comboKey);
      changed = true;
    }
  }
  if (changed) next = { ...save, classes };
  return next;
}

function getClassMetaFromSave(save, classKey) {
  if (isComboClassKey(classKey)) return ensureComboMeta(save, classKey);
  return ensureClassMeta(save, classKey);
}

function shopPriceForClass(classKey, priceFn, level) {
  const base = priceFn(level);
  return isComboClassKey(classKey) ? comboShopPrice(base) : base;
}

function createDefaultSave() {
  const classes = {};
  for (const key of CLASS_KEYS) {
    classes[key] = createDefaultClassMeta(key);
  }
  for (const comboKey of COMBO_CLASS_KEYS) {
    classes[comboKey] = createDefaultComboMeta(comboKey);
  }
  return {
    wallet: 0,
    locale: "en",
    classes,
    records: { coins: 0, streak: 0, rounds: 0 },
    unlocks: { ...DEFAULT_UNLOCKS },
  };
}

function isComboUnlocked(save, comboKey) {
  const def = getComboDef(comboKey);
  if (!def) return false;
  return def.parents.every(
    (p) => (save.classes[p]?.bestFloorReached ?? 0) >= COMBO_UNLOCK_FLOOR
  );
}

function isMageKnightUnlocked(save) {
  return isComboUnlocked(save, "mage_knight");
}

function isComboUnlockedBySave(save, comboKey) {
  const def = getComboDef(comboKey);
  if (!def) return false;
  return Boolean(save.unlocks?.[def.unlockKey]) || isComboUnlocked(save, comboKey);
}

function syncAllComboUnlocks(save) {
  let next = save;
  for (const comboKey of COMBO_CLASS_KEYS) {
    const def = getComboDef(comboKey);
    if (!def) continue;
    const unlocked = isComboUnlocked(next, comboKey);
    if (unlocked && !next.unlocks?.[def.unlockKey]) {
      next = { ...next, unlocks: { ...next.unlocks, [def.unlockKey]: true } };
    }
  }
  return next;
}

function recordBossDefeat(save, classKey, floor) {
  if (!isBossRound(floor) || !classKey) return save;
  const meta = getClassMetaFromSave(save, classKey);
  if (meta.bossesDefeated.includes(floor)) return save;
  const bossesDefeated = [...meta.bossesDefeated, floor].sort((a, b) => a - b);
  return {
    ...save,
    classes: {
      ...save.classes,
      [classKey]: { ...meta, bossesDefeated },
    },
  };
}

function syncMageKnightUnlock(save) {
  return syncAllComboUnlocks(save);
}

function getSkillUpgradeLevel(save, classKey, skillId) {
  return getClassMetaFromSave(save, classKey)?.skillLevels[skillId] ?? 0;
}

function cooldownFromLevel(baseCooldown, level) {
  let cd = baseCooldown ?? 1;
  if (level >= 5) cd -= 1;
  if (level >= 10) cd -= 1;
  return Math.max(1, cd);
}

/** Apply post-cast cooldown to one skill (sync-safe for playerRef). */
function applySkillCastCooldown(skills, skillIndex) {
  return skills.map((s, i) => {
    if (i !== skillIndex) return s;
    const cd = Math.max(1, s.cooldown ?? 1);
    return { ...s, currentCooldown: cd };
  });
}

function isWarCryBuffActive(player, battleTurn) {
  return (
    player?.warCryBuffExpiresOnTurn != null &&
    battleTurn < player.warCryBuffExpiresOnTurn
  );
}

function getWarCryBuffTurnsLeft(player, battleTurn) {
  if (!isWarCryBuffActive(player, battleTurn)) return 0;
  return Math.max(0, player.warCryBuffExpiresOnTurn - battleTurn);
}

function getEffectiveAttack(player, battleTurn) {
  const atk = player?.attack ?? 1;
  if (!isWarCryBuffActive(player, battleTurn)) return atk;
  return Math.max(1, Math.round(atk * GAME_CONFIG.warCryStatMult));
}

function getEffectiveDefense(player, battleTurn) {
  const def = player?.defense ?? 0;
  if (!isWarCryBuffActive(player, battleTurn)) return def;
  return Math.max(0, Math.round(def * GAME_CONFIG.warCryStatMult));
}

function calcHealAmount(baseHeal, level) {
  let heal = baseHeal;
  for (let i = 1; i <= level; i++) {
    heal += i <= 5 ? 1 : 2;
  }
  return heal;
}

function calcSkillDamage(skill, playerAttack, upgradeLevel) {
  if (skill.damageBase != null) {
    return Math.round(
      skill.damageBase +
        playerAttack * (skill.attackScale ?? 0.5) +
        upgradeLevel * playerAttack * 0.15
    );
  }
  if (skill.multiplier != null) {
    return Math.max(1, Math.round(playerAttack * skill.multiplier));
  }
  if (skill.flatDamage != null) {
    return skill.flatDamage + Math.floor(upgradeLevel / 2);
  }
  return 1;
}

function loadSave() {
  try {
    const raw = localStorage.getItem(META_SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const save = createDefaultSave();
      save.wallet = Number(data.wallet) || 0;
      if (data.locale === "en" || data.locale === "es") save.locale = data.locale;
      if (data.records) {
        save.records = {
          coins: Number(data.records.coins) || 0,
          streak: Number(data.records.streak) || 0,
          rounds: Number(data.records.rounds) || 0,
        };
      }
      save.unlocks = { ...DEFAULT_UNLOCKS };
      for (const comboKey of COMBO_CLASS_KEYS) {
        const def = getComboDef(comboKey);
        if (def && data.unlocks?.[def.unlockKey] != null) {
          save.unlocks[def.unlockKey] = Boolean(data.unlocks[def.unlockKey]);
        }
      }
      for (const key of CLASS_KEYS) {
        const incoming = data.classes?.[key];
        if (!incoming) continue;
        const base = createDefaultClassMeta(key);
        save.classes[key] = {
          hpBoost: clamp(Number(incoming.hpBoost) || 0, 0, SHOP_CONFIG.maxHpBoost),
          atkBoost: clamp(Number(incoming.atkBoost) || 0, 0, SHOP_CONFIG.maxAtkBoost),
          defBoost: clamp(Number(incoming.defBoost) || 0, 0, SHOP_CONFIG.maxDefBoost),
          spBoost: clamp(Number(incoming.spBoost) || 0, 0, SHOP_CONFIG.maxSpBoost),
          equippedWeaponId: incoming.equippedWeaponId || base.equippedWeaponId,
          ownedWeaponIds: Array.isArray(incoming.ownedWeaponIds)
            ? [...new Set([...(base.equippedWeaponId ? [base.equippedWeaponId] : []), ...incoming.ownedWeaponIds])]
            : base.ownedWeaponIds,
          skillLevels:
            key === "mage"
              ? migrateMageSkillLevels({
                  ...base.skillLevels,
                  ...(incoming.skillLevels || {}),
                })
              : { ...base.skillLevels, ...(incoming.skillLevels || {}) },
          bossesDefeated: Array.isArray(incoming.bossesDefeated)
            ? incoming.bossesDefeated.map(Number).filter((n) => n > 0)
            : [],
          bestFloorReached: Math.max(0, Number(incoming.bestFloorReached) || 0),
        };
        save.classes[key] = syncBossesDefeatedFromBestFloor(save.classes[key]);
      }
      for (const comboKey of COMBO_CLASS_KEYS) {
        const incoming = data.classes?.[comboKey];
        if (!incoming) continue;
        const base = createDefaultComboMeta(comboKey);
        save.classes[comboKey] = {
          ...base,
          hpBoost: clamp(Number(incoming.hpBoost) || 0, 0, getShopMaxBoost(comboKey)),
          atkBoost: clamp(Number(incoming.atkBoost) || 0, 0, getShopMaxBoost(comboKey)),
          defBoost: clamp(Number(incoming.defBoost) || 0, 0, getShopMaxBoost(comboKey)),
          spBoost: clamp(Number(incoming.spBoost) || 0, 0, SHOP_CONFIG.maxSpBoost),
          equippedWeaponId: incoming.equippedWeaponId || base.equippedWeaponId,
          ownedWeaponIds: Array.isArray(incoming.ownedWeaponIds)
            ? [...new Set([...(base.equippedWeaponId ? [base.equippedWeaponId] : []), ...incoming.ownedWeaponIds])]
            : base.ownedWeaponIds,
          skillLevels: {
            ...base.skillLevels,
            ...(incoming.skillLevels || {}),
          },
          bossesDefeated: Array.isArray(incoming.bossesDefeated)
            ? incoming.bossesDefeated.map(Number).filter((n) => n > 0)
            : [],
          bestFloorReached: Math.max(0, Number(incoming.bestFloorReached) || 0),
        };
        save.classes[comboKey] = syncBossesDefeatedFromBestFloor(save.classes[comboKey]);
      }
      const merged = mergeMissingClassMetas(save);
      const synced = syncAllComboUnlocks(merged);
      if (merged !== save) persistSave(synced);
      return synced;
    }
  } catch {
    /* fall through to migration */
  }

  const save = createDefaultSave();
  try {
    const legacyRaw = localStorage.getItem(LEGACY_SAVE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      save.records = {
        coins: Number(legacy.coins) || 0,
        streak: Number(legacy.streak) || 0,
        rounds: Number(legacy.rounds) || 0,
      };
    }
  } catch {
    /* ignore */
  }
  persistSave(save);
  return syncAllComboUnlocks(save);
}

function persistSave(save) {
  localStorage.setItem(META_SAVE_KEY, JSON.stringify(save));
  return save;
}

function getWeaponById(weaponId) {
  return WEAPONS.find((w) => w.id === weaponId);
}

function getWeaponsForClass(classKey) {
  return WEAPONS.filter((w) => w.classKey === classKey);
}

/** Apply shop skill levels to a base skill template. */
function applySkillLevels(baseSkill, level, playerAttack = 5) {
  const localized = localizeSkillTemplate(baseSkill);
  const skill = {
    ...localized,
    upgradeLevel: level,
    currentCooldown: 0,
    cooldown: cooldownFromLevel(baseSkill.cooldown, level),
  };

  if (baseSkill.damageBase != null) {
    skill.previewDamage = calcSkillDamage(baseSkill, playerAttack, level);
  }
  if (baseSkill.multiplier != null) {
    skill.multiplier = baseSkill.multiplier + level * 0.15;
    skill.previewDamage = calcSkillDamage(
      { ...baseSkill, multiplier: skill.multiplier },
      playerAttack,
      level
    );
  }
  if (baseSkill.type === "damage_afterburn") {
    skill.previewAfterburn = afterburnChip(level, 50);
  }
  if (baseSkill.type === "heal" || baseSkill.type === "heal_block") {
    skill.healAmount = calcHealAmount(baseSkill.healAmount, level);
  }
  if (baseSkill.stealRange) {
    skill.stealRange = [
      baseSkill.stealRange[0] + Math.floor(level / 2),
      baseSkill.stealRange[1] + level * 2,
    ];
  }
  if (baseSkill.type === "damage_lifesteal") {
    skill.lifestealPercent = lifestealPercent(level);
  }

  return skill;
}

function describeSkillUpgrade(baseSkill, nextLevel, previewAttack = 5, classKey = "warrior") {
  if (nextLevel > getShopMaxSkillLevel(classKey)) return "Max level";
  const preview = applySkillLevels(baseSkill, nextLevel, previewAttack);
  const parts = [];
  if (preview.previewDamage != null) {
    parts.push(`~${preview.previewDamage} dmg at ${previewAttack} ATK`);
  }
  if (preview.multiplier != null && preview.multiplier !== baseSkill.multiplier) {
    parts.push(`×${preview.multiplier.toFixed(1)}`);
  }
  if (preview.healAmount != null) {
    parts.push(`heal ${preview.healAmount}`);
  }
  if (preview.previewAfterburn != null) {
    parts.push(`afterburn ~${preview.previewAfterburn} (vs 50 HP)`);
  }
  if (preview.cooldown < baseSkill.cooldown) {
    parts.push(`Cooldown ${preview.cooldown}`);
  }
  if (nextLevel === 5 || nextLevel === 10) {
    parts.push("milestone Cooldown cut");
  }
  if (preview.stealRange) parts.push(`steal ${preview.stealRange[0]}–${preview.stealRange[1]}`);
  return parts.length ? parts.join(", ") : "Stronger effect";
}

function dogSpritePath(spriteKey, filename) {
  return `/sprites/dogs/${spriteKey}/${filename}`;
}

const ENEMY_SPRITES = Object.fromEntries(
  getAllEnemySpriteKeys().map((key) => [
    key,
    {
      combat: {
        healthy: dogSpritePath(key, "combat_healthy.png"),
        alert: dogSpritePath(key, "combat_alert.png"),
        hurt: dogSpritePath(key, "combat_hurt.png"),
      },
    },
  ])
);

function getEnemyCombatSpriteUrl(enemy, state = "healthy") {
  if (!enemy?.spriteKey) return null;
  return ENEMY_SPRITES[enemy.spriteKey]?.combat?.[state] ?? null;
}

function getEnemyCombatSpriteState(hp, maxHp, playerAttack, enemy) {
  if (maxHp > 0 && hp / maxHp <= 0.35) return "hurt";
  if (enemy?.attack >= playerAttack || enemy?.isBoss || enemy?.tier === "capstone") {
    return "alert";
  }
  return "healthy";
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

/** Random integer between min and max (inclusive) */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Clamp a value between min and max */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Get the coin multiplier for a given streak count */
function getStreakMultiplier(streak) {
  for (const [minStreak, multiplier] of GAME_CONFIG.streakTiers) {
    if (streak >= minStreak) return multiplier;
  }
  return 1;
}

function getPlayerCombatSpriteState(hp, maxHp, enemy, playerAttack, round) {
  if (maxHp > 0 && hp / maxHp <= 0.35) return "hurt";
  const poolIndex = getEnemyPoolIndex(round, 10);
  const tough =
    (enemy && enemy.attack >= playerAttack) ||
    round >= 10 ||
    poolIndex >= 6;
  if (tough) return "alert";
  return "healthy";
}

function getPlayerCombatSpriteUrl(classKey, state) {
  return CLASS_SPRITES[spriteKeyForClass(classKey)]?.combat?.[state] ?? null;
}

function getComboSkillBases(comboKey) {
  const def = getComboDef(comboKey);
  if (!def) return [];
  const parentSkills = def.parents.flatMap((parentKey) => CLASSES[parentKey].skills);
  const signature = COMBO_SIGNATURE_SKILLS[comboKey];
  return signature ? [...parentSkills, signature] : parentSkills;
}

function applyComboSkillModifiers(skill, classKey, playerAttack) {
  if (!isComboClassKey(classKey)) return skill;
  let next = { ...skill };
  if (classKey === "mage_knight") {
    next.cooldown = (next.cooldown ?? 1) + 1;
    if (next.previewDamage != null) {
      next.previewDamage = Math.max(1, Math.round(next.previewDamage * 1.25));
    }
  }
  return next;
}

function calcComboSkillDamage(skill, playerAttack, level, classKey) {
  let damage = calcSkillDamage(skill, playerAttack, level);
  if (classKey === "mage_knight") {
    damage = Math.max(1, Math.round(damage * 1.25));
  }
  return damage;
}

function bumpAllSkillCooldowns(skills, amount) {
  return skills.map((s) => ({
    ...s,
    currentCooldown: (s.currentCooldown ?? 0) + amount,
  }));
}

function comboParentLabel(comboKey) {
  const def = getComboDef(comboKey);
  if (!def) return "";
  return def.parents.map((p) => getLocalizedClass(p).name).join(` ${t("select.and")} `);
}

function comboUnlockHint(comboKey) {
  return t("select.comboUnlock", {
    floor: COMBO_UNLOCK_FLOOR,
    parents: comboParentLabel(comboKey),
  });
}

function buildEnemy(round) {
  const template = resolveEnemyTemplate(round);
  return buildEnemyFromCatalog(round, template);
}

function getEnemyTemplateForFoe(foe) {
  if (foe?.catalogId) return getCatalogEntry(foe.catalogId);
  if (foe?.poolIndex != null && foe.poolIndex >= 0) {
    return getCatalogEntryByIndex(foe.poolIndex);
  }
  return resolveEnemyTemplate(1);
}

/** Innate stats: sum of parent class bases only (no parent camp boosts). */
function getComboInnate(save, comboKey) {
  const def = getComboDef(comboKey);
  if (!def) return null;
  const comboMeta = ensureComboMeta(save, comboKey);
  let maxHp = 0;
  let baseAtk = 0;
  let defense = 0;
  for (const parentKey of def.parents) {
    const pDef = CLASSES[parentKey];
    maxHp += pDef.maxHp;
    baseAtk += pDef.attack;
    defense += pDef.baseDefense ?? 0;
  }
  const weapon =
    getWeaponById(comboMeta.equippedWeaponId) ||
    getWeaponById(DEFAULT_WEAPON_IDS[comboKey]);
  const weaponMult = getWeaponAttackMult(weapon);
  return {
    maxHp,
    attack: Math.max(1, Math.round(baseAtk * weaponMult)),
    defense,
    weaponMult,
    weaponName: weapon?.name ?? CLASSES[comboKey].weapon,
  };
}

/** Build player state from class + camp meta upgrades */
function buildPlayer(classKey, classMeta, save = null) {
  if (isComboClassKey(classKey) && save) {
    const comboMeta = classMeta ?? ensureComboMeta(save, classKey);
    const innate = getComboInnate(save, classKey);
    const classDef = getLocalizedClass(classKey);
    const maxHp = innate.maxHp + totalHpBonus(comboMeta.hpBoost);
    const attack = innate.attack + totalAtkBonus(comboMeta.atkBoost);
    const skillBases = getComboSkillBases(classKey);
    const skills = skillBases.map((base) => {
      const level = comboMeta.skillLevels[base.id] ?? 0;
      return applyComboSkillModifiers(
        applySkillLevels(base, level, attack),
        classKey,
        attack
      );
    });
    return {
      classKey,
      name: classDef.name,
      icon: classDef.icon,
      hp: maxHp,
      maxHp,
      attack,
      speed: CLASSES[classKey].speed,
      defense: innate.defense + totalDefBonus(comboMeta.defBoost),
      weapon: innate.weaponName,
      weaponId: comboMeta.equippedWeaponId,
      skills,
      warCryBuffExpiresOnTurn: null,
      hasDodgeBuff: false,
      hasBlockBuff: false,
      blockReductionNext: null,
      hasReflectGuard: false,
      hasPoisonShield: false,
    };
  }

  const classDef = CLASSES[classKey];
  const localized = getLocalizedClass(classKey);
  const meta = classMeta ?? createDefaultClassMeta(classKey);
  const weapon = getWeaponById(meta.equippedWeaponId) || getWeaponById(DEFAULT_WEAPON_IDS[classKey]);
  const maxHp = classDef.maxHp + totalHpBonus(meta.hpBoost);
  const baseAtk = classDef.attack + totalAtkBonus(meta.atkBoost);
  const attack = Math.max(1, Math.round(baseAtk * getWeaponAttackMult(weapon)));

  const skills = classDef.skills.map((base) => {
    const level = meta.skillLevels[base.id] ?? 0;
    return applySkillLevels(base, level, attack);
  });

  return {
    classKey,
    name: localized.name,
    icon: classDef.icon,
    hp: maxHp,
    maxHp,
    attack,
    speed: classDef.speed ?? 5,
    defense: (classDef.baseDefense ?? 0) + totalDefBonus(meta.defBoost ?? 0),
    weapon: weapon?.name ?? classDef.weapon,
    weaponId: weapon?.id ?? DEFAULT_WEAPON_IDS[classKey],
    skills,
    warCryBuffExpiresOnTurn: null,
    hasDodgeBuff: false,
    hasBlockBuff: false,
    blockReductionNext: null,
    hasReflectGuard: false,
    hasPoisonShield: false,
  };
}

/** Reduce all skill cooldowns by 1 */
function tickCooldowns(skills) {
  return skills.map((s) => ({
    ...s,
    currentCooldown: Math.max(0, s.currentCooldown - 1),
  }));
}

// ═══════════════════════════════════════════════════════════════════════
// CUSTOM HOOK — useGameEngine
// All game logic lives here. Components just read state and call actions.
// ═══════════════════════════════════════════════════════════════════════

function useGameEngine() {
  const [save, setSave] = useState(() => {
    const loaded = loadSave();
    setLocale(loaded.locale === "es" ? "es" : "en");
    return loaded;
  });

  // ── Core state ──
  const [scene, setScene] = useState("title"); // title | select | shop | battle | gameover
  const [selectedClassKey, setSelectedClassKey] = useState(null);
  const selectedClassKeyRef = useRef(null);
  selectedClassKeyRef.current = selectedClassKey;
  const [player, setPlayer] = useState(null);
  const [enemy, setEnemy] = useState(null);
  const [turn, setTurn] = useState("player");
  const [wallet, setWallet] = useState(() => loadSave().wallet);
  const [runCoinsEarned, setRunCoinsEarned] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [kills, setKills] = useState(0);
  const [round, setRound] = useState(1);
  const [battleTurn, setBattleTurn] = useState(0);
  const [log, setLog] = useState([]);
  const [isSkillsMenuOpen, setIsSkillsMenuOpen] = useState(false);
  const [enemyFrozen, setEnemyFrozen] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const [battleSpeedIndex, setBattleSpeedIndex] = useState(0);

  const allTimeRecords = save.records;

  // ── Visual effects state ──
  const [floatingNumbers, setFloatingNumbers] = useState([]);
  const [shakeTarget, setShakeTarget] = useState(""); // "player" | "enemy" | ""
  const [flashType, setFlashType] = useState("");      // "gold" | "red" | ""
  const [streakPop, setStreakPop] = useState(false);
  const [coinPop, setCoinPop] = useState(false);

  // ── Refs for timers and latest combat state (avoids stale closures) ──
  const timersRef = useRef([]);
  const floatIdCounterRef = useRef(0);
  const enemyRef = useRef(enemy);
  const playerRef = useRef(player);
  const streakRef = useRef(streak);
  const roundRef = useRef(round);
  const battleTurnRef = useRef(battleTurn);
  const walletRef = useRef(wallet);
  const killsRef = useRef(kills);
  const bestStreakRef = useRef(bestStreak);
  const saveRef = useRef(save);
  const skipNextEnemyTurnRef = useRef(false);
  const enemyFrozenRef = useRef(false);
  const enemyTurnInFlightRef = useRef(false);
  const afterburnRef = useRef(null);
  const turnRef = useRef(turn);
  const runCoinsEarnedRef = useRef(runCoinsEarned);
  const sceneRef = useRef(scene);
  const autoEnabledRef = useRef(autoEnabled);
  const autoPausedRef = useRef(autoPaused);

  enemyRef.current = enemy;
  playerRef.current = player;
  streakRef.current = streak;
  roundRef.current = round;
  battleTurnRef.current = battleTurn;
  walletRef.current = wallet;
  killsRef.current = kills;
  bestStreakRef.current = bestStreak;
  saveRef.current = save;
  turnRef.current = turn;
  runCoinsEarnedRef.current = runCoinsEarned;
  sceneRef.current = scene;
  autoEnabledRef.current = autoEnabled;
  autoPausedRef.current = autoPaused;

  const battleSpeedMultiplier =
    GAME_CONFIG.battleSpeedOptions[battleSpeedIndex] ?? 1;

  const scheduleMs = useCallback(
    (ms) => Math.max(16, Math.round(ms / battleSpeedMultiplier)),
    [battleSpeedMultiplier]
  );

  /** Schedule a delayed action (automatically cleaned up) */
  const schedule = useCallback(
    (ms, fn) => {
      const id = setTimeout(fn, scheduleMs(ms));
      timersRef.current.push(id);
      return id;
    },
    [scheduleMs]
  );

  /** Clear all pending timers */
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  function commitSave(nextSave) {
    persistSave(nextSave);
    saveRef.current = nextSave;
    setSave(nextSave);
    return nextSave;
  }

  function setLocalePreference(nextLocale) {
    const loc = nextLocale === "es" ? "es" : "en";
    setLocale(loc);
    commitSave({ ...saveRef.current, locale: loc });
  }

  function addWallet(amount) {
    if (amount <= 0) return;
    setWallet((prev) => {
      const next = prev + amount;
      walletRef.current = next;
      const nextSave = { ...saveRef.current, wallet: next };
      commitSave(nextSave);
      return next;
    });
    setRunCoinsEarned((r) => r + amount);
    triggerCoinPop();
  }

  function spendWallet(amount) {
    if (walletRef.current < amount) return false;
    const next = walletRef.current - amount;
    walletRef.current = next;
    setWallet(next);
    commitSave({ ...saveRef.current, wallet: next });
    return true;
  }

  function checkAutoInterrupt() {
    const p = playerRef.current;
    const foe = enemyRef.current;
    if (!p || !foe || !autoEnabled) return false;
    const template = getEnemyTemplateForFoe(foe);
    if (wouldAutoLose(p, foe, template, GAME_CONFIG.blockReduction)) {
      setAutoPaused(true);
      addLogEntry(t("battle.autoSlowing"), "system");
      return true;
    }
    return false;
  }

  function runAutoCommand() {
    if (turnRef.current !== "player") return;
    if (!autoEnabled || autoPaused) return;

    const classKey = playerRef.current?.classKey;
    const roundNum = roundRef.current;
    if (classKey && isBossRound(roundNum) && canAutoSkipBoss(saveRef.current, classKey, roundNum)) {
      processAutoBossSkip();
      return;
    }

    if (checkAutoInterrupt()) return;

    const p = playerRef.current;
    if (!p) return;
    const template = getEnemyTemplateForFoe(enemyRef.current);
    const hpLow = p.maxHp > 0 && p.hp / p.maxHp <= 0.4;
    const shouldDefend =
      (hpLow ||
        wouldAutoLose(p, enemyRef.current, template, GAME_CONFIG.blockReduction)) &&
      !p.hasBlockBuff;
    const skillIndex = pickAutoSkill(p.skills, 0, {
      preferDamage: !checkAutoInterrupt(),
    });
    if (skillIndex != null) {
      actionMagic(skillIndex);
      return;
    }
    if (!hasAnyReadySkill(p.skills) && shouldDefend) {
      actionDefend();
    } else {
      actionFight();
    }
  }

  function consumeAfterburnOnEnemy(nextEnemy) {
    const pending = afterburnRef.current;
    if (!pending || !nextEnemy) return nextEnemy;
    const carriersLeft = pending.carriersLeft ?? 0;
    if (carriersLeft <= 0) {
      afterburnRef.current = null;
      return nextEnemy;
    }
    const chip = afterburnChip(pending.skillLevel, nextEnemy.maxHp);
    const hp = Math.max(0, nextEnemy.hp - (chip > 0 ? chip : 0));
    const nextCarriers = carriersLeft - 1;
    if (nextCarriers > 0) {
      afterburnRef.current = { ...pending, carriersLeft: nextCarriers };
      addLogEntry(
        t("battle.afterburnLinger", { damage: chip, name: nextEnemy.name, left: nextCarriers }),
        "good"
      );
    } else {
      afterburnRef.current = null;
      addLogEntry(t("battle.afterburn", { damage: chip, name: nextEnemy.name }), "good");
    }
    if (chip > 0) spawnFloat(`🔥−${chip}`, "enemy", "#ff6600");
    return { ...nextEnemy, hp };
  }

  function transitionToNextFloor(nextRound) {
    clearEnemyFreeze();
    setRound(nextRound);
    let nextEnemy = buildEnemy(nextRound);
    nextEnemy = consumeAfterburnOnEnemy(nextEnemy);
    setEnemy(nextEnemy);

    addLogEntry(`👁️ "${nextEnemy.lore}"`, "lore");
    if (isThemeTransitionFloor(nextRound)) {
      const block = getThemeBlock(nextRound);
      if (block?.nameKey) {
        addLogEntry(t(block.nameKey), "lore");
      }
    }
    if (isFreePlayRound(nextRound) && nextRound === FREE_PLAY_START) {
      addLogEntry(t("theme.freeplay"), "system");
    }
    const classKey = playerRef.current?.classKey;
    const showBossBanner =
      nextEnemy.isBoss &&
      classKey &&
      !canAutoSkipBoss(saveRef.current, classKey, nextRound);
    if (showBossBanner) {
      addLogEntry(`☠️ BOSS FLOOR ${nextRound} — take command!`, "system");
    }
    addLogEntry(`━ FLOOR ${nextRound} ━ ${nextEnemy.name} appears!`, "system");

    if (nextEnemy.hp <= 0) {
      addLogEntry(t("battle.afterburnKill", { name: nextEnemy.name }), "victory");
      schedule(GAME_CONFIG.winToEnemyTurn, () => processVictory());
      return;
    }
    beginPlayerTurn();
  }

  function beginPlayerTurn() {
    setTurn("player");
    setBattleTurn((t) => {
      const next = t + 1;
      battleTurnRef.current = next;
      return next;
    });

    const p = playerRef.current;
    if (
      p &&
      p.warCryBuffExpiresOnTurn != null &&
      battleTurnRef.current >= p.warCryBuffExpiresOnTurn
    ) {
      commitPlayer({
        ...p,
        warCryBuffExpiresOnTurn: null,
      });
    }

    const afterWarCry = playerRef.current;
    if (afterWarCry?.classKey === "templar" && afterWarCry.maxHp > 0) {
      const heal = Math.max(1, Math.floor(afterWarCry.maxHp * 0.08));
      commitPlayer((pl) => {
        if (!pl) return pl;
        const hp = Math.min(pl.maxHp, pl.hp + heal);
        if (hp === pl.hp) return pl;
        spawnFloat(`+${heal}`, "player", "#00ff99");
        return { ...pl, hp };
      });
    }

    const classKey = playerRef.current?.classKey;
    const roundNum = roundRef.current;
    const skipBoss =
      classKey && canAutoSkipBoss(saveRef.current, classKey, roundNum);

    if (skipBoss && autoEnabled && !autoPaused) {
      schedule(GAME_CONFIG.autoCommandDelay, processAutoBossSkip);
      return;
    }

    const manualBossBlock =
      isBossRound(roundNum) &&
      !(classKey && canAutoSkipBoss(saveRef.current, classKey, roundNum));

    if (autoEnabled && !autoPaused && !manualBossBlock) {
      schedule(GAME_CONFIG.autoCommandDelay, runAutoCommand);
    }
  }

  function toggleAuto() {
    if (autoEnabledRef.current || autoPausedRef.current) {
      setAutoEnabled(false);
      setAutoPaused(false);
      autoEnabledRef.current = false;
      autoPausedRef.current = false;
      clearAllTimers();
      return;
    }
    setAutoEnabled(true);
    setAutoPaused(false);
    autoEnabledRef.current = true;
    autoPausedRef.current = false;
    resumeAutoAfterToggle();
  }

  function resumeAutoAfterToggle() {
    schedule(0, () => {
      if (sceneRef.current !== "battle" || turnRef.current !== "player") return;
      if (!autoEnabledRef.current || autoPausedRef.current) return;
      const classKey = playerRef.current?.classKey;
      const roundNum = roundRef.current;
      if (classKey && canAutoSkipBoss(saveRef.current, classKey, roundNum)) {
        processAutoBossSkip();
      } else {
        runAutoCommand();
      }
    });
  }

  function processAutoBossSkip() {
    const foe = enemyRef.current;
    const classKey = playerRef.current?.classKey;
    if (!foe || !classKey) return;

    const newStreak = streakRef.current + 1;
    const multiplier = getStreakMultiplier(newStreak);
    const earned = Math.round(foe.reward * multiplier * GAME_CONFIG.rewardMultiplier);

    setStreak(newStreak);
    setBestStreak((prev) => Math.max(prev, newStreak));
    addWallet(earned);
    setKills((prev) => prev + 1);
    spawnFloat(`+${earned}💰`, "enemy", "#FFD700");

    const nextRound = roundRef.current + 1;
    const pKey = playerRef.current?.classKey;
    if (
      pKey &&
      nextRound === BATTLE_SCALING.megaBossRound &&
      isBossRound(nextRound) &&
      !canAutoSkipBoss(saveRef.current, pKey, nextRound)
    ) {
      setAutoEnabled(false);
      setAutoPaused(false);
    }

    schedule(Math.max(80, GAME_CONFIG.victoryDelay / 3), () => {
      transitionToNextFloor(nextRound);
    });
  }

  function updateRecordsFromRun(roundsReached, classKey) {
    const rounds =
      roundsReached != null
        ? roundsReached
        : Math.max(0, roundRef.current - 1);
    const nextRecords = {
      coins: Math.max(saveRef.current.records.coins, walletRef.current),
      streak: Math.max(saveRef.current.records.streak, bestStreakRef.current),
      rounds: Math.max(saveRef.current.records.rounds, rounds),
    };
    const key =
      classKey ?? selectedClassKeyRef.current ?? playerRef.current?.classKey;
    let nextSave = { ...saveRef.current, records: nextRecords };
    if (key) {
      const meta = getClassMetaFromSave(nextSave, key);
      nextSave = {
        ...nextSave,
        classes: {
          ...nextSave.classes,
          [key]: {
            ...meta,
            bestFloorReached: Math.max(meta.bestFloorReached ?? 0, rounds),
          },
        },
      };
    }
    commitSave(syncMageKnightUnlock(nextSave));
  }

  // ── Effect helpers ──

  function addLogEntry(message, type = "info") {
    setLog((prev) => [
      ...prev.slice(-GAME_CONFIG.maxLogEntries),
      { message, type, id: Date.now() + Math.random() },
    ]);
  }

  function spawnFloat(text, target, color) {
    const id = floatIdCounterRef.current++;
    setFloatingNumbers((prev) => [...prev, { id, text, target, color }]);
    setTimeout(() => {
      setFloatingNumbers((prev) => prev.filter((f) => f.id !== id));
    }, GAME_CONFIG.floatDuration);
  }

  function triggerShake(target) {
    setShakeTarget(target);
    setTimeout(() => setShakeTarget(""), 450);
  }

  function triggerFlash(type) {
    setFlashType(type);
    setTimeout(() => setFlashType(""), 350);
  }

  function triggerStreakPop() {
    setStreakPop(true);
    setTimeout(() => setStreakPop(false), 700);
  }

  function triggerCoinPop() {
    setCoinPop(true);
    setTimeout(() => setCoinPop(false), 600);
  }

  // ── Core combat helpers ──

  /** Apply damage to enemy; kill/turn transitions use functional updater (no stale HP). */
  function resolveEnemyDamage(damage, onAfterDamage) {
    setTurn("animating");
    setEnemy((prev) => {
      if (!prev) return prev;
      const newHp = Math.max(0, prev.hp - damage);
      if (newHp <= 0) {
        if (onAfterDamage) onAfterDamage(damage);
        clearAllTimers();
        enemyTurnInFlightRef.current = false;
        schedule(GAME_CONFIG.winToEnemyTurn, () => processVictory());
      } else {
        schedule(GAME_CONFIG.actionToEnemyTurn, () => {
          if (onAfterDamage) onAfterDamage(damage);
          setTurn("enemy");
          processEnemyTurn();
        });
      }
      return { ...prev, hp: newHp };
    });
  }

  /**
   * Deal damage to the enemy and handle kill/transition.
   * This is the shared path for basic attacks and damage skills.
   */
  function dealDamageToEnemy(damage, isCrit, logMessage, onAfterDamage) {
    addLogEntry(logMessage, "good");
    spawnFloat(
      `${isCrit ? "⚡" : ""}−${damage}`,
      "enemy",
      isCrit ? "#ff8c00" : "#FFD700"
    );
    triggerShake("enemy");
    resolveEnemyDamage(damage, onAfterDamage);
  }

  function scheduleAfterPlayerAction() {
    setTurn("animating");
    schedule(GAME_CONFIG.actionToEnemyTurn, () => {
      setTurn("enemy");
      processEnemyTurn();
    });
  }

  // ── Turn processing ──

  function clearEnemyFreeze() {
    skipNextEnemyTurnRef.current = false;
    enemyFrozenRef.current = false;
    setEnemyFrozen(false);
    setEnemy((prev) =>
      prev ? { ...prev, freezeTurnsLeft: 0 } : prev
    );
  }

  function meltFreezeOnEnemy() {
    const foe = enemyRef.current;
    if (!foe || (foe.freezeTurnsLeft ?? 0) <= 0) return false;
    setEnemy({ ...foe, freezeTurnsLeft: 0 });
    skipNextEnemyTurnRef.current = false;
    enemyFrozenRef.current = false;
    setEnemyFrozen(false);
    return true;
  }

  function commitPlayer(updater) {
    const prev = playerRef.current;
    if (!prev) return null;
    const next = typeof updater === "function" ? updater(prev) : updater;
    playerRef.current = next;
    setPlayer(next);
    return next;
  }

  function finishFrozenEnemyTurn(foe, afterEnemyTurn, finishEnemyTurn) {
    const turnsLeft = Math.max(0, (foe.freezeTurnsLeft ?? 0) - 1);
    const nextFoe = { ...foe, freezeTurnsLeft: turnsLeft };
    setEnemy(nextFoe);
    enemyFrozenRef.current = turnsLeft > 0;
    setEnemyFrozen(turnsLeft > 0);
    addLogEntry(
      t("battle.freezeTick", { name: foe.name, turns: turnsLeft }),
      "system"
    );
    commitPlayer((pl) =>
      pl
        ? {
            ...pl,
            skills: tickCooldowns(pl.skills),
            hasBlockBuff: false,
            blockReductionNext: null,
          }
        : pl
    );
    if (typeof afterEnemyTurn === "function") {
      finishEnemyTurn();
    } else {
      beginPlayerTurn();
      finishEnemyTurn();
    }
  }

  function processEnemyTurn(afterEnemyTurn) {
    schedule(GAME_CONFIG.enemyTurnDelay, () => {
      if (enemyTurnInFlightRef.current) {
        if (skipNextEnemyTurnRef.current || enemyFrozenRef.current) {
          schedule(32, () => processEnemyTurn(afterEnemyTurn));
        }
        return;
      }
      if (turnRef.current !== "enemy" && turnRef.current !== "animating") {
        if (skipNextEnemyTurnRef.current || enemyFrozenRef.current) {
          schedule(32, () => processEnemyTurn(afterEnemyTurn));
        }
        return;
      }

      enemyTurnInFlightRef.current = true;

      const finishEnemyTurn = () => {
        enemyTurnInFlightRef.current = false;
        if (typeof afterEnemyTurn === "function") {
          afterEnemyTurn();
        }
      };

      const p = playerRef.current;
      let foe = enemyRef.current;
      if (!p || !foe || foe.hp <= 0) {
        finishEnemyTurn();
        return;
      }

      if ((foe.freezeTurnsLeft ?? 0) > 0 || skipNextEnemyTurnRef.current) {
        skipNextEnemyTurnRef.current = false;
        finishFrozenEnemyTurn(foe, afterEnemyTurn, finishEnemyTurn);
        return;
      }

      const poisonTurns = foe.poisonTurnsLeft ?? 0;
      if (poisonTurns > 0) {
        const stack = foe.poisonStack ?? 0;
        const baseTick = poisonTickDamage(foe.maxHp);
        const tick =
          p.classKey === "sage" && foe.poisonCompound
            ? Math.max(1, Math.ceil(baseTick * (1 + stack * 0.34)))
            : baseTick;
        const hp = Math.max(0, foe.hp - tick);
        const poisonTurnsLeft = Math.max(0, poisonTurns - 1);
        addLogEntry(t("battle.poisonTick", { damage: tick, name: foe.name }), "good");
        spawnFloat(`☠️−${tick}`, "enemy", "#aa44ff");
        foe = {
          ...foe,
          hp,
          poisonTurnsLeft: poisonTurnsLeft > 0 ? poisonTurnsLeft : 0,
          poisonStack: p.classKey === "sage" && foe.poisonCompound ? stack + 1 : stack,
        };
        setEnemy(foe);
        if (hp <= 0) {
          clearAllTimers();
          enemyTurnInFlightRef.current = false;
          schedule(GAME_CONFIG.winToEnemyTurn, () => processVictory());
          return;
        }
      }

      if (p.hasDodgeBuff) {
        addLogEntry(`💨 ${foe.name} attacks — you DODGE! MISS!`, "good");
        spawnFloat("MISS!", "player", "#aaaaff");
        commitPlayer({
          ...p,
          hasDodgeBuff: false,
          skills: tickCooldowns(p.skills),
        });
        queueMicrotask(() => {
          if (typeof afterEnemyTurn === "function") {
            finishEnemyTurn();
          } else {
            beginPlayerTurn();
            finishEnemyTurn();
          }
        });
        return;
      }

      const template = getEnemyTemplateForFoe(foe);
      const { rawAttackMult, specialName } = rollEnemySpecial(template);
      const rawAttack = Math.max(
        1,
        Math.round(
          foe.attack * rawAttackMult +
            randInt(-GAME_CONFIG.attackVariance, GAME_CONFIG.attackVariance)
        )
      );

      const live = playerRef.current;
      const dmgResult = calcDamageToPlayer(rawAttack, {
        hasBlockBuff: live?.hasBlockBuff,
        defense: getEffectiveDefense(live, battleTurnRef.current),
        blockReduction: GAME_CONFIG.blockReduction,
        blockReductionOverride: live?.blockReductionNext,
      });
      const { damage } = dmgResult;

      if (live?.hasReflectGuard) {
        const reflectDmg = Math.max(1, Math.floor(damage * 0.5));
        const healAmt = Math.floor(damage * 0.1);
        addLogEntry(
          t("battle.aegisReflect", { reflect: reflectDmg, heal: healAmt, name: foe.name }),
          "good"
        );
        spawnFloat(`+${healAmt} HP`, "player", "#00ff99");
        spawnFloat(`↩−${reflectDmg}`, "enemy", "#88ccff");
        const healedHp = Math.min(live.maxHp, (live.hp ?? p.hp) + healAmt);
        commitPlayer({
          ...live,
          hp: healedHp,
          hasReflectGuard: false,
          hasBlockBuff: false,
          blockReductionNext: null,
          skills: tickCooldowns(live.skills),
        });
        setEnemy((prev) => {
          if (!prev) return prev;
          const reflectedHp = Math.max(0, prev.hp - reflectDmg);
          if (reflectedHp <= 0) {
            clearAllTimers();
            enemyTurnInFlightRef.current = false;
            schedule(GAME_CONFIG.winToEnemyTurn, () => processVictory());
          }
          return { ...prev, hp: reflectedHp };
        });
        queueMicrotask(() => {
          const currentFoe = enemyRef.current;
          if (currentFoe && currentFoe.hp <= 0) {
            finishEnemyTurn();
            return;
          }
          if (typeof afterEnemyTurn === "function") {
            finishEnemyTurn();
          } else {
            beginPlayerTurn();
            finishEnemyTurn();
          }
        });
        return;
      }

      addLogEntry(formatPlayerDamageLog(foe, dmgResult, specialName), "bad");
      spawnFloat(`−${damage} HP`, "player", "#ff4444");
      triggerShake("player");
      triggerFlash("red");

      if (live?.hasPoisonShield && dmgResult.wasBlocked) {
        setEnemy((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            poisonTurnsLeft: 3,
            poisonPct: 0.3334,
            poisonStack: 0,
          };
        });
        addLogEntry(t("battle.poisonShieldProc", { name: foe.name }), "good");
      }

      const newHp = Math.max(0, (live?.hp ?? p.hp) - damage);
      commitPlayer({
        ...(live ?? p),
        hp: newHp,
        hasBlockBuff: false,
        blockReductionNext: null,
        hasPoisonShield: false,
        skills: tickCooldowns((live ?? p).skills),
      });

      if (newHp <= 0) {
        finishEnemyTurn();
        schedule(600, () => processDeath());
        return;
      }

      queueMicrotask(() => {
        if (typeof afterEnemyTurn === "function") {
          finishEnemyTurn();
        } else {
          beginPlayerTurn();
          finishEnemyTurn();
        }
      });
    });
  }

  function processVictory() {
    const foe = enemyRef.current;
    if (!foe) return;

    const classKey = playerRef.current?.classKey;
    const currentRound = roundRef.current;
    if (classKey && isBossRound(currentRound)) {
      commitSave(recordBossDefeat(saveRef.current, classKey, currentRound));
    }

    const nextRound = currentRound + 1;
    if (
      classKey &&
      nextRound === BATTLE_SCALING.megaBossRound &&
      isBossRound(nextRound) &&
      !canAutoSkipBoss(saveRef.current, classKey, nextRound)
    ) {
      setAutoEnabled(false);
      setAutoPaused(false);
    }

    const newStreak = streakRef.current + 1;
    const multiplier = getStreakMultiplier(newStreak);
    const earned = Math.round(foe.reward * multiplier * GAME_CONFIG.rewardMultiplier);

    setStreak(newStreak);
    setBestStreak((prev) => Math.max(prev, newStreak));
    addWallet(earned);
    setKills((prev) => prev + 1);

    spawnFloat(`+${earned}💰`, "enemy", "#FFD700");
    triggerFlash("gold");
    triggerStreakPop();

    const bonusText = multiplier > 1 ? ` (×${multiplier} STREAK!)` : "";
    addLogEntry(`☠️ ${foe.name} slain! +${earned} coins${bonusText}`, "victory");
    if (newStreak >= 3) {
      addLogEntry(`🔥 STREAK ${newStreak}! The coins flow!`, "streak");
    }

    schedule(GAME_CONFIG.victoryDelay, () => {
      transitionToNextFloor(nextRound);
    });
  }

  /** Player acts, then at most one enemy turn if the foe survives. */
  function submitCommand(playerActionFn) {
    if (turnRef.current !== "player") return;
    const p = playerRef.current;
    const foe = enemyRef.current;
    if (!p || !foe) return;

    setIsSkillsMenuOpen(false);
    playerActionFn();
  }

  function processDeath() {
    afterburnRef.current = null;
    setBattleTurn(0);
    battleTurnRef.current = 0;
    setAutoEnabled(false);
    setAutoPaused(false);
    addLogEntry("💀 You have fallen. The gauntlet ends.", "bad");
    commitSave({ ...saveRef.current, wallet: walletRef.current });
    updateRecordsFromRun();
    schedule(GAME_CONFIG.deathDelay, () => setScene("gameover"));
  }

  // ── Camp / shop ──

  function selectClass(classKey) {
    if (!isComboClassKey(classKey) && !isBaseClassUnlocked(saveRef.current, classKey)) {
      return;
    }
    if (isComboClassKey(classKey)) {
      if (!isComboUnlockedBySave(saveRef.current, classKey)) return;
      const next = { ...saveRef.current };
      ensureComboMeta(next, classKey);
      commitSave(next);
    } else {
      const next = mergeMissingClassMetas(saveRef.current);
      ensureClassMeta(next, classKey);
      if (next !== saveRef.current) commitSave(next);
    }
    setSelectedClassKey(classKey);
    setScene("shop");
  }

  function patchClassMeta(classKey, patch) {
    const meta = getClassMetaFromSave(saveRef.current, classKey);
    let nextSave = {
      ...saveRef.current,
      classes: {
        ...saveRef.current.classes,
        [classKey]: { ...meta, ...patch },
      },
    };
    nextSave = syncMageKnightUnlock(nextSave);
    commitSave(nextSave);
  }

  function buyHpBoost() {
    const key = selectedClassKey;
    if (!key) return;
    const meta = getClassMetaFromSave(saveRef.current, key);
    const maxHp = getShopMaxBoost(key);
    if (meta.hpBoost >= maxHp) return;
    const price = shopPriceForClass(key, SHOP_CONFIG.hpPrice, meta.hpBoost);
    if (!spendWallet(price)) return;
    patchClassMeta(key, { hpBoost: meta.hpBoost + 1 });
  }

  function buyAtkBoost() {
    const key = selectedClassKey;
    if (!key) return;
    const meta = getClassMetaFromSave(saveRef.current, key);
    const maxAtk = getShopMaxBoost(key);
    if (meta.atkBoost >= maxAtk) return;
    const price = shopPriceForClass(key, SHOP_CONFIG.atkPrice, meta.atkBoost);
    if (!spendWallet(price)) return;
    patchClassMeta(key, { atkBoost: meta.atkBoost + 1 });
  }

  function buyDefBoost() {
    const key = selectedClassKey;
    if (!key) return;
    const meta = getClassMetaFromSave(saveRef.current, key);
    const maxDef = getShopMaxBoost(key);
    if (meta.defBoost >= maxDef) return;
    const price = shopPriceForClass(key, SHOP_CONFIG.defPrice, meta.defBoost);
    if (!spendWallet(price)) return;
    patchClassMeta(key, { defBoost: meta.defBoost + 1 });
  }

  function buyWeapon(weaponId) {
    const key = selectedClassKey;
    if (!key) return;
    const weapon = getWeaponById(weaponId);
    if (!weapon || weapon.classKey !== key) return;
    const meta = getClassMetaFromSave(saveRef.current, key);

    if (meta.ownedWeaponIds.includes(weaponId)) {
      patchClassMeta(key, { equippedWeaponId: weaponId });
      return;
    }

    if (!spendWallet(weapon.price)) return;
    patchClassMeta(key, {
      ownedWeaponIds: [...meta.ownedWeaponIds, weaponId],
      equippedWeaponId: weaponId,
    });
  }

  function buySkillUpgrade(skillId) {
    const key = selectedClassKey;
    if (!key) return;
    const meta = getClassMetaFromSave(saveRef.current, key);
    const level = meta.skillLevels[skillId] ?? 0;
    const maxLv = getShopMaxSkillLevel(key);
    if (level >= maxLv) return;
    const price = shopPriceForClass(key, SHOP_CONFIG.skillPrice, level);
    if (!spendWallet(price)) return;
    patchClassMeta(key, {
      skillLevels: { ...meta.skillLevels, [skillId]: level + 1 },
    });
  }

  // ── Player actions (called by UI) ──

  function startGame(classKey) {
    clearAllTimers();
    clearEnemyFreeze();
    afterburnRef.current = null;
    if (isComboClassKey(classKey)) {
      ensureComboMeta(saveRef.current, classKey);
    }
    const playerState = buildPlayer(
      classKey,
      getClassMetaFromSave(saveRef.current, classKey),
      saveRef.current
    );
    setPlayer(playerState);
    setEnemy(buildEnemy(1));
    setRunCoinsEarned(0);
    setStreak(0);
    setBestStreak(0);
    setKills(0);
    setRound(1);
    setEnemyFrozen(false);
    setIsSkillsMenuOpen(false);
    setAutoEnabled(false);
    setAutoPaused(false);
    setBattleSpeedIndex(0);
    setBattleTurn(0);
    battleTurnRef.current = 0;
    setTurn("player");
    setLog([
      { message: "⚔️ The boss rush begins. No mercy.", type: "system", id: 1 },
      {
        message: `👁️ "${buildEnemy(1).lore}"`,
        type: "lore",
        id: 2,
      },
    ]);
    setScene("battle");
    unlockAudio();
    playThemeForRound(1);
  }

  function scaleFightDamageForClass(damage, p, foe) {
    if (!p || !foe) return damage;
    if (p.classKey === "arcanist" && foe.hp < foe.maxHp) {
      return Math.max(1, Math.round(damage * 1.33));
    }
    if (p.classKey === "plaguecat" && (foe.poisonTurnsLeft ?? 0) > 0) {
      return Math.max(1, Math.round(damage * 2));
    }
    return damage;
  }

  function performFight() {
    const p = playerRef.current;
    const foe = enemyRef.current;
    if (!p || !foe) return;

    const battleTurn = battleTurnRef.current;
    const atk = getEffectiveAttack(p, battleTurn);
    const warCry = isWarCryBuffActive(p, battleTurn);

    if (p.classKey === "duelist") {
      const hit1 = rollFightDamage(
        atk,
        GAME_CONFIG.attackVariance,
        false,
        GAME_CONFIG.critMultiplier
      );
      const dmg1 = scaleFightDamageForClass(hit1.damage, p, foe);
      const hit2Raw = Math.max(
        1,
        Math.round(atk * 1.5) +
          randInt(-GAME_CONFIG.attackVariance, GAME_CONFIG.attackVariance)
      );
      const dmg2 = scaleFightDamageForClass(hit2Raw, p, foe);
      addLogEntry(
        `⚔️ FIGHT! ${p.weapon} strikes ${foe.name} for ${dmg1}, then ${dmg2}!`,
        "good"
      );
      spawnFloat(`−${dmg1}`, "enemy", hit1.isCrit ? "#ff8c00" : "#FFD700");
      triggerShake("enemy");
      resolveEnemyDamage(dmg1, () => {
        const current = enemyRef.current;
        if (!current || current.hp <= 0) return;
        spawnFloat(`−${dmg2}`, "enemy", "#FFD700");
        triggerShake("enemy");
        dealDamageToEnemy(
          dmg2,
          false,
          `⚔️ Second strike — ${dmg2} damage!`,
          null
        );
      });
      return;
    }

    const { damage: raw, isCrit: crit } = rollFightDamage(
      atk,
      GAME_CONFIG.attackVariance,
      false,
      GAME_CONFIG.critMultiplier
    );
    const damage = scaleFightDamageForClass(raw, p, foe);
    const buffNote = warCry ? " 📯 War Cry!" : "";
    dealDamageToEnemy(
      damage,
      crit,
      `⚔️ FIGHT! ${p.weapon} strikes ${foe.name} for ${damage}!${buffNote}`
    );
  }

  function actionFight() {
    if (turn !== "player") return;
    submitCommand(performFight);
  }

  function actionDefend() {
    if (turn !== "player") return;
    setIsSkillsMenuOpen(false);
    submitCommand(() => {
      const p = playerRef.current;
      if (!p) return;
      addLogEntry(t("battle.defendLog"), "good");
      spawnFloat("🛡️", "player", "#6699cc");
      commitPlayer({
        ...p,
        hasBlockBuff: true,
        blockReductionNext: GAME_CONFIG.defendBlockReduction,
      });
      scheduleAfterPlayerAction();
    });
  }

  function actionRetreat() {
    if (turn !== "player") return;
    setIsSkillsMenuOpen(false);

    if (isBossRound(roundRef.current)) {
      addLogEntry("☠️ Cannot RUN from a boss fight!", "bad");
      return;
    }

    const lost = runCoinsEarnedRef.current;
    const msg =
      lost > 0
        ? `Retreat to camp? You will lose ${lost.toLocaleString()} coins earned this run.`
        : "Retreat to camp? Your streak will end.";
    if (!window.confirm(msg)) return;

    clearAllTimers();
    enemyTurnInFlightRef.current = false;
    clearEnemyFreeze();
    afterburnRef.current = null;

    if (lost > 0) {
      const nextWallet = Math.max(0, walletRef.current - lost);
      walletRef.current = nextWallet;
      setWallet(nextWallet);
      commitSave({ ...saveRef.current, wallet: nextWallet });
    }

    setRunCoinsEarned(0);
    runCoinsEarnedRef.current = 0;
    setStreak(0);
    setKills(0);
    setBestStreak(0);
    setPlayer(null);
    setEnemy(null);
    setEnemyFrozen(false);
    setTurn("player");
    setIsSkillsMenuOpen(false);
    setLog([]);
    setBattleTurn(0);
    battleTurnRef.current = 0;
    updateRecordsFromRun(roundRef.current);
    setScene("shop");
  }

  function actionMagic(skillIndex) {
    if (turn !== "player") return;
    const p = playerRef.current;
    if (!p) return;
    const skill = p.skills[skillIndex];
    if (!skill || skill.currentCooldown > 0) return;
    submitCommand(() => {
      const live = playerRef.current;
      if (!live?.skills?.[skillIndex]) return;
      if (live.skills[skillIndex].currentCooldown > 0) return;
      const skills = applySkillCastCooldown(live.skills, skillIndex);
      const next = { ...live, skills };
      playerRef.current = next;
      setPlayer(next);
      executeSkill(next.skills[skillIndex]);
    });
  }

  function openSkillsMenu() {
    if (turn !== "player") return;
    setIsSkillsMenuOpen(true);
  }

  /**
   * Execute a skill based on its type.
   * This is the main dispatch for all skill effects.
   * To add a new skill type, add a case here.
   */
  function executeSkill(skill) {
    const p = playerRef.current;
    const foe = enemyRef.current;
    const classKey = p?.classKey ?? "";
    const upgradeLevel = skill.upgradeLevel ?? 0;
    const battleTurn = battleTurnRef.current;
    const effectiveAtk = getEffectiveAttack(p, battleTurn);
    const skillDamage = (sk) =>
      isComboClassKey(classKey)
        ? calcComboSkillDamage(sk, effectiveAtk, upgradeLevel, classKey)
        : calcSkillDamage(sk, effectiveAtk, upgradeLevel);

    switch (skill.type) {
      case "damage":
      case "damage_afterburn": {
        let damage = skillDamage(skill);
        let meltNote = "";
        if (skill.type === "damage_afterburn") {
          if (meltFreezeOnEnemy()) {
            damage = Math.max(1, Math.round(damage * GAME_CONFIG.fireMeltBonus));
            meltNote = ` ${t("battle.fireMelt")}`;
          }
          let carriers = afterburnCarriers(upgradeLevel);
          if (classKey === "sage") {
            carriers = Math.max(2, carriers + 1);
          }
          afterburnRef.current = {
            skillLevel: upgradeLevel,
            carriersLeft: carriers,
          };
        }
        const afterburnNote =
          skill.type === "damage_afterburn" ? ` ${t("battle.afterburnPrimed")}` : "";
        dealDamageToEnemy(
          damage,
          skill.isCrit || false,
          `${skill.icon} ${skill.name}! ${damage} damage to ${foe?.name ?? "the enemy"}!${meltNote}${afterburnNote}`
        );
        break;
      }

      case "damage_freeze": {
        const damage = skillDamage(skill);
        const freezeTurns = classKey === "sage" ? randInt(2, 4) : randInt(1, 3);
        setEnemy((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            hp: Math.max(0, prev.hp - damage),
            freezeTurnsLeft: freezeTurns,
          };
        });
        enemyFrozenRef.current = true;
        setEnemyFrozen(true);
        addLogEntry(
          t("battle.freezeApply", {
            icon: skill.icon,
            name: skill.name,
            damage,
            foe: foe?.name ?? "Enemy",
            turns: freezeTurns,
          }),
          "good"
        );
        spawnFloat(`❄️−${damage}`, "enemy", "#00cfff");
        triggerShake("enemy");
        resolveEnemyDamage(damage);
        break;
      }

      case "damage_steal": {
        const damage = skillDamage(skill);
        const stolen = randInt(...skill.stealRange);
        addLogEntry(`${skill.icon} ${skill.name}! ${damage} damage + stole ${stolen} coins!`, "good");
        spawnFloat(`−${damage}`, "enemy", "#FFD700");
        spawnFloat(`+${stolen}💰`, "player", "#FFD700");
        triggerShake("enemy");
        addWallet(stolen);
        resolveEnemyDamage(damage);
        break;
      }

      case "heal": {
        const heal = skill.healAmount;
        addLogEntry(`${skill.icon} ${skill.name}! Restored ${heal} HP!`, "good");
        spawnFloat(`+${heal} HP`, "player", "#00ff99");
        commitPlayer((p) => ({ ...p, hp: Math.min(p.maxHp, p.hp + heal) }));
        setTurn("animating");
        schedule(GAME_CONFIG.actionToEnemyTurn, () => {
          setTurn("enemy");
          processEnemyTurn();
        });
        break;
      }

      case "heal_block": {
        const heal = skill.healAmount;
        addLogEntry(`${skill.icon} ${skill.name}! Bracing & restoring ${heal} HP!`, "good");
        spawnFloat(`+${heal} HP`, "player", "#00ff99");
        commitPlayer((p) => ({
          ...p,
          hp: Math.min(p.maxHp, p.hp + heal),
          hasBlockBuff: true,
          blockReductionNext: skill.blockReduction ?? GAME_CONFIG.blockReduction,
        }));
        setTurn("animating");
        schedule(GAME_CONFIG.actionToEnemyTurn, () => {
          setTurn("enemy");
          processEnemyTurn();
        });
        break;
      }

      case "buff_war_cry": {
        const turns = GAME_CONFIG.warCryBuffTurns;
        const mult = GAME_CONFIG.warCryStatMult;
        addLogEntry(
          t("battle.warCry", {
            icon: skill.icon,
            name: skill.name,
            turns,
            mult: Math.round(mult * 100),
          }),
          "good"
        );
        spawnFloat(`📯×${turns}`, "player", "#ff8c00");
        commitPlayer((p) => ({
          ...p,
          warCryBuffExpiresOnTurn: battleTurnRef.current + turns,
        }));
        setTurn("animating");
        schedule(GAME_CONFIG.actionToEnemyTurn, () => {
          setTurn("enemy");
          processEnemyTurn();
        });
        break;
      }

      case "buff_dodge": {
        addLogEntry(`${skill.icon} ${skill.name}! You'll evade the next attack!`, "good");
        spawnFloat("💨 EVASION", "player", "#aaaaff");
        commitPlayer((p) => ({ ...p, hasDodgeBuff: true }));
        scheduleAfterPlayerAction();
        break;
      }

      case "apply_poison": {
        const chip =
          skill.damageBase != null || skill.attackScale != null
            ? skillDamage(skill)
            : 0;
        const poisonTurns = skill.poisonTurns ?? 3;
        const poisonPct = skill.poisonPct ?? 0.3334;
        setEnemy((prev) => {
          if (!prev) return prev;
          const hp = chip > 0 ? Math.max(0, prev.hp - chip) : prev.hp;
          return {
            ...prev,
            hp,
            poisonTurnsLeft: poisonTurns,
            poisonPct,
            poisonCompound: classKey === "sage",
            poisonStack: 0,
          };
        });
        addLogEntry(
          `${skill.icon} ${skill.name}! ${foe?.name ?? "Enemy"} is poisoned (${poisonTurns} turns).`,
          "good"
        );
        if (chip > 0) {
          spawnFloat(`☠️−${chip}`, "enemy", "#aa44ff");
          triggerShake("enemy");
        }
        setTurn("animating");
        schedule(GAME_CONFIG.actionToEnemyTurn, () => {
          const current = enemyRef.current;
          if (current && current.hp <= 0) {
            clearAllTimers();
            enemyTurnInFlightRef.current = false;
            processVictory();
            return;
          }
          setTurn("enemy");
          processEnemyTurn();
        });
        break;
      }

      case "reflect_guard": {
        addLogEntry(`${skill.icon} ${skill.name}! Mirror ready — next hit reflects!`, "good");
        spawnFloat("🪞 GUARD", "player", "#88ccff");
        commitPlayer((pl) => ({ ...pl, hasReflectGuard: true }));
        scheduleAfterPlayerAction();
        break;
      }

      case "combo_light": {
        const damage = skillDamage(skill);
        commitPlayer((pl) => ({ ...pl, hp: pl.maxHp }));
        spawnFloat("FULL HP", "player", "#00ff99");
        dealDamageToEnemy(
          damage,
          false,
          `${skill.icon} ${skill.name}! ${damage} damage — fully healed!`
        );
        break;
      }

      case "combo_bio": {
        const damage = skillDamage(skill);
        const poisonTurns = skill.poisonTurns ?? 3;
        setEnemy((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            hp: Math.max(0, prev.hp - damage),
            poisonTurnsLeft: poisonTurns,
            poisonPct: skill.poisonPct ?? 0.3334,
            poisonCompound: true,
            poisonStack: 0,
          };
        });
        addLogEntry(
          `${skill.icon} ${skill.name}! ${damage} damage — ${foe?.name ?? "Enemy"} is poisoned.`,
          "good"
        );
        spawnFloat(`☠️−${damage}`, "enemy", "#aa44ff");
        triggerShake("enemy");
        resolveEnemyDamage(damage);
        break;
      }

      case "combo_poison_shield": {
        const heal = skill.healAmount ?? 2;
        addLogEntry(`${skill.icon} ${skill.name}! Bracing — poison ready on block!`, "good");
        spawnFloat(`+${heal} HP`, "player", "#00ff99");
        commitPlayer((pl) => ({
          ...pl,
          hp: Math.min(pl.maxHp, pl.hp + heal),
          hasBlockBuff: true,
          blockReductionNext: skill.blockReduction ?? GAME_CONFIG.blockReduction,
          hasPoisonShield: true,
        }));
        setTurn("animating");
        schedule(GAME_CONFIG.actionToEnemyTurn, () => {
          setTurn("enemy");
          processEnemyTurn();
        });
        break;
      }

      case "combo_nuke_punish":
      case "combo_dark_nuke": {
        const damage = skillDamage(skill);
        const punish = skill.punishCooldown ?? 2;
        dealDamageToEnemy(
          damage,
          false,
          `${skill.icon} ${skill.name}! ${damage} devastation!`,
          () => {
            commitPlayer((pl) =>
              pl ? { ...pl, skills: bumpAllSkillCooldowns(pl.skills, punish) } : pl
            );
          }
        );
        break;
      }

      case "combo_toxic_smoke": {
        const poisonTurns = skill.poisonTurns ?? 3;
        addLogEntry(`${skill.icon} ${skill.name}! Toxic veil — evade and poison!`, "good");
        spawnFloat("💨☠️", "player", "#aa44ff");
        commitPlayer((pl) => ({ ...pl, hasDodgeBuff: true }));
        setEnemy((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            poisonTurnsLeft: poisonTurns,
            poisonPct: skill.poisonPct ?? 0.3334,
            poisonCompound: true,
            poisonStack: 0,
          };
        });
        scheduleAfterPlayerAction();
        break;
      }

      case "damage_lifesteal": {
        const damage = skillDamage(skill);
        const ls =
          skill.lifestealPercent ?? lifestealPercent(upgradeLevel);
        dealDamageToEnemy(
          damage,
          false,
          `${skill.icon} ${skill.name}! ${damage} damage to ${foe?.name ?? "the enemy"}!`,
          (dealt) => {
            const heal = Math.floor(dealt * ls);
            if (heal <= 0) return;
            commitPlayer((pl) => ({
              ...pl,
              hp: Math.min(pl.maxHp, pl.hp + heal),
            }));
            spawnFloat(`+${heal} HP`, "player", "#cc2244");
            addLogEntry(t("battle.lifestealHeal", { heal }), "good");
          }
        );
        break;
      }

      default:
        console.warn(`Unknown skill type: ${skill.type}`);
    }
  }

  // ── Public API ──

  return {
    // State
    scene,
    selectedClassKey,
    player,
    enemy,
    turn,
    wallet,
    runCoinsEarned,
    streak,
    bestStreak,
    kills,
    round,
    log,
    isSkillsMenuOpen,
    enemyFrozen,
    autoEnabled,
    autoPaused,
    battleSpeedMultiplier,
    battleSpeedIndex,
    allTimeRecords,
    floatingNumbers,
    shakeTarget,
    flashType,
    streakPop,
    coinPop,
    battleTurn,

    // Derived
    isPlayerTurn: turn === "player",
    streakMultiplier: getStreakMultiplier(streak),
    classMeta: selectedClassKey
      ? getClassMetaFromSave(save, selectedClassKey)
      : null,
    canAutoSkipBoss: (classKey, roundNum) =>
      canAutoSkipBoss(saveRef.current, classKey, roundNum),
    mageKnightUnlocked: isMageKnightUnlocked(save),
    save,
    locale: save.locale === "es" ? "es" : "en",

    // Actions
    setScene,
    setLocalePreference,
    selectClass,
    startGame,
    buyHpBoost,
    buyAtkBoost,
    buyDefBoost,
    buyWeapon,
    buySkillUpgrade,
    actionFight,
    actionDefend,
    actionRetreat,
    actionMagic,
    openSkillsMenu,
    setIsSkillsMenuOpen,
    setAutoEnabled,
    setAutoPaused,
    setBattleSpeedIndex,
    resumeAutoAfterToggle,
    toggleAuto,
    isBossRound: (r) => isBossRound(r ?? round),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════

const COLORS = {
  bg: "#080810",
  surface: "rgba(255,255,255,0.03)",
  surfaceBorder: "rgba(200,169,110,0.2)",
  arenaBorder: "rgba(200,169,110,0.14)",
  text: "#e8dcc8",
  gold: "#FFD700",
  red: "#ff4444",
  green: "#00ff99",
  muted: "#555",
  dimmed: "#333",

  // Log entry colors
  logBad: "#ff6666",
  logGood: "#88dd88",
  logVictory: "#FFD700",
  logStreak: "#ff8c00",
  logLore: "#9988aa",
  logSystem: "#6688aa",
  logInfo: "#777",

  // Action button colors
  fight: "#c8a96e",
  fightBorder: "#6a5a30",
  skill: "#7e9cd8",
  skillBorder: "#3a5080",
  block: "#7aa89f",
  blockBorder: "#3a6058",
  run: "#957f9b",
  runBorder: "#4a3a50",
};

const LOG_COLORS = {
  bad: COLORS.logBad,
  good: COLORS.logGood,
  victory: COLORS.logVictory,
  streak: COLORS.logStreak,
  lore: COLORS.logLore,
  system: COLORS.logSystem,
  info: COLORS.logInfo,
};

/** Full-viewport screen shell — prevents page scroll; respects safe areas. */
const screenShellBase = {
  fontFamily: "'Press Start 2P', monospace",
  background: COLORS.bg,
  height: "100dvh",
  minHeight: "100dvh",
  maxHeight: "100dvh",
  boxSizing: "border-box",
  color: COLORS.text,
};

const screenShellFixed = {
  ...screenShellBase,
  overflow: "hidden",
  paddingTop: "max(12px, env(safe-area-inset-top))",
  paddingBottom: "max(12px, env(safe-area-inset-bottom))",
  paddingLeft: "max(12px, env(safe-area-inset-left))",
  paddingRight: "max(12px, env(safe-area-inset-right))",
};

const screenShellScroll = {
  ...screenShellBase,
  overflowY: "auto",
  overflowX: "hidden",
  WebkitOverflowScrolling: "touch",
  paddingTop: "max(12px, env(safe-area-inset-top))",
  paddingBottom: "max(12px, env(safe-area-inset-bottom))",
  paddingLeft: "max(16px, env(safe-area-inset-left))",
  paddingRight: "max(16px, env(safe-area-inset-right))",
};

const CSS_KEYFRAMES = `
  @keyframes floatUp {
    0%   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
    55%  { opacity: 1; transform: translateX(-50%) translateY(-38px) scale(1.3); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-68px) scale(0.7); }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%      { transform: translateX(-10px); }
    40%      { transform: translateX(10px); }
    60%      { transform: translateX(-7px); }
    80%      { transform: translateX(7px); }
  }

  @keyframes pop {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.7); }
    100% { transform: scale(1); }
  }

  @keyframes coinBounce {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.3) translateY(-3px); }
  }

  @keyframes hpCriticalGlow {
    0%, 100% { box-shadow: 0 0 6px rgba(255,68,68,0.9); }
    50%      { box-shadow: 0 0 22px rgba(255,0,0,1); }
  }

  @keyframes hpWarningGlow {
    0%, 100% { box-shadow: 0 0 6px rgba(204,136,0,0.9); }
    50%      { box-shadow: 0 0 22px rgba(255,140,0,1); }
  }

  @keyframes goldPulse {
    0%, 100% { text-shadow: 0 0 14px #FFD700, 0 0 28px #ff8c00; }
    50%      { text-shadow: 0 0 30px #FFD700, 0 0 70px #ff8c00; }
  }

  @keyframes logSlideIn {
    from { opacity: 0; transform: translateX(-6px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes bgFlashGold {
    0%, 100% { background: #080810; }
    50%      { background: #1a1200; }
  }

  @keyframes bgFlashRed {
    0%, 100% { background: #080810; }
    50%      { background: #1a0000; }
  }
`;

// ═══════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

/** Floating damage/heal number that animates up and fades out */
function FloatingNumber({ text, color }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "-5px",
        pointerEvents: "none",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "13px",
        whiteSpace: "nowrap",
        textShadow: "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000",
        animation: "floatUp 1.4s ease-out forwards",
        zIndex: 99,
        color,
      }}
    >
      {text}
    </div>
  );
}

/** HP bar with glow animation when low */
function HpBar({ current, max, isPlayer }) {
  const pct = Math.round((current / max) * 100);
  const isLow = current <= (isPlayer ? 3 : max * 0.25);

  const barBg = isPlayer ? "#001400" : "#1a0000";
  const barBorder = isPlayer ? "#103010" : "#3a1010";

  let fillGradient, glowAnimation;
  if (isPlayer) {
    fillGradient = isLow
      ? "linear-gradient(90deg, #7B4000, #cc8800)"
      : "linear-gradient(90deg, #006600, #00cc44)";
    glowAnimation = isLow ? "hpWarningGlow 0.8s infinite" : "none";
  } else {
    fillGradient = "linear-gradient(90deg, #7B0000, #dd2222)";
    glowAnimation = isLow ? "hpCriticalGlow 1s infinite" : "none";
  }

  return (
    <div
      style={{
        width: "100%",
        height: 8,
        background: barBg,
        borderRadius: 4,
        border: `1px solid ${barBorder}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: fillGradient,
          borderRadius: 4,
          transition: "width 0.4s ease",
          animation: glowAnimation,
        }}
      />
    </div>
  );
}

const SPRITE_DEBUG =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("debugSprites");

/** Pixel sprite with emoji fallback when PNG missing */
function CharacterSprite({ src, fallbackIcon, size, dead, debugLabel }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  useEffect(() => {
    if (!SPRITE_DEBUG || !debugLabel) return;
    console.info("[sprite]", debugLabel, { src, failed });
  }, [src, failed, debugLabel]);

  if (!src || failed) {
    return (
      <div
        style={{
          fontSize: size,
          lineHeight: 1,
          filter: dead ? "grayscale(1) opacity(0.25)" : "none",
          transition: "filter 0.4s",
        }}
      >
        {fallbackIcon}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => {
        if (SPRITE_DEBUG && debugLabel) {
          console.warn("[sprite] load failed", debugLabel, src);
        }
        setFailed(true);
      }}
      style={{
        display: "block",
        imageRendering: "pixelated",
        filter: dead ? "grayscale(1) opacity(0.25)" : "none",
        transition: "filter 0.4s",
      }}
    />
  );
}

/** Character display (used for both enemy and player) */
function CombatantDisplay({
  name,
  hp,
  maxHp,
  icon,
  spriteSrc,
  spriteFlip,
  isPlayer,
  isDead,
  floats,
  buffs,
  shaking,
}) {
  const nameColor = isPlayer ? "#55cc55" : "#cc5555";
  const portraitSize = isPlayer ? 76 : 68;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        animation: shaking ? "shake 0.42s ease" : "none",
      }}
    >
      {/* Name row (enemy: above icon; player: below icon) */}
      {!isPlayer && (
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 9, color: nameColor }}>
          <span>{name}</span>
          <span>{hp}/{maxHp} HP</span>
        </div>
      )}

      {/* HP bar (enemy: above icon; player: below icon) */}
      {!isPlayer && <HpBar current={hp} max={maxHp} isPlayer={false} />}

      {/* Character portrait */}
      <div
        style={{
          position: "relative",
          display: "inline-block",
          lineHeight: 1,
          margin: "6px 0",
          transform: spriteFlip ? "scaleY(-1)" : "none",
        }}
      >
        <CharacterSprite
          src={spriteSrc}
          fallbackIcon={icon}
          size={portraitSize}
          dead={isDead}
          debugLabel={SPRITE_DEBUG ? (isPlayer ? "player" : "enemy") : undefined}
        />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>
          {floats.map((f) => (
            <FloatingNumber key={f.id} text={f.text} color={f.color} />
          ))}
        </div>
      </div>

      {/* Player HP bar and name go below the icon */}
      {isPlayer && <HpBar current={hp} max={maxHp} isPlayer={true} />}
      {isPlayer && (
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 9, color: nameColor }}>
          <span style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
            {name}
            {(buffs?.warCryTurnsLeft ?? 0) > 0 && (
              <span style={{ color: "#ff8c00", fontSize: 7 }}>
                📯ATK/DEF×{buffs.warCryTurnsLeft}
              </span>
            )}
            {buffs?.hasDodgeBuff && <span style={{ color: "#aaaaff", fontSize: 7 }}>💨EVADE</span>}
            {buffs?.hasBlockBuff && <span style={{ color: "#6699cc", fontSize: 7 }}>🛡️GUARD</span>}
            {buffs?.enemyFrozen && <span style={{ color: "#00cfff", fontSize: 7 }}>❄️FROZEN(foe)</span>}
          </span>
          <span>{hp}/{maxHp}</span>
        </div>
      )}
    </div>
  );
}

/** FF1-style command grid */
function ActionButtons({ isPlayerTurn, onFight, onSkills, onDefend, onRun, runDisabled }) {
  const buttons = [
    { label: t("battle.fight"), color: COLORS.fight, border: COLORS.fightBorder, action: onFight, disabled: false },
    { label: t("battle.skills"), color: COLORS.skill, border: COLORS.skillBorder, action: onSkills, disabled: false },
    { label: t("battle.defend"), color: COLORS.block, border: COLORS.blockBorder, action: onDefend, disabled: false },
    { label: t("battle.run"), color: COLORS.run, border: COLORS.runBorder, action: onRun, disabled: runDisabled },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {buttons.map((btn) => {
        const canUse = isPlayerTurn && !btn.disabled;
        return (
        <button
          key={btn.label}
          onClick={btn.action}
          disabled={!canUse}
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 10,
            padding: "13px 6px",
            borderRadius: 5,
            cursor: canUse ? "pointer" : "not-allowed",
            border: `2px solid ${canUse ? btn.border : "#1a1a22"}`,
            background: canUse ? `${btn.color}22` : "#0a0a14",
            color: canUse ? btn.color : COLORS.dimmed,
            letterSpacing: 1,
            transition: "transform 0.12s, filter 0.12s, opacity 0.2s",
            opacity: canUse ? 1 : 0.25,
          }}
          onMouseEnter={(e) => { if (canUse) e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
        >
          {btn.label}
        </button>
      );})}
    </div>
  );
}

function BattleControlBar({
  autoEnabled,
  autoPaused,
  onToggleAuto,
  battleSpeedIndex,
  onCycleSpeed,
  speedMultiplier,
  musicMuted,
  onToggleMusic,
}) {
  const speedLabel = `${speedMultiplier}×`;
  const autoLabel = autoEnabled && !autoPaused
    ? t("battle.autoOn")
    : autoPaused
      ? t("battle.autoPaused")
      : t("battle.auto");
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={onToggleAuto}
        style={{
          flex: 1,
          minWidth: 100,
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 8,
          padding: "8px 4px",
          borderRadius: 5,
          cursor: "pointer",
          border: `2px solid ${autoEnabled && !autoPaused ? "#44cc66" : "#2a2a3a"}`,
          background: autoEnabled && !autoPaused ? "#44cc6622" : "#0a0a14",
          color: autoEnabled && !autoPaused ? "#44cc66" : COLORS.dimmed,
        }}
      >
        {autoLabel}
      </button>
      <button
        type="button"
        onClick={onCycleSpeed}
        style={{
          flex: 1,
          minWidth: 80,
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 8,
          padding: "8px 4px",
          borderRadius: 5,
          cursor: "pointer",
          border: "2px solid #6a5acd",
          background: "#6a5acd22",
          color: "#aaaaff",
        }}
      >
        ⏩ {speedLabel}
      </button>
      <button
        type="button"
        onClick={onToggleMusic}
        aria-label={musicMuted ? t("battle.musicOff") : t("battle.musicOn")}
        style={{
          minWidth: 48,
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 8,
          padding: "8px 4px",
          borderRadius: 5,
          cursor: "pointer",
          border: `2px solid ${musicMuted ? "#2a2a3a" : "#c8a96e"}`,
          background: musicMuted ? "#0a0a14" : "#c8a96e22",
          color: musicMuted ? COLORS.dimmed : COLORS.fight,
        }}
      >
        {musicMuted ? "🔇" : "♪"}
      </button>
    </div>
  );
}

/** Skill selection menu */
function SkillsMenu({ skills, onSelectSkill, onClose }) {
  return (
    <div
      style={{
        background: "#0c0c1c",
        border: "1px solid rgba(126,156,216,0.3)",
        borderRadius: 8,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxHeight: 220,
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: COLORS.skill, fontSize: 9, fontFamily: "'Press Start 2P', monospace" }}>
          {t("battle.skillsHeader")}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: COLORS.muted,
            cursor: "pointer",
            fontSize: 18,
            fontFamily: "inherit",
          }}
        >
          ✕
        </button>
      </div>

      {skills.map((skill, index) => {
        const onCooldown = skill.currentCooldown > 0;
        const isReady = !onCooldown;
        return (
          <button
            key={skill.id}
            onClick={() => isReady && onSelectSkill(index)}
            disabled={!isReady}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 6,
              cursor: isReady ? "pointer" : "not-allowed",
              border: `1px solid ${isReady ? "rgba(126,156,216,0.25)" : "#1a1a22"}`,
              background: isReady ? "#10102a" : "#080810",
              color: isReady ? COLORS.text : "#444",
              fontFamily: "'Press Start 2P', monospace",
              textAlign: "left",
              width: "100%",
              transition: "transform 0.12s",
              opacity: isReady ? 1 : 0.35,
            }}
            onMouseEnter={(e) => { if (isReady) e.currentTarget.style.transform = "translateX(4px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateX(0)"; }}
          >
            <span style={{ fontSize: 20, flexShrink: 0 }}>{skill.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 8, marginBottom: 4 }}>
                {skill.name}
                {skill.upgradeLevel != null ? ` · Lv.${skill.upgradeLevel}` : ""}
              </div>
              <div style={{ fontSize: 7, color: isReady ? "#666" : "#444" }}>{skill.description}</div>
            </div>
            <span
              style={{
                fontSize: 7,
                color: isReady ? "#335533" : "#ff5555",
                flexShrink: 0,
                textAlign: "right",
                lineHeight: 1.6,
              }}
            >
              {onCooldown ? `CD:${skill.currentCooldown}` : t("battle.skillReady")}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Scrollable battle log */
function BattleLog({ entries }) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div
      ref={logRef}
      style={{
        background: "#040408",
        border: "1px solid #141420",
        borderRadius: 6,
        padding: "8px 10px",
        height: 120,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{
            fontSize: 8,
            lineHeight: 1.8,
            fontFamily: "'Press Start 2P', monospace",
            color: LOG_COLORS[entry.type] || LOG_COLORS.info,
            animation: "logSlideIn 0.3s ease",
          }}
        >
          {entry.message}
        </div>
      ))}
    </div>
  );
}

/** Top HUD showing wallet, streak, and round */
function BattleHUD({
  wallet,
  streak,
  streakMultiplier,
  round,
  battleTurn,
  bestRound,
  coinPop,
  streakPop,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 14px",
        background: COLORS.surface,
        border: `1px solid ${COLORS.surfaceBorder}`,
        borderRadius: 6,
      }}
    >
      <div
        style={{
          color: COLORS.gold,
          fontSize: 11,
          fontFamily: "'Press Start 2P', monospace",
          animation: coinPop ? "coinBounce 0.5s ease" : "none",
        }}
      >
        💰 {wallet.toLocaleString()}
      </div>

      <div
        style={{
          color: streak >= 5 ? "#ff5500" : streak > 0 ? "#cc8800" : COLORS.dimmed,
          fontSize: streak >= 5 ? 12 : 9,
          fontFamily: "'Press Start 2P', monospace",
          transition: "font-size 0.3s",
          animation: streakPop ? "pop 0.5s ease" : "none",
        }}
      >
        {streak > 0 ? `🔥 ×${streak}` : "— —"}
        {streakMultiplier > 1 && (
          <span style={{ color: "#ff4400", fontSize: 7, marginLeft: 5 }}>
            ({streakMultiplier}× coins)
          </span>
        )}
      </div>

      <div
        style={{
          color: "#444",
          fontSize: 7,
          fontFamily: "'Press Start 2P', monospace",
          textAlign: "right",
          lineHeight: 1.6,
        }}
      >
        <div>{t("battle.turn", { turn: battleTurn })}</div>
        <div>
          {isFreePlayRound(round)
            ? `FLOOR ${round} · ${t("theme.freeplay")}`
            : `FLOOR ${round}/${SHOP_CONFIG.maxFloorLabel}`}
        </div>
        {bestRound > 0 && (
          <div style={{ color: "#665544", fontSize: 6 }}>BEST {bestRound}</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SCENE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function TitleScreen({ onStart, wallet, allTimeRecords, locale, onLocaleChange }) {
  return (
    <div
      style={{
        ...screenShellFixed,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        textAlign: "center",
        animation: "fadeUp 0.4s ease",
      }}
    >
      <div style={{ fontSize: 58, animation: "goldPulse 2s infinite" }}>⚔️</div>

      <div>
        <div style={{ fontSize: 19, color: COLORS.gold, textShadow: `0 0 20px ${COLORS.gold}`, marginBottom: 10 }}>
          BOSS RUSH
        </div>
        <div style={{ fontSize: 8, color: COLORS.muted, lineHeight: 2.2 }}>
          {t("title.tagline")}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 7, color: COLORS.muted }}>
        <span>{t("title.lang")}:</span>
        <button
          type="button"
          onClick={() => onLocaleChange("en")}
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 7,
            padding: "6px 10px",
            cursor: "pointer",
            border: `1px solid ${locale === "en" ? COLORS.fightBorder : "#2a2a3a"}`,
            background: locale === "en" ? `${COLORS.fight}22` : "#0a0a14",
            color: locale === "en" ? COLORS.fight : COLORS.dimmed,
          }}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => onLocaleChange("es")}
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 7,
            padding: "6px 10px",
            cursor: "pointer",
            border: `1px solid ${locale === "es" ? COLORS.fightBorder : "#2a2a3a"}`,
            background: locale === "es" ? `${COLORS.fight}22` : "#0a0a14",
            color: locale === "es" ? COLORS.fight : COLORS.dimmed,
          }}
        >
          ES
        </button>
      </div>

      {allTimeRecords && (
        <div
          style={{
            fontSize: 7,
            color: "#555",
            lineHeight: 2.4,
            borderTop: "1px solid #1a1a28",
            paddingTop: 12,
            width: "100%",
            maxWidth: 300,
          }}
        >
          <div style={{ color: "#666", marginBottom: 6 }}>{t("title.personalBest")}</div>
          <div>⚔️ {t("title.round")} {allTimeRecords.rounds}</div>
          <div>💰 {allTimeRecords.coins.toLocaleString()} {t("title.coins")}</div>
          <div>🔥 ×{allTimeRecords.streak} {t("title.streak")}</div>
        </div>
      )}

      <div style={{ fontSize: 8, color: COLORS.gold, marginBottom: 4 }}>
        {t("title.campWallet")} 💰 {wallet.toLocaleString()}
      </div>

      <div style={{ fontSize: 7, color: "#444", lineHeight: 2.8, maxWidth: 300 }}>
        {t("title.help1")}<br />
        {t("title.help2")}<br />
        {t("title.help3")}
      </div>

      <button
        onClick={onStart}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 12,
          padding: "16px 44px",
          borderRadius: 5,
          cursor: "pointer",
          border: `2px solid ${COLORS.fightBorder}`,
          background: `${COLORS.fight}22`,
          color: COLORS.fight,
          letterSpacing: 1,
        }}
      >
        {t("title.start")}
      </button>

      <div style={{ fontSize: 6, color: "#333", letterSpacing: 0.5 }}>
        v{__APP_VERSION__} · {__BUILD_ID__}
      </div>
    </div>
  );
}

function ShopAccordion({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: "#0c0c18",
        border: "1px solid #2a2a4a",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "12px 14px",
          background: "#10102a",
          border: "none",
          color: COLORS.fight,
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 8,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        {open ? "▼" : "▶"} {title}
      </button>
      {open && (
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
      )}
    </div>
  );
}

function ShopScreen({
  classKey,
  classMeta,
  save,
  wallet,
  onBuyHp,
  onBuyAtk,
  onBuyDef,
  onBuyWeapon,
  onBuySkill,
  onStart,
  onBack,
}) {
  const classDef = getLocalizedClass(classKey);
  const isCombo = isComboClassKey(classKey);
  const innate = isCombo ? getComboInnate(save, classKey) : null;
  const previewAttack = isCombo
    ? innate.attack + totalAtkBonus(classMeta?.atkBoost ?? 0)
    : CLASSES[classKey].attack + totalAtkBonus(classMeta?.atkBoost ?? 0);
  const weapons = getWeaponsForClass(classKey);
  const equippedId = classMeta?.equippedWeaponId;
  const priceMult = (base) => (isCombo ? comboShopPrice(base) : base);
  const shopMaxBoost = getShopMaxBoost(classKey);
  const shopMaxSkill = getShopMaxSkillLevel(classKey);

  const btnStyle = (enabled) => ({
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 8,
    padding: "10px 12px",
    borderRadius: 5,
    cursor: enabled ? "pointer" : "not-allowed",
    border: `1px solid ${enabled ? COLORS.fightBorder : "#1a1a22"}`,
    background: enabled ? `${COLORS.fight}22` : "#0a0a14",
    color: enabled ? COLORS.fight : COLORS.dimmed,
    width: "100%",
    textAlign: "left",
  });

  const skillBases = isCombo ? getComboSkillBases(classKey) : CLASSES[classKey].skills;

  return (
    <div
      style={{
        ...screenShellScroll,
        maxWidth: 440,
        margin: "0 auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        animation: "fadeUp 0.4s ease",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <CharacterSprite
            src={CLASS_SPRITES[spriteKeyForClass(classKey)]?.box}
            fallbackIcon={classDef.icon}
            size={48}
            dead={false}
          />
        </div>
        <div style={{ fontSize: 11, color: COLORS.fight }}>{classDef.name} — {t("shop.camp")}</div>
        <div style={{ fontSize: 10, color: COLORS.gold, marginTop: 8 }}>
          💰 {wallet.toLocaleString()} coins
        </div>
      </div>

      {isCombo && innate && classMeta && (
        <>
          <div
            style={{
              fontSize: 7,
              color: COLORS.muted,
              lineHeight: 2,
              padding: 12,
              background: "#0c0c18",
              border: "1px solid #2a2a4a",
              borderRadius: 8,
            }}
          >
            {t("shop.comboInnate", { parents: comboParentLabel(classKey), mult: innate.weaponMult.toFixed(2) })}
            <br />
            HP {innate.maxHp} · ATK {innate.attack} · DEF {innate.defense}
          </div>
          <ShopAccordion title={t("shop.comboUpgrades")}>
            <button
              type="button"
              disabled={
                classMeta.hpBoost >= shopMaxBoost ||
                wallet < priceMult(SHOP_CONFIG.hpPrice(classMeta.hpBoost))
              }
              onClick={onBuyHp}
              style={btnStyle(
                classMeta.hpBoost < shopMaxBoost &&
                  wallet >= priceMult(SHOP_CONFIG.hpPrice(classMeta.hpBoost))
              )}
            >
              ❤️ Max HP +{nextHpDelta(classMeta.hpBoost)} ({classMeta.hpBoost}/{shopMaxBoost}) — {priceMult(SHOP_CONFIG.hpPrice(classMeta.hpBoost))}💰
            </button>
            <button
              type="button"
              disabled={
                classMeta.atkBoost >= shopMaxBoost ||
                wallet < priceMult(SHOP_CONFIG.atkPrice(classMeta.atkBoost))
              }
              onClick={onBuyAtk}
              style={btnStyle(
                classMeta.atkBoost < shopMaxBoost &&
                  wallet >= priceMult(SHOP_CONFIG.atkPrice(classMeta.atkBoost))
              )}
            >
              ⚔️ Attack +{nextAtkDelta(classMeta.atkBoost)} ({classMeta.atkBoost}/{shopMaxBoost}) — {priceMult(SHOP_CONFIG.atkPrice(classMeta.atkBoost))}💰
            </button>
            <button
              type="button"
              disabled={
                classMeta.defBoost >= shopMaxBoost ||
                wallet < priceMult(SHOP_CONFIG.defPrice(classMeta.defBoost))
              }
              onClick={onBuyDef}
              style={btnStyle(
                classMeta.defBoost < shopMaxBoost &&
                  wallet >= priceMult(SHOP_CONFIG.defPrice(classMeta.defBoost))
              )}
            >
              🛡️ Defense +{nextDefDelta(classMeta.defBoost)} ({classMeta.defBoost}/{shopMaxBoost}) — {priceMult(SHOP_CONFIG.defPrice(classMeta.defBoost))}💰
            </button>
          </ShopAccordion>
        </>
      )}

      {!isCombo && classMeta && (
        <>
          <ShopAccordion title="Permanent boosts">
            <button
              type="button"
              disabled={classMeta.hpBoost >= shopMaxBoost || wallet < SHOP_CONFIG.hpPrice(classMeta.hpBoost)}
              onClick={onBuyHp}
              style={btnStyle(
                classMeta.hpBoost < shopMaxBoost &&
                  wallet >= SHOP_CONFIG.hpPrice(classMeta.hpBoost)
              )}
            >
              ❤️ Max HP +{nextHpDelta(classMeta.hpBoost)} ({classMeta.hpBoost}/{shopMaxBoost}) — {SHOP_CONFIG.hpPrice(classMeta.hpBoost)}💰
            </button>
            <button
              type="button"
              disabled={classMeta.atkBoost >= shopMaxBoost || wallet < SHOP_CONFIG.atkPrice(classMeta.atkBoost)}
              onClick={onBuyAtk}
              style={btnStyle(
                classMeta.atkBoost < shopMaxBoost &&
                  wallet >= SHOP_CONFIG.atkPrice(classMeta.atkBoost)
              )}
            >
              ⚔️ Attack +{nextAtkDelta(classMeta.atkBoost)} ({classMeta.atkBoost}/{shopMaxBoost}) — {SHOP_CONFIG.atkPrice(classMeta.atkBoost)}💰
            </button>
            <button
              type="button"
              disabled={classMeta.defBoost >= shopMaxBoost || wallet < SHOP_CONFIG.defPrice(classMeta.defBoost)}
              onClick={onBuyDef}
              style={btnStyle(
                classMeta.defBoost < shopMaxBoost &&
                  wallet >= SHOP_CONFIG.defPrice(classMeta.defBoost)
              )}
            >
              🛡️ Defense +{nextDefDelta(classMeta.defBoost)} ({classMeta.defBoost}/{shopMaxBoost}) — {SHOP_CONFIG.defPrice(classMeta.defBoost)}💰
            </button>
          </ShopAccordion>
        </>
      )}

      {classMeta && weapons.length > 0 && (
        <ShopAccordion title={t("shop.weapons")}>
          {weapons.map((w) => {
            const owned = classMeta.ownedWeaponIds.includes(w.id);
            const equipped = w.id === equippedId;
            const canBuy = !owned && wallet >= w.price;
            const label = equipped ? "EQUIPPED" : owned ? "EQUIP" : w.price === 0 ? "FREE" : `${w.price}💰`;
            return (
              <button
                key={w.id}
                type="button"
                disabled={!owned && !canBuy}
                onClick={() => onBuyWeapon(w.id)}
                style={{
                  ...btnStyle(owned || canBuy),
                  borderColor: equipped ? COLORS.gold : btnStyle(owned || canBuy).border,
                }}
              >
                {w.name} (×{w.attackMult} ATK) — {label}
                <div style={{ fontSize: 6, color: "#666", marginTop: 4 }}>{w.description}</div>
              </button>
            );
          })}
        </ShopAccordion>
      )}

      {classMeta && (
        <ShopAccordion title={t("shop.skillUpgrades")}>
          {skillBases.map((rawBase) => {
            const base = localizeSkillTemplate(rawBase);
            const level = classMeta.skillLevels[rawBase.id] ?? 0;
            const maxed = level >= shopMaxSkill;
            const price = isCombo
              ? priceMult(SHOP_CONFIG.skillPrice(level))
              : SHOP_CONFIG.skillPrice(level);
            const canBuy = !maxed && wallet >= price;
            return (
              <button
                key={rawBase.id}
                type="button"
                disabled={!canBuy}
                onClick={() => onBuySkill(rawBase.id)}
                style={btnStyle(canBuy)}
              >
                {base.icon} {base.name} Lv.{level}/{shopMaxSkill}
                {!maxed && (
                  <div style={{ fontSize: 6, color: "#666", marginTop: 4 }}>
                    Next: {describeSkillUpgrade(rawBase, level + 1, previewAttack, classKey)} — {price}💰
                  </div>
                )}
              </button>
            );
          })}
        </ShopAccordion>
      )}

      <button type="button" onClick={onStart} style={{ ...btnStyle(true), textAlign: "center", fontSize: 10 }}>
        {t("shop.start")}
      </button>
      <button type="button" onClick={onBack} style={{ ...btnStyle(true), textAlign: "center", color: COLORS.muted }}>
        {t("shop.back")}
      </button>
    </div>
  );
}

function ClassCard({ classKey, cls, onSelect, disabled, hint, hidden }) {
  const display = hidden
    ? {
        name: "???",
        icon: "❓",
        maxHp: "?",
        attack: "?",
        attackLabel: "",
        description: hint,
      }
    : cls;
  const spriteKey = classKey;

  return (
    <button
      type="button"
      className="class-select-card"
      onClick={() => !disabled && onSelect(classKey)}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 20px",
        background: "#0c0c18",
        border: `1px solid ${disabled ? "#1a1a22" : "#2a2a4a"}`,
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        width: "100%",
        maxWidth: 380,
        color: disabled ? COLORS.dimmed : COLORS.text,
        fontFamily: "'Press Start 2P', monospace",
        textAlign: "left",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <div style={{ flexShrink: 0, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CharacterSprite
          src={CLASS_SPRITES[spriteKey]?.box}
          fallbackIcon={display.icon}
          size={40}
          dead={false}
        />
      </div>
      <div>
        <div style={{ fontSize: 11, marginBottom: 6 }}>{display.name}</div>
        {!hidden && (
          <div style={{ fontSize: 7, color: COLORS.skill, marginBottom: 5 }}>
            HP:{display.maxHp} | ATK:{display.attack} | DEF:{display.baseDefense ?? 0} | {display.attackLabel}
          </div>
        )}
        <div style={{ fontSize: 7, color: COLORS.muted, lineHeight: 1.9 }}>
          {hint || display.description}
        </div>
      </div>
    </button>
  );
}

function ClassSelectScreen({ onSelect, wallet, save, allTimeRecords }) {
  return (
    <div
      style={{
        ...screenShellFixed,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        animation: "fadeUp 0.4s ease",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: "100%",
          maxWidth: 380,
          textAlign: "center",
          paddingBottom: 10,
        }}
      >
        <div style={{ fontSize: 10, color: COLORS.fight, marginBottom: 4 }}>
          {t("select.heading")}
        </div>
        <div style={{ fontSize: 8, color: COLORS.gold, marginBottom: 4 }}>
          {t("select.wallet")} 💰 {wallet.toLocaleString()}
        </div>
        {allTimeRecords?.rounds > 0 && (
          <div style={{ fontSize: 7, color: COLORS.muted }}>
            {t("select.bestRound")} {allTimeRecords.rounds}
          </div>
        )}
      </div>

      <div
        className="class-select-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          maxWidth: 380,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          touchAction: "pan-y",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          paddingBottom: 12,
        }}
      >
      {CLASS_KEYS.map((key) => {
        const unlocked = isBaseClassUnlocked(save, key);
        const best = save?.classes?.[key]?.bestFloorReached ?? 0;
        return (
          <ClassCard
            key={key}
            classKey={key}
            cls={getLocalizedClass(key)}
            onSelect={onSelect}
            disabled={!unlocked}
            hint={
              unlocked
                ? `${t("select.bestFloor")} ${best}/${COMBO_UNLOCK_FLOOR}`
                : baseClassUnlockHint(key)
            }
          />
        );
      })}

      {COMBO_CLASS_KEYS.filter((comboKey) =>
        isComboUnlockedBySave(save, comboKey)
      ).map((comboKey) => {
        const best = save?.classes?.[comboKey]?.bestFloorReached ?? 0;
        return (
          <ClassCard
            key={comboKey}
            classKey={comboKey}
            cls={getLocalizedClass(comboKey)}
            onSelect={onSelect}
            hint={`${getLocalizedClass(comboKey).description} · ${t("select.bestFloor")} ${best}`}
          />
        );
      })}

      {COMBO_CLASS_KEYS.some((comboKey) => !isComboUnlockedBySave(save, comboKey)) && (
        <div
          className="class-select-locked"
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#080810",
            border: "1px solid #1a1a22",
            borderRadius: 8,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              fontSize: 7,
              color: COLORS.muted,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            {t("select.lockedCombos")}
          </div>
          {COMBO_CLASS_KEYS.filter(
            (comboKey) => !isComboUnlockedBySave(save, comboKey)
          ).map((comboKey) => (
            <div
              key={comboKey}
              style={{
                fontSize: 6,
                color: COLORS.dimmed,
                lineHeight: 1.85,
                padding: "5px 0",
                borderTop: "1px solid #141420",
              }}
            >
              <span style={{ color: COLORS.muted }}>
                {getLocalizedClass(comboKey).name}
              </span>
              <br />
              {comboUnlockHint(comboKey)}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function GameOverScreen({
  runCoinsEarned,
  wallet,
  kills,
  bestStreak,
  round,
  allTimeRecords,
  onContinue,
}) {
  const stats = [
    [t("gameover.coinsKept"), wallet.toLocaleString()],
    [t("gameover.earnedRun"), runCoinsEarned.toLocaleString()],
    [t("gameover.kills"), kills],
    [t("gameover.bestStreak"), bestStreak],
    [t("gameover.floor"), Math.max(0, round - 1)],
  ];

  const allTimeRows = allTimeRecords
    ? [
        [t("gameover.bestRound"), allTimeRecords.rounds],
        [t("gameover.bestCoins"), allTimeRecords.coins.toLocaleString()],
        [t("gameover.bestStreakAll"), allTimeRecords.streak],
      ]
    : [];

  return (
    <div
      style={{
        ...screenShellFixed,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        animation: "fadeUp 0.4s ease",
      }}
    >
      <div style={{ fontSize: 54 }}>💀</div>
      <div style={{ fontSize: 17, color: "#cc2222", textShadow: "0 0 24px #cc0000" }}>
        {t("gameover.title")}
      </div>

      <div
        style={{
          background: "#0c0c18",
          border: "1px solid #2a2a3a",
          borderRadius: 8,
          padding: "20px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          minWidth: 260,
        }}
      >
        {stats.map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 9, gap: 20 }}>
            <span style={{ color: "#777" }}>{label}</span>
            <span style={{ color: COLORS.gold }}>{value}</span>
          </div>
        ))}
        {allTimeRows.length > 0 && (
          <>
            <div style={{ borderTop: "1px solid #222", margin: "4px 0" }} />
            {allTimeRows.map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 8, gap: 20 }}>
                <span style={{ color: "#555" }}>{label}</span>
                <span style={{ color: "#aa8844" }}>{value}</span>
              </div>
            ))}
          </>
        )}
      </div>

      <div style={{ fontSize: 7, color: "#666", maxWidth: 280, textAlign: "center", lineHeight: 2 }}>
        {t("gameover.help")}
      </div>

      <button
        onClick={onContinue}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 10,
          padding: "14px 36px",
          borderRadius: 5,
          cursor: "pointer",
          border: `2px solid ${COLORS.fightBorder}`,
          background: `${COLORS.fight}22`,
          color: COLORS.fight,
        }}
      >
        {t("gameover.continue")}
      </button>
    </div>
  );
}

function BattleScene({ game, musicMuted, onToggleMusic }) {
  const {
    player,
    enemy,
    turn,
    wallet,
    streak,
    round,
    log,
    isSkillsMenuOpen, enemyFrozen, floatingNumbers,
    shakeTarget, flashType, streakPop, coinPop,
    isPlayerTurn, streakMultiplier,
    actionFight, actionDefend, actionRetreat, actionMagic, openSkillsMenu,
    battleTurn,
    autoEnabled, autoPaused, battleSpeedMultiplier, battleSpeedIndex,
    allTimeRecords,
    setIsSkillsMenuOpen, setBattleSpeedIndex,
    toggleAuto,
    isBossRound,
    canAutoSkipBoss,
  } = game;

  const bossFight = isBossRound(round);
  const classKey = player?.classKey;
  const skipBoss =
    bossFight && classKey && canAutoSkipBoss(classKey, round);
  const bossBlocksAuto = bossFight && !skipBoss;

  // Determine background flash
  let bgStyle = COLORS.bg;
  let bgAnimation = "none";
  if (flashType === "gold") bgAnimation = "bgFlashGold 0.35s ease";
  if (flashType === "red") bgAnimation = "bgFlashRed 0.35s ease";

  // Split floating numbers by target
  const enemyFloats = floatingNumbers.filter((f) => f.target === "enemy");
  const playerFloats = floatingNumbers.filter((f) => f.target === "player");

  return (
    <div
      style={{
        ...screenShellFixed,
        animation: bgAnimation,
        display: "flex",
        flexDirection: "column",
        maxWidth: 440,
        margin: "0 auto",
        width: "100%",
        gap: 10,
      }}
    >
      {/* HUD */}
      <BattleHUD
        wallet={wallet}
        streak={streak}
        streakMultiplier={streakMultiplier}
        round={round}
        battleTurn={battleTurn}
        bestRound={allTimeRecords?.rounds ?? 0}
        coinPop={coinPop}
        streakPop={streakPop}
      />

      {/* Arena */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: `1px solid ${COLORS.arenaBorder}`,
          borderRadius: 8,
          padding: "14px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Enemy */}
        {enemy && (
          <CombatantDisplay
            name={enemy.name}
            hp={enemy.hp}
            maxHp={enemy.maxHp}
            icon={enemy.icon}
            spriteSrc={getEnemyCombatSpriteUrl(
              enemy,
              getEnemyCombatSpriteState(
                enemy.hp,
                enemy.maxHp,
                player?.attack ?? 0,
                enemy
              )
            )}
            spriteFlip={enemy.flipSprite}
            isPlayer={false}
            isDead={enemy.hp <= 0}
            floats={enemyFloats}
            shaking={shakeTarget === "enemy"}
          />
        )}

        {/* Divider */}
        <div
          style={{
            borderTop: "1px solid #181825",
            textAlign: "center",
            fontSize: 8,
            color: "#202030",
            letterSpacing: 5,
            padding: "3px 0",
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          — vs —
        </div>

        {/* Player */}
        {player && (
          <CombatantDisplay
            name={player.name}
            hp={player.hp}
            maxHp={player.maxHp}
            icon={player.icon}
            spriteSrc={getPlayerCombatSpriteUrl(
              player.classKey,
              getPlayerCombatSpriteState(
                player.hp,
                player.maxHp,
                enemy,
                player.attack,
                round
              )
            )}
            isPlayer={true}
            isDead={false}
            floats={playerFloats}
            shaking={shakeTarget === "player"}
            buffs={{
              warCryTurnsLeft: getWarCryBuffTurnsLeft(player, battleTurn),
              hasDodgeBuff: player.hasDodgeBuff,
              hasBlockBuff: player.hasBlockBuff,
              enemyFrozen,
            }}
          />
        )}
      </div>

      {bossBlocksAuto && (
        <div
          style={{
            textAlign: "center",
            fontSize: 8,
            color: "#ff6666",
            letterSpacing: 1,
            padding: "4px 0",
          }}
        >
          {t("battle.bossCommand")}
        </div>
      )}

      <BattleControlBar
        autoEnabled={autoEnabled}
        autoPaused={autoPaused}
        speedMultiplier={battleSpeedMultiplier}
        battleSpeedIndex={battleSpeedIndex}
        onToggleAuto={toggleAuto}
        musicMuted={musicMuted}
        onToggleMusic={onToggleMusic}
        onCycleSpeed={() => {
          setBattleSpeedIndex(
            (i) => (i + 1) % GAME_CONFIG.battleSpeedOptions.length
          );
        }}
      />

      {/* Commands */}
      {!isSkillsMenuOpen ? (
        <ActionButtons
          isPlayerTurn={isPlayerTurn}
          onFight={actionFight}
          onSkills={openSkillsMenu}
          onDefend={actionDefend}
          onRun={actionRetreat}
          runDisabled={bossBlocksAuto}
        />
      ) : (
        <SkillsMenu
          skills={player?.skills || []}
          onSelectSkill={actionMagic}
          onClose={() => setIsSkillsMenuOpen(false)}
        />
      )}

      {/* Battle Log */}
      <BattleLog entries={log} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function BossRush() {
  const game = useGameEngine();
  const [musicMuted, setMusicMutedUi] = useState(() => getMusicMuted());

  useEffect(() => {
    if (game.scene === "battle") {
      playThemeForRound(game.round);
    } else if (
      game.scene === "shop" ||
      game.scene === "select" ||
      game.scene === "title"
    ) {
      playCampMusic();
    } else if (game.scene === "gameover") {
      stopAllMusic();
    }
  }, [game.scene, game.round]);

  const toggleMusic = () => {
    const next = !getMusicMuted();
    setMusicMuted(next);
    setMusicMutedUi(next);
  };

  return (
    <>
      <style>{CSS_KEYFRAMES}</style>

      {game.scene === "title" && (
        <TitleScreen
          onStart={() => {
            unlockAudio();
            game.setScene("select");
          }}
          wallet={game.wallet}
          allTimeRecords={game.allTimeRecords}
          locale={game.locale}
          onLocaleChange={game.setLocalePreference}
        />
      )}

      {game.scene === "select" && (
        <ClassSelectScreen
          onSelect={game.selectClass}
          wallet={game.wallet}
          save={game.save}
          allTimeRecords={game.allTimeRecords}
        />
      )}

      {game.scene === "shop" && game.selectedClassKey && (
        <ShopScreen
          classKey={game.selectedClassKey}
          classMeta={game.classMeta}
          save={game.save}
          wallet={game.wallet}
          onBuyHp={game.buyHpBoost}
          onBuyAtk={game.buyAtkBoost}
          onBuyDef={game.buyDefBoost}
          onBuyWeapon={game.buyWeapon}
          onBuySkill={game.buySkillUpgrade}
          onStart={() => game.startGame(game.selectedClassKey)}
          onBack={() => game.setScene("select")}
        />
      )}

      {game.scene === "battle" && (
        <BattleScene
          game={game}
          musicMuted={musicMuted}
          onToggleMusic={toggleMusic}
        />
      )}

      {game.scene === "gameover" && (
        <GameOverScreen
          runCoinsEarned={game.runCoinsEarned}
          wallet={game.wallet}
          kills={game.kills}
          bestStreak={game.bestStreak}
          round={game.round}
          allTimeRecords={game.allTimeRecords}
          onContinue={() => game.setScene("select")}
        />
      )}
    </>
  );
}
