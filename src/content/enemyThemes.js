/**
 * Themed enemy catalog (10 × 100 floors + free play).
 * Sprite keys map to public/sprites/dogs/{spriteKey}/combat_*.png
 */

import { SCALING_CONFIG, clamp, getEnemyRoundScale, isBossRound } from "../battle/scaling.js";

export const FREE_PLAY_START = 1001;

export const THEME_BLOCKS = [
  { id: "human", floorMin: 1, floorMax: 100, nameKey: "theme.human" },
  { id: "monster", floorMin: 101, floorMax: 200, nameKey: "theme.monster" },
  { id: "hell", floorMin: 201, floorMax: 300, nameKey: "theme.hell" },
  { id: "space", floorMin: 301, floorMax: 400, nameKey: "theme.space" },
  { id: "alien", floorMin: 401, floorMax: 500, nameKey: "theme.alien" },
  { id: "mirror", floorMin: 501, floorMax: 600, nameKey: "theme.mirror", flipSprite: true },
  { id: "heaven_low", floorMin: 601, floorMax: 700, nameKey: "theme.heaven_low" },
  { id: "olympus", floorMin: 701, floorMax: 800, nameKey: "theme.olympus" },
  { id: "pantheon", floorMin: 801, floorMax: 900, nameKey: "theme.pantheon" },
  { id: "angelic", floorMin: 901, floorMax: 1000, nameKey: "theme.angelic" },
];

/** Space block: planet bosses on these decade floors (within 301–390). */
export const SPACE_PLANET_FLOORS = {
  310: "space_planet_mercury",
  320: "space_planet_venus",
  330: "space_planet_earth",
  340: "space_planet_mars",
  350: "space_planet_jupiter",
  360: "space_planet_saturn",
  370: "space_planet_uranus",
  380: "space_planet_neptune",
};

function trash(theme, idx, name, icon, stats, lore, extra = {}) {
  const spriteKey = extra.spriteKey ?? `${theme}_trash_${idx}`;
  return {
    id: `${theme}_trash_${idx}`,
    theme,
    tier: "trash",
    spriteKey,
    name,
    icon,
    maxHp: stats.hp,
    attack: stats.atk,
    speed: stats.spd ?? 5,
    reward: stats.reward,
    lore,
    ...extra,
  };
}

function miniBoss(theme, id, name, icon, stats, lore, extra = {}) {
  return {
    id: `${theme}_mini_${id}`,
    theme,
    tier: "miniBoss",
    spriteKey: extra.spriteKey ?? `${theme}_mini_${id}`,
    name,
    icon,
    maxHp: stats.hp,
    attack: stats.atk,
    speed: stats.spd ?? 6,
    reward: stats.reward,
    lore,
    bossOnly: true,
    ...extra,
  };
}

function capstone(theme, id, name, icon, stats, lore, extra = {}) {
  return {
    id: `${theme}_cap_${id}`,
    theme,
    tier: "capstone",
    spriteKey: extra.spriteKey ?? `${theme}_cap_${id}`,
    name,
    icon,
    maxHp: stats.hp,
    attack: stats.atk,
    speed: stats.spd ?? 7,
    reward: stats.reward,
    lore,
    bossOnly: true,
    capstoneFloor: extra.capstoneFloor,
    ...extra,
  };
}

const HUMAN_TRASH = [
  trash("human", 0, "Yard Terrier", "🐕", { hp: 8, atk: 1, spd: 4, reward: 8 }, "A yapping nuisance from the neighbor's fence."),
  trash("human", 1, "Mail Carrier's Foe", "🐕‍🦺", { hp: 10, atk: 2, spd: 5, reward: 10 }, "Still mad about Tuesday."),
  trash("human", 2, "HOA Enforcer", "🐕", { hp: 11, atk: 2, spd: 4, reward: 12 }, "Your lawn flair is insufficient."),
  trash("human", 3, "Sock Thief", "🐩", { hp: 12, atk: 3, spd: 6, reward: 14 }, "Justice is a chew toy."),
  trash("human", 4, "Barbecue Bandit", "🐕", { hp: 13, atk: 2, spd: 5, reward: 15 }, "The burgers were already gone."),
  trash("human", 5, "Leash Law Phantom", "🐕‍🦺", { hp: 14, atk: 3, spd: 7, reward: 18 }, "Off-leash energy, on-leash violence."),
  trash("human", 6, "Porch Gremlin", "🐕", { hp: 15, atk: 3, spd: 5, reward: 20 }, "Sits in judgment of your steps."),
  trash("human", 7, "Suburban Alpha", "🐕", { hp: 16, atk: 4, spd: 6, reward: 22 }, "The cul-de-sac trembles."),
];

