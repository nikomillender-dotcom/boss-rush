/**
 * One-shot SFX — files live in public/audio/sfx/{id}.ogg (see docs/sfx-bible.md).
 * Missing files fail silently until assets are delivered.
 *
 * Audio elements are created lazily on first play (inside the originating
 * user-gesture chain) — mirroring themeMusic.js. The old mass-preload of 105
 * HTMLAudioElement instances exhausted the mobile decoder pool on iOS Safari
 * and Android Chrome, leaving the borrowed elements stalled so .play()
 * silently rejected (see commit message for full root cause).
 */

import {
  getEffectiveSfxVolume,
  isVolumeAudible,
  subscribeAudioSettings,
} from "./audioSettings.js";

const SFX_BASE = "/audio/sfx/";
export const SFX_VOL = 0.3;
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
const pool = new Map();

function refreshSfxPoolVolumes() {
  const vol = getEffectiveSfxVolume(SFX_VOL);
  for (const list of pool.values()) {
    for (const a of list) {
      a.muted = false;
      a.volume = vol;
    }
  }
}

subscribeAudioSettings(refreshSfxPoolVolumes);

export function unlockSfx() {
  unlocked = true;
}

/** Kept for backwards compat; no-op since we now create audio lazily. */
export function preloadSfx() {
  /* lazy creation — see nextAudio() */
}

function srcFor(id) {
  return `${SFX_BASE}${id}.ogg`;
}

function nextAudio(id) {
  let list = pool.get(id);
  if (!list) {
    list = [];
    pool.set(id, list);
  }
  for (const a of list) {
    if (a.paused || a.ended) return a;
  }
  if (list.length < POOL_PER_ID) {
    const a = new Audio(srcFor(id));
    a.preload = "auto";
    a.volume = getEffectiveSfxVolume(SFX_VOL);
    list.push(a);
    return a;
  }
  const a = list.shift();
  list.push(a);
  return a;
}

/**
 * Play a sound effect by id (filename without extension).
 */
export function playSfx(id) {
  if (!unlocked || !id) return;
  const vol = getEffectiveSfxVolume(SFX_VOL);
  if (!isVolumeAudible(vol)) return;
  try {
    const audio = nextAudio(id);
    audio.muted = false;
    audio.volume = vol;
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
