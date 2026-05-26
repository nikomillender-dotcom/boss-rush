/**
 * One-shot SFX — files live in public/audio/sfx/{id}.ogg (see docs/sfx-bible.md).
 * Missing files fail silently until assets are delivered.
 */

import { getMusicMuted } from "./themeMusic.js";

const SFX_BASE = "/audio/sfx/";
const SFX_VOL = 0.55;
const POOL_PER_ID = 3;

/** All expected ids (for verify script and docs). */
export const SFX_IDS = [
  "ui_click",
  "ui_confirm",
  "ui_cancel",
  "ui_error",
  "camp_buy",
  "fight_hit",
  "fight_hit_crit",
  "defend",
  "skill_cast",
  "skill_fire",
  "skill_ice",
  "skill_thunder",
  "skill_heal",
  "skill_holy",
  "skill_poison",
  "skill_war_cry",
  "buff_apply",
  "dodge",
  "reflect",
  "lifesteal",
  "enemy_attack",
  "enemy_hit",
  "poison_tick",
  "freeze_tick",
  "afterburn",
  "coin_pickup",
  "streak",
  "victory",
  "boss_victory",
  "death",
  "floor_transition",
  "theme_transition",
  "boss_enter",
  "boss_warning",
  "auto_on",
  "auto_off",
  "run_retreat",
];

let unlocked = false;
let preloaded = false;
const pool = new Map();

export function unlockSfx() {
  unlocked = true;
  preloadSfx();
}

function srcFor(id) {
  return `${SFX_BASE}${id}.ogg`;
}

function borrowAudio(id) {
  const src = srcFor(id);
  let list = pool.get(src);
  if (!list) {
    list = [];
    pool.set(src, list);
  }
  let audio = list.find((a) => a.paused || a.ended);
  if (!audio) {
    audio = new Audio(src);
    audio.volume = SFX_VOL;
    audio.preload = "auto";
    list.push(audio);
    if (list.length > 8) list.shift();
  }
  return audio;
}

/** Warm the pool so mobile does not decode on first swing. */
export function preloadSfx() {
  if (preloaded) return;
  preloaded = true;
  for (const id of SFX_IDS) {
    const src = srcFor(id);
    for (let i = 0; i < POOL_PER_ID; i++) {
      const audio = new Audio(src);
      audio.volume = 0.001;
      audio.preload = "auto";
      audio.load();
      const list = pool.get(src) ?? [];
      list.push(audio);
      pool.set(src, list);
    }
  }
}

/**
 * Play a sound effect by id (filename without extension).
 */
export function playSfx(id) {
  if (!unlocked || getMusicMuted() || !id) return;
  try {
    const audio = borrowAudio(id);
    audio.volume = SFX_VOL;
    audio.muted = false;
    audio.currentTime = 0;
    const p = audio.play();
    if (p?.catch) p.catch(() => {});
  } catch {
    /* missing file or autoplay */
  }
}

/** Tie impact SFX to the same moment as float + shake. */
export function playCombatImpact(sfxId) {
  playSfx(sfxId);
}

/** Map skill definition to impact SFX (on hit), not cast wind-up. */
export function sfxForSkill(skill) {
  if (!skill) return "skill_cast";
  switch (skill.type) {
    case "damage":
      if (skill.isCrit || skill.id === "backstab") return "fight_hit_crit";
      if (skill.id === "thunder") return "skill_thunder";
      return "fight_hit";
    case "damage_afterburn":
      return "skill_fire";
    case "damage_freeze":
      return "skill_ice";
    case "heal":
    case "heal_block":
      return skill.type === "heal_block" ? "defend" : "skill_heal";
    case "buff_war_cry":
      return "skill_war_cry";
    case "buff_dodge":
      return "buff_apply";
    case "apply_poison":
      return "skill_poison";
    case "reflect_guard":
      return "reflect";
    case "damage_lifesteal":
      return "lifesteal";
    case "damage_steal":
      return "fight_hit";
    case "combo_light":
      return "skill_heal";
    case "combo_bio":
    case "combo_toxic_smoke":
      return "skill_poison";
    case "combo_poison_shield":
      return "defend";
    case "combo_nuke_punish":
    case "combo_dark_nuke":
      return "skill_thunder";
    default:
      return "skill_cast";
  }
}
