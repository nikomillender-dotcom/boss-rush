/**
 * Party Mode status effect contract: stack caps, damage-over-time, stat modifier
 * math with floor, crowd-control success by tier, and end-of-turn tick ordering.
 *
 * Pure functions only (no React, no DOM) so the Node balance test can import this.
 * Source of truth: docs/party-mode-canonical-handoff.md
 */

export const STACK_CAPS = {
  buff: 2,
  debuff: 3,
};

/** DOT effects: percent of max HP per stack per turn. */
export const DOT_PER_STACK = {
  bleed: 0.04,
  burn: 0.03,
  poison: 0.05,
};

/** Per-stack stat modifier magnitude. */
export const STAT_MOD_PER_STACK = 0.2;

/** Debuffs cannot drop ATK/DEF below this fraction of base. */
export const STAT_DEBUFF_FLOOR = 0.4;

/** Default durations (turns) when a skill does not specify its own. */
export const DEFAULT_DURATIONS = {
  atk_up: 4,
  def_up: 4,
  atk_down: 4,
  def_down: 4,
  poison: 4,
  bleed: 4,
  burn: 3,
  slow: 3,
  berserk: 3,
  regen: 4,
  haste: 3,
  marked: 3,
};

export const BERSERK_DAMAGE_MULT = 2.5;

/**
 * Resistance coefficients by enemy tier.
 * cc: success multiplier for crowd control (freeze, berserk, blind)
 * dot: potency multiplier for damage-over-time
 * stat: potency multiplier for ATK/DEF debuffs
 * berserkImmune: hard immunity flag
 */
export const TIER_RESISTANCE = {
  normal: { cc: 1.0, dot: 1.0, stat: 1.0, berserkImmune: false },
  miniBoss: { cc: 0.5, dot: 1.0, stat: 1.0, berserkImmune: false },
  boss: { cc: 0.25, dot: 0.7, stat: 0.8, berserkImmune: false },
  doggod: { cc: 0.25, dot: 0.5, stat: 0.7, berserkImmune: true },
};

const CC_EFFECTS = new Set(["freeze", "berserk", "blind", "slow"]);
const DOT_EFFECTS = new Set(["bleed", "burn", "poison"]);
const STAT_EFFECTS = new Set(["atk_down", "def_down", "atk_up", "def_up"]);

export function isDot(effect) {
  return DOT_EFFECTS.has(effect);
}

export function isCrowdControl(effect) {
  return CC_EFFECTS.has(effect);
}

export function isBuff(effect) {
  return effect === "atk_up" || effect === "def_up" || effect === "regen" || effect === "haste";
}

export function getStackCap(effect) {
  return isBuff(effect) ? STACK_CAPS.buff : STACK_CAPS.debuff;
}

/** Resolve a tier key to its resistance row (falls back to normal). */
export function getTierResistance(tier) {
  return TIER_RESISTANCE[tier] ?? TIER_RESISTANCE.normal;
}

/**
 * Roll whether a crowd-control effect lands against a tier.
 * `rng` defaults to Math.random; pass a seeded fn for deterministic tests.
 */
export function rollCrowdControl(effect, tier, baseAccuracy = 1, rng = Math.random) {
  if (!isCrowdControl(effect)) return true;
  const res = getTierResistance(tier);
  if (effect === "berserk" && res.berserkImmune) return false;
  const chance = baseAccuracy * res.cc;
  return rng() < chance;
}

/**
 * Add stacks of an effect to a status bag, honoring caps. Berserk never stacks.
 * Returns a new status map: { [effect]: { stacks, duration } }.
 */
export function applyStatus(statuses, effect, { stacks = 1, duration } = {}) {
  const next = { ...statuses };
  const dur = duration ?? DEFAULT_DURATIONS[effect] ?? 1;
  const existing = next[effect];

  if (effect === "berserk") {
    next[effect] = { stacks: 1, duration: Math.max(existing?.duration ?? 0, dur) };
    return next;
  }
  if (effect === "slow" || effect === "marked" || effect === "blind") {
    next[effect] = {
      stacks: 1,
      duration: Math.max(existing?.duration ?? 0, dur),
    };
    return next;
  }

  const cap = getStackCap(effect);
  const curStacks = existing?.stacks ?? 0;
  const newStacks = Math.min(cap, curStacks + stacks);
  next[effect] = {
    stacks: newStacks,
    duration: Math.max(existing?.duration ?? 0, dur),
  };
  return next;
}

/**
 * Compute one turn of DOT damage for a combatant, applying tier resistance.
 * Returns integer damage (min 1 per active DOT effect with stacks).
 */
export function computeDotDamage(statuses, maxHp, tier = "normal") {
  const res = getTierResistance(tier);
  let total = 0;
  for (const effect of DOT_EFFECTS) {
    const entry = statuses?.[effect];
    if (!entry || entry.stacks <= 0 || entry.duration <= 0) continue;
    const perStack = DOT_PER_STACK[effect] ?? 0;
    const raw = maxHp * perStack * entry.stacks * res.dot;
    total += Math.max(1, Math.round(raw));
  }
  return total;
}

/**
 * Effective ATK/DEF multiplier from buff/debuff stacks, with debuff floor.
 * statKey: "atk" | "def".
 */
export function statMultiplier(statuses, statKey, tier = "normal") {
  const res = getTierResistance(tier);
  const upEffect = statKey === "atk" ? "atk_up" : "def_up";
  const downEffect = statKey === "atk" ? "atk_down" : "def_down";
  const up = statuses?.[upEffect]?.stacks ?? 0;
  const down = statuses?.[downEffect]?.stacks ?? 0;

  const upMult = 1 + STAT_MOD_PER_STACK * up;
  // Debuff potency is reduced by tier resistance (bosses shrug off some).
  const downMult = 1 - STAT_MOD_PER_STACK * down * res.stat;
  const combined = upMult * downMult;
  return Math.max(STAT_DEBUFF_FLOOR, combined);
}

/** Count unique active debuff effects (for Rogue finisher scaling). */
export function countUniqueDebuffs(statuses) {
  if (!statuses) return 0;
  let n = 0;
  for (const [effect, entry] of Object.entries(statuses)) {
    if (isBuff(effect)) continue;
    if (effect === "marked") continue;
    if ((entry?.stacks ?? 0) > 0 && (entry?.duration ?? 0) > 0) n++;
  }
  return n;
}

/** Decrement all status durations by one turn; drop expired entries. */
export function tickDurations(statuses) {
  const next = {};
  for (const [effect, entry] of Object.entries(statuses ?? {})) {
    const duration = (entry?.duration ?? 0) - 1;
    if (duration > 0) {
      next[effect] = { ...entry, duration };
    }
  }
  return next;
}

export function hasStatus(statuses, effect) {
  const entry = statuses?.[effect];
  return Boolean(entry && entry.stacks > 0 && entry.duration > 0);
}
