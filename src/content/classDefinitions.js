/**
 * Party Mode class data: base stats, fixed speed tiers, per-level growth, and
 * stat letter rankings for the party-select popup.
 *
 * Speed tiers are party-mode specific and intentionally differ from solo mode
 * (solo Mage 8 / Cleric 7). Party order: Rogue 10 > Mage 7 > Warrior 6 > Cleric 4.
 *
 * Source of truth: docs/party-mode-canonical-handoff.md
 */

export const PARTY_CLASS_KEYS = ["warrior", "mage", "rogue", "cleric"];

/** Display names mirror solo CLASSES so UI can share labels. */
export const PARTY_CLASS_NAMES = {
  warrior: "Tabby Knight",
  mage: "Whisker Mage",
  rogue: "Shadow Cat",
  cleric: "Whisker Cleric",
};

/** Base stats at level 0. Speed never grows. */
export const PARTY_BASE_STATS = {
  warrior: { maxHp: 12, attack: 3, defense: 2, speed: 6 },
  mage: { maxHp: 6, attack: 4, defense: 1, speed: 7 },
  rogue: { maxHp: 7, attack: 3, defense: 0, speed: 10 },
  cleric: { maxHp: 10, attack: 2, defense: 2, speed: 4 },
};

/** Per-level stat growth (level == current floor). */
export const GROWTH_RATES = {
  warrior: { hp: 2.0, atk: 1.0, def: 0.5 },
  mage: { hp: 1.0, atk: 1.5, def: 0.25 },
  rogue: { hp: 1.0, atk: 1.25, def: 0.25 },
  cleric: { hp: 1.5, atk: 0.5, def: 0.5 },
};

/** Turn priority is derived from speed (higher acts first). */
export const PARTY_TURN_PRIORITY = ["rogue", "mage", "warrior", "cleric"];

/**
 * Letter ranking thresholds for the party-select info popup.
 * Each entry is evaluated high-to-low; first matching grade wins.
 */
export const STAT_LETTER_THRESHOLDS = {
  hp: [
    { grade: "S", min: 12 },
    { grade: "A", min: 10 },
    { grade: "B", min: 8 },
    { grade: "C", min: 6 },
    { grade: "D", min: -Infinity },
  ],
  atk: [
    { grade: "S", min: 5 },
    { grade: "A", min: 4 },
    { grade: "B", min: 3 },
    { grade: "C", min: 2 },
    { grade: "D", min: -Infinity },
  ],
  def: [
    { grade: "S", min: 3 },
    { grade: "A", min: 2 },
    { grade: "B", min: 1 },
    { grade: "C", min: 0 },
    { grade: "D", min: -Infinity },
  ],
  spd: [
    { grade: "S", min: 9 },
    { grade: "A", min: 7 },
    { grade: "B", min: 5 },
    { grade: "C", min: 3 },
    { grade: "D", min: -Infinity },
  ],
};

/** Resolve a numeric stat to its letter grade for a given stat key. */
export function getStatLetter(statKey, value) {
  const table = STAT_LETTER_THRESHOLDS[statKey];
  if (!table) return "?";
  for (const row of table) {
    if (value >= row.min) return row.grade;
  }
  return "D";
}

/** Full letter card for a base class (used by the 4x4 grid popup). */
export function getStatLetterCard(classKey) {
  const base = PARTY_BASE_STATS[classKey];
  if (!base) return null;
  return {
    hp: getStatLetter("hp", base.maxHp),
    atk: getStatLetter("atk", base.attack),
    def: getStatLetter("def", base.defense),
    spd: getStatLetter("spd", base.speed),
  };
}
