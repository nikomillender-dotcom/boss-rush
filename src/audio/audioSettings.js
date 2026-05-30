/**
 * Master / music / SFX volume prefs (localStorage). Migrates legacy bossRush_muted.
 */

const LEGACY_MUTE_KEY = "bossRush_muted";
const MIGRATED_KEY = "bossRush_vol_migrated";

export const VOLUME_KEYS = {
  master: "bossRush_vol_master",
  music: "bossRush_vol_music",
  sfx: "bossRush_vol_sfx",
};

export const SILENCE_THRESHOLD = 0.001;

const listeners = new Set();

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function readVolume(key, fallback = 1) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? clamp01(n) : fallback;
  } catch {
    return fallback;
  }
}

function writeVolume(key, value) {
  try {
    localStorage.setItem(key, String(clamp01(value)));
  } catch {
    /* ignore */
  }
}

function notifyListeners() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

export function migrateLegacyMute() {
  try {
    if (localStorage.getItem(MIGRATED_KEY) === "1") return;
    if (localStorage.getItem(LEGACY_MUTE_KEY) === "1") {
      writeVolume(VOLUME_KEYS.master, 0);
    }
    localStorage.setItem(MIGRATED_KEY, "1");
  } catch {
    /* ignore */
  }
}

migrateLegacyMute();

export function subscribeAudioSettings(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMasterVolume() {
  return readVolume(VOLUME_KEYS.master, 1);
}

export function getMusicVolume() {
  return readVolume(VOLUME_KEYS.music, 1);
}

export function getSfxVolume() {
  return readVolume(VOLUME_KEYS.sfx, 1);
}

export function getEffectiveMusicVolume(baseTrackVol) {
  return clamp01(baseTrackVol * getMasterVolume() * getMusicVolume());
}

export function getEffectiveSfxVolume(baseSfxVol = 0.3) {
  return clamp01(baseSfxVol * getMasterVolume() * getSfxVolume());
}

export function isVolumeAudible(effectiveVol) {
  return effectiveVol > SILENCE_THRESHOLD;
}

export function setMasterVolume(value) {
  writeVolume(VOLUME_KEYS.master, value);
  notifyListeners();
}

export function setMusicVolume(value) {
  writeVolume(VOLUME_KEYS.music, value);
  notifyListeners();
}

export function setSfxVolume(value) {
  writeVolume(VOLUME_KEYS.sfx, value);
  notifyListeners();
}

export function setMuteAll(muted) {
  setMasterVolume(muted ? 0 : 1);
}

/** @deprecated Use getMasterVolume() === 0 for mute-all state. */
export function getMusicMuted() {
  return getMasterVolume() <= SILENCE_THRESHOLD;
}

/** @deprecated Use setMuteAll(). */
export function setMusicMuted(muted) {
  setMuteAll(muted);
}

export function getAudioSettingsSnapshot() {
  return {
    master: getMasterVolume(),
    music: getMusicVolume(),
    sfx: getSfxVolume(),
  };
}