const MONSTER_TRASH = [
  trash("monster", 0, "Slime Pup", "🐕", { hp: 10, atk: 2, spd: 5, reward: 12 }, "Drippy. Bitey. Regrets nothing."),
  trash("monster", 1, "Fang Slime", "🐕", { hp: 12, atk: 2, spd: 4, reward: 14 }, "Leaves paw prints in acid."),
  trash("monster", 2, "Crate Mimic", "🐕", { hp: 14, atk: 3, spd: 3, reward: 16 }, "Good boy? Uncertain."),
  trash("monster", 3, "Tentacle Mutt", "🐕", { hp: 13, atk: 3, spd: 6, reward: 18 }, "Too many limbs for fetch."),
  trash("monster", 4, "Bone Stack", "🐕‍🦺", { hp: 16, atk: 2, spd: 4, reward: 20 }, "Rattles when it runs."),
  trash("monster", 5, "Eye Wolf", "🐕", { hp: 15, atk: 4, spd: 7, reward: 22 }, "Always watching. Always drooling."),
  trash("monster", 6, "Moss Hound", "🐕", { hp: 18, atk: 3, spd: 5, reward: 24 }, "Smells like dungeon savings."),
  trash("monster", 7, "Howl Bat", "🐕", { hp: 17, atk: 4, spd: 8, reward: 26 }, "Sonar barking."),
];

const HELL_TRASH = [
  trash("hell", 0, "Imp Pup", "🐕", { hp: 12, atk: 2, spd: 6, reward: 14 }, "Tiny horns. Big attitude."),
  trash("hell", 1, "Ash Terrier", "🐕", { hp: 13, atk: 3, spd: 5, reward: 16 }, "Tracks soot on your soul."),
  trash("hell", 2, "Pink Devil Dog", "🐕", { hp: 14, atk: 3, spd: 7, reward: 18 }, "Wears a stylish devil onesie. Very wacky.", { spriteKey: "hell_trash_powerpup" }),
  trash("hell", 3, "Lava Spaniel", "🐕", { hp: 15, atk: 3, spd: 6, reward: 20 }, "Hot tongue. Cold heart."),
  trash("hell", 4, "Brimstone Beagle", "🐕", { hp: 16, atk: 4, spd: 5, reward: 22 }, "Sniffs out your mistakes."),
  trash("hell", 5, "Pit Gremlin", "🐕", { hp: 17, atk: 3, spd: 7, reward: 24 }, "Laughs in fire."),
  trash("hell", 6, "Charred Collie", "🐕", { hp: 18, atk: 4, spd: 6, reward: 26 }, "Still wants belly rubs."),
  trash("hell", 7, "Doom Pug", "🐕", { hp: 19, atk: 4, spd: 8, reward: 28 }, "Squished face of fate."),
];

const SPACE_TRASH = [
  trash("space", 0, "Vacuum Pup", "🐕", { hp: 14, atk: 2, spd: 6, reward: 16 }, "Barks in zero atmosphere."),
  trash("space", 1, "Comet Hound", "🐕", { hp: 15, atk: 3, spd: 7, reward: 18 }, "Tail leaves ice trails."),
  trash("space", 2, "Orbit Terrier", "🐕", { hp: 16, atk: 3, spd: 6, reward: 20 }, "Circles you forever."),
  trash("space", 3, "Meteor Mutt", "🐕", { hp: 17, atk: 3, spd: 8, reward: 22 }, "Fetch ends in craters."),
  trash("space", 4, "Satellite Setter", "🐕", { hp: 18, atk: 4, spd: 5, reward: 24 }, "Beeping aggressively."),
  trash("space", 5, "Nebula Nose", "🐕", { hp: 19, atk: 3, spd: 7, reward: 26 }, "Sniffs stardust."),
  trash("space", 6, "Rocket Retriever", "🐕‍🦺", { hp: 20, atk: 4, spd: 6, reward: 28 }, "NASA denied clearance."),
  trash("space", 7, "Lunar Bark", "🐕", { hp: 21, atk: 4, spd: 8, reward: 30 }, "One small step. One loud yap."),
];

const ALIEN_TRASH = [
  trash("alien", 0, "Probe Pup", "🐕", { hp: 16, atk: 3, spd: 6, reward: 18 }, "Abduction-ready."),
  trash("alien", 1, "Galaxy Gnasher", "🐕", { hp: 17, atk: 3, spd: 7, reward: 20 }, "Bites in another dimension."),
  trash("alien", 2, "Cosmic Collie", "🐕", { hp: 18, atk: 4, spd: 6, reward: 22 }, "Herding stars poorly."),
  trash("alien", 3, "Void Whippet", "🐕", { hp: 19, atk: 4, spd: 9, reward: 24 }, "Fast. Unsettling."),
  trash("alien", 4, "UFO Urger", "🐕", { hp: 20, atk: 3, spd: 7, reward: 26 }, "Beam me a biscuit."),
  trash("alien", 5, "Star Slime Dog", "🐕", { hp: 21, atk: 4, spd: 6, reward: 28 }, "Translucent loyalty."),
  trash("alien", 6, "Nebula Nomad", "🐕", { hp: 22, atk: 4, spd: 8, reward: 30 }, "Lost in the spiral arm."),
  trash("alien", 7, "Xeno Bark", "🐕", { hp: 23, atk: 5, spd: 7, reward: 32 }, "Language: yap."),
];

const HEAVEN_TRASH = [
  trash("heaven_low", 0, "Cloud Pup", "🐕", { hp: 18, atk: 3, spd: 6, reward: 20 }, "Soft. Judgmental."),
  trash("heaven_low", 1, "Halo Hound", "🐕", { hp: 19, atk: 3, spd: 7, reward: 22 }, "Ring slightly crooked."),
  trash("heaven_low", 2, "Cherub Chewer", "🐕", { hp: 20, atk: 4, spd: 5, reward: 24 }, "Tiny wings. Big teeth."),
  trash("heaven_low", 3, "Pearly Paws", "🐕", { hp: 21, atk: 3, spd: 6, reward: 26 }, "Gatekeeper's pet."),
  trash("heaven_low", 4, "Feather Fang", "🐕", { hp: 22, atk: 4, spd: 7, reward: 28 }, "Down floats upward."),
  trash("heaven_low", 5, "Saint Bernard Angel", "🐕‍🦺", { hp: 23, atk: 4, spd: 5, reward: 30 }, "Rescues then reviews you."),
  trash("heaven_low", 6, "Trumpet Terrier", "🐕", { hp: 24, atk: 4, spd: 8, reward: 32 }, "Announces your flaws."),
  trash("heaven_low", 7, "Low Choir Mutt", "🐕", { hp: 25, atk: 5, spd: 6, reward: 34 }, "Harmonizes in growls."),
];

const OLYMPUS_TRASH = [
  trash("olympus", 0, "Nymph Nibbler", "🐕", { hp: 20, atk: 4, spd: 6, reward: 22 }, "Lives in a fountain."),
  trash("olympus", 1, "Satyr Spaniel", "🐕", { hp: 21, atk: 4, spd: 7, reward: 24 }, "Pan-flute adjacent."),
  trash("olympus", 2, "Marble Mutt", "🐕", { hp: 22, atk: 4, spd: 5, reward: 26 }, "Statue when convenient."),
  trash("olympus", 3, "Laurel Licker", "🐕", { hp: 23, atk: 5, spd: 6, reward: 28 }, "Victory tastes like slobber."),
  trash("olympus", 4, "Thunder Puplet", "🐕", { hp: 24, atk: 4, spd: 8, reward: 30 }, "Static on every pet."),
  trash("olympus", 5, "Oracle Hound", "🐕", { hp: 25, atk: 5, spd: 6, reward: 32 }, "Foretells your defeat."),
  trash("olympus", 6, "Titan Terrier", "🐕", { hp: 26, atk: 5, spd: 7, reward: 34 }, "Small dog. Big myth."),
  trash("olympus", 7, "Ichor Retriever", "🐕‍🦺", { hp: 27, atk: 5, spd: 8, reward: 36 }, "Fetches divine drama."),
];

const PANTHEON_TRASH = [
  trash("pantheon", 0, "Myth Mutt", "🐕", { hp: 22, atk: 4, spd: 6, reward: 24 }, "Worshipped incorrectly."),
  trash("pantheon", 1, "Totem Terrier", "🐕", { hp: 23, atk: 5, spd: 7, reward: 26 }, "Carved from bark."),
  trash("pantheon", 2, "Incense Hound", "🐕", { hp: 24, atk: 4, spd: 6, reward: 28 }, "Smells like destiny."),
  trash("pantheon", 3, "Cosmic Collar", "🐕", { hp: 25, atk: 5, spd: 8, reward: 30 }, "Leash to the infinite."),
  trash("pantheon", 4, "Prayer Paws", "🐕", { hp: 26, atk: 5, spd: 6, reward: 32 }, "Answers with bites."),
  trash("pantheon", 5, "Temple Guard", "🐕‍🦺", { hp: 27, atk: 5, spd: 7, reward: 34 }, "No shoes. Many teeth."),
  trash("pantheon", 6, "Ritual Rover", "🐕", { hp: 28, atk: 6, spd: 6, reward: 36 }, "Circles the altar."),
  trash("pantheon", 7, "Ascended Mutt", "🐕", { hp: 29, atk: 6, spd: 8, reward: 38 }, "Almost too holy."),
];

const ANGELIC_TRASH = [
  trash("angelic", 0, "Seraph Snout", "🐕", { hp: 24, atk: 5, spd: 7, reward: 28 }, "Six wings. One nose."),
  trash("angelic", 1, "Radiant Rover", "🐕", { hp: 25, atk: 5, spd: 8, reward: 30 }, "Glows on command."),
  trash("angelic", 2, "Prism Pup", "🐕", { hp: 26, atk: 5, spd: 6, reward: 32 }, "Splits light and ankles."),
  trash("angelic", 3, "Throne Terrier", "🐕", { hp: 27, atk: 6, spd: 7, reward: 34 }, "Sits above reason."),
  trash("angelic", 4, "Ocular Hound", "🐕", { hp: 28, atk: 5, spd: 8, reward: 36 }, "Watches everything."),
  trash("angelic", 5, "Wing Spaniel", "🐕", { hp: 29, atk: 6, spd: 6, reward: 38 }, "Flaps intimidation."),
  trash("angelic", 6, "Lumen Licker", "🐕", { hp: 30, atk: 6, spd: 7, reward: 40 }, "Light tastes crunchy."),
  trash("angelic", 7, "All-Seer Pup", "🐕", { hp: 31, atk: 6, spd: 9, reward: 42 }, "Almost Doggod. Not yet."),
];

const CAPSTONES = [
  capstone("human", "guy_dog", "Guy With A Dog", "🧍‍♂️🐕", { hp: 55, atk: 6, spd: 6, reward: 120 }, "He brought backup. The backup bites.", { capstoneFloor: 100 }),
  capstone("monster", "chimera", "Chimera Dog", "🐉🐕", { hp: 70, atk: 8, spd: 8, reward: 150 }, "Snake tail. Wings. Still wants treats.", { capstoneFloor: 200, special: { name: "Triple Bite", chance: 0.22, damageMult: 1.45 } }),
  capstone("hell", "devil_pair", "Devil & Dog Duo", "😈🐕", { hp: 75, atk: 8, spd: 9, reward: 160 }, "A wacky devil and his hype beast.", { capstoneFloor: 300 }),
  capstone("space", "solar", "Solar Pack Alpha", "☀️🐕", { hp: 80, atk: 9, spd: 8, reward: 170 }, "The sun has a leash now.", { capstoneFloor: 400 }),
  capstone("alien", "galaxy_apex", "Galaxy Apex Hound", "👽🐕", { hp: 85, atk: 9, spd: 10, reward: 180 }, "From a galaxy of bad dogs.", { capstoneFloor: 500 }),
  capstone("mirror", "inverted", "Inverted Overdog", "🙃🐕", { hp: 90, atk: 10, spd: 9, reward: 190 }, "Everything you beat, upside down.", { capstoneFloor: 600, flipSprite: true }),
  capstone("heaven_low", "seraph", "Low Seraph & Spaniel", "👼🐕", { hp: 95, atk: 10, spd: 8, reward: 200 }, "Entry-level divinity. Expert bites.", { capstoneFloor: 700 }),
  capstone("olympus", "zeusion", "Zeusion & Thunder Pup", "⚡🐕", { hp: 100, atk: 11, spd: 9, reward: 220 }, "Parodic thunder. Real teeth.", { capstoneFloor: 800 }),
  capstone("pantheon", "unnamed", "The Unnamed Walker", "✨🐕", { hp: 110, atk: 12, spd: 10, reward: 250 }, "Cannot be spoken. Can be bitten.", { capstoneFloor: 900 }),
  capstone("angelic", "doggod", "Doggod: All Seeing Eye", "👁️🐕", { hp: 130, atk: 14, spd: 11, reward: 300 }, "One eye. All leashes lead here.", { capstoneFloor: 1000, spriteKey: "angelic_cap_doggod" }),
];

const SPACE_PLANETS = [
  miniBoss("space", "mercury", "Mercury Hound", "☿️🐕", { hp: 40, atk: 5, spd: 9, reward: 80 }, "Fast orbit. Faster teeth.", { spriteKey: "space_planet_mercury" }),
  miniBoss("space", "venus", "Venus Spaniel", "♀️🐕", { hp: 42, atk: 5, spd: 7, reward: 82 }, "Toxic atmosphere. Toxic loyalty.", { spriteKey: "space_planet_venus" }),
  miniBoss("space", "earth", "Earth Retriever", "🌍🐕", { hp: 44, atk: 5, spd: 6, reward: 84 }, "Home turf advantage.", { spriteKey: "space_planet_earth" }),
  miniBoss("space", "mars", "Mars Rover Mutt", "♂️🐕", { hp: 46, atk: 6, spd: 7, reward: 86 }, "Red dust. Red gums.", { spriteKey: "space_planet_mars" }),
  miniBoss("space", "jupiter", "Jupiter Great Dane", "♃🐕", { hp: 52, atk: 6, spd: 5, reward: 90 }, "Gas giant. Bark giant.", { spriteKey: "space_planet_jupiter" }),
  miniBoss("space", "saturn", "Saturn Ring Hound", "🪐🐕", { hp: 48, atk: 6, spd: 6, reward: 88 }, "Rings of slobber.", { spriteKey: "space_planet_saturn" }),
  miniBoss("space", "uranus", "Uranus Ice Pup", "♅🐕", { hp: 45, atk: 6, spd: 8, reward: 87 }, "Cold nose. Cold stare.", { spriteKey: "space_planet_uranus" }),
  miniBoss("space", "neptune", "Neptune Deep Dog", "♆🐕", { hp: 47, atk: 7, spd: 7, reward: 89 }, "Bites from the abyss.", { spriteKey: "space_planet_neptune" }),
];

const MINI_BOSSES = [
  miniBoss("human", "hoa_chair", "HOA Chairdog", "🐕‍🦺", { hp: 28, atk: 4, spd: 5, reward: 45 }, "Rules the block with teeth."),
  miniBoss("monster", "lair_keeper", "Lair Keeper", "🐕", { hp: 32, atk: 5, spd: 6, reward: 55 }, "Guards the slime fountain."),
  miniBoss("hell", "pit_captain", "Pit Captain", "🐕", { hp: 34, atk: 5, spd: 7, reward: 58 }, "Middle management of suffering."),
  miniBoss("alien", "hive_alpha", "Hive Alpha", "🐕", { hp: 38, atk: 6, spd: 8, reward: 65 }, "Commands the star pack."),
  miniBoss("mirror", "reflection", "Reflection Hound", "🐕", { hp: 36, atk: 5, spd: 7, reward: 60 }, "You, but barkier.", { flipSprite: true }),
  miniBoss("heaven_low", "gate_guard", "Gate Guard", "🐕", { hp: 40, atk: 6, spd: 6, reward: 68 }, "Checks your sins."),
  miniBoss("olympus", "hero_hound", "Hero's Hound", "🐕", { hp: 42, atk: 6, spd: 8, reward: 72 }, "Sidekick to a sidekick."),
  miniBoss("pantheon", "high_priest", "High Priest Pup", "🐕", { hp: 44, atk: 7, spd: 7, reward: 75 }, "Incense and incisors."),
  miniBoss("angelic", "arch_pup", "Arch Pup", "🐕", { hp: 46, atk: 7, spd: 8, reward: 78 }, "Reports to the eye."),
];

/** Mirror trash reuses prior capstone sprite keys, flipped in UI. */
const MIRROR_TRASH = CAPSTONES.slice(0, 8).map((c, i) =>
  trash(
    "mirror",
    i,
    `Upside ${c.name}`,
    "🙃🐕",
    { hp: 20 + i * 2, atk: 3 + Math.floor(i / 2), spd: 6 + (i % 3), reward: 30 + i * 4 },
    `The inverted memory of ${c.name}.`,
    { spriteKey: c.spriteKey, flipSprite: true }
  )
);

export const ENEMY_CATALOG = [
  ...HUMAN_TRASH,
  ...MONSTER_TRASH,
  ...HELL_TRASH,
  ...SPACE_TRASH,
  ...ALIEN_TRASH,
  ...MIRROR_TRASH,
  ...HEAVEN_TRASH,
  ...OLYMPUS_TRASH,
  ...PANTHEON_TRASH,
  ...ANGELIC_TRASH,
  ...MINI_BOSSES,
  ...SPACE_PLANETS,
  ...CAPSTONES,
];

export const ENEMY_BY_ID = Object.fromEntries(ENEMY_CATALOG.map((e) => [e.id, e]));

const TRASH_BY_THEME = {};
const MINI_BY_THEME = {};
const CAPSTONE_BY_FLOOR = {};

for (const e of ENEMY_CATALOG) {
  if (e.tier === "trash") {
    if (!TRASH_BY_THEME[e.theme]) TRASH_BY_THEME[e.theme] = [];
    TRASH_BY_THEME[e.theme].push(e);
  }
  if (e.tier === "miniBoss") {
    if (!MINI_BY_THEME[e.theme]) MINI_BY_THEME[e.theme] = [];
    MINI_BY_THEME[e.theme].push(e);
  }
  if (e.tier === "capstone" && e.capstoneFloor) {
    CAPSTONE_BY_FLOOR[e.capstoneFloor] = e;
  }
}

export function isFreePlayRound(round) {
  return round >= FREE_PLAY_START;
}

export function isCenturyBoss(round) {
  return round > 0 && round % 100 === 0;
}

export function isThemeTransitionFloor(round) {
  return round > 1 && round % 100 === 1;
}

export function resolveTheme(round) {
  if (isFreePlayRound(round)) return "freeplay";
  const block = THEME_BLOCKS.find((b) => round >= b.floorMin && round <= b.floorMax);
  return block?.id ?? "human";
}

export function getThemeBlock(round) {
  if (isFreePlayRound(round)) return null;
  return THEME_BLOCKS.find((b) => round >= b.floorMin && round <= b.floorMax) ?? THEME_BLOCKS[0];
}

function pickFromPool(pool, round, theme) {
  if (!pool?.length) return ENEMY_CATALOG[0];
  const block = THEME_BLOCKS.find((b) => b.id === theme);
  const offset = block ? block.floorMin - 1 : 0;
  const progress = clamp(round - offset, 0, 99);
  const idx = clamp(Math.floor(progress / 12), 0, pool.length - 1);
  const wobble = (round + progress) % pool.length;
  return pool[(idx + wobble) % pool.length];
}

function pickFreePlay(round) {
  const pool = ENEMY_CATALOG.filter((e) => e.tier === "trash" || e.tier === "miniBoss");
  return pool[(round * 7 + 13) % pool.length];
}

export function resolveEnemyTemplate(round) {
  if (isFreePlayRound(round)) {
    return pickFreePlay(round);
  }

  const theme = resolveTheme(round);

  if (isCenturyBoss(round)) {
    return CAPSTONE_BY_FLOOR[round] ?? pickFromPool(TRASH_BY_THEME[theme], round, theme);
  }

  if (round % SCALING_CONFIG.bossEveryNFloors === 0) {
    const planetId = SPACE_PLANET_FLOORS[round];
    if (planetId && ENEMY_BY_ID[planetId]) {
      return ENEMY_BY_ID[planetId];
    }
    const miniPool = MINI_BY_THEME[theme];
    if (miniPool?.length) {
      return miniPool[(Math.floor(round / 10) - 1) % miniPool.length];
    }
  }

  return pickFromPool(TRASH_BY_THEME[theme], round, theme);
}

export function getCatalogEntry(catalogId) {
  return ENEMY_BY_ID[catalogId] ?? ENEMY_CATALOG[0];
}

export function getCatalogEntryByIndex(index) {
  return ENEMY_CATALOG[index] ?? ENEMY_CATALOG[0];
}

/** Build scaled runtime enemy from catalog template. */
export function buildEnemyFromCatalog(round, template) {
  let scale = getEnemyRoundScale(round);
  const boss = isBossRound(round);

  if (boss) {
    scale *= SCALING_CONFIG.bossHpMult;
  }
  if (template.tier === "capstone") {
    scale *= 1.15;
  }

  let attack = Math.max(1, Math.round(template.attack * scale));
  if (boss) {
    attack = Math.max(1, Math.round(attack * SCALING_CONFIG.bossAtkMult));
  }

  let reward = Math.round(template.reward * scale);
  if (boss) {
    reward = Math.round(reward * SCALING_CONFIG.bossRewardMult);
  }

  const themeBlock = THEME_BLOCKS.find((b) => b.id === template.theme);

  return {
    catalogId: template.id,
    name: template.name,
    icon: template.icon,
    spriteKey: template.spriteKey,
    themeId: template.theme,
    flipSprite: Boolean(template.flipSprite || themeBlock?.flipSprite),
    tier: template.tier,
    maxHp: template.maxHp,
    hp: Math.round(template.maxHp * scale),
    attack,
    reward,
    speed: template.speed ?? 5,
    lore: template.lore,
    special: template.special,
    isBoss: boss,
    freezeTurnsLeft: 0,
    poisonTurnsLeft: 0,
    poolIndex: ENEMY_CATALOG.indexOf(template),
  };
}

/** Unique sprite keys for asset generation. */
export function getAllEnemySpriteKeys() {
  const keys = new Set();
  for (const e of ENEMY_CATALOG) {
    if (e.spriteKey) keys.add(e.spriteKey);
  }
  return [...keys];
}

/** @deprecated Legacy flat list for tests referencing pool index. */
export const LEGACY_ENEMIES = ENEMY_CATALOG.filter((e) => e.tier === "trash").slice(0, 10);
