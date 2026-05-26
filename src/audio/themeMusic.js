/**
 * Theme BGM — Kenney fallbacks + custom UltraBox/Cowork loops (see CREDITS.txt).
 */

import { resolveTheme } from "../content/enemyThemes.js";
import { isBossRound } from "../battle/scaling.js";

const THEME_IDS = [
  "human",
  "monster",
  "hell",
  "space",
  "alien",
  "mirror",
  "heaven_low",
  "olympus",
  "pantheon",
  "angelic",
];

const BATTLE_VOL = 0.4;
const CAMP_VOL = 0.28;
const MUTE_KEY = "bossRush_muted";

const START_TRACK = "/audio/start.ogg";
const CAMP_TRACK = "/audio/camp.ogg";
const DOGGOD_TRACK_CANDIDATES = ["/audio/doggod.ogg", "/audio/doggod.wav"];
const BOSS_TRACK = "/audio/boss.ogg";
const HELL_TRACK = "/audio/themes/hell.ogg";
const BATTLE_TRACK_CANDIDATES = ["/audio/battle.ogg", "/audio/battle.mp3"];

const THEME_FALLBACK_ID = "human";
const FREEPLAY_THEME_ID = "angelic";
const DOGGOD_FLOOR = 1000;

/** Seconds trimmed from loop end to reduce seam clicks (see docs/music-sources.md). */
const DEFAULT_LOOP_TAIL_TRIM = 0.08;

const LOOP_TAIL_TRIM_BY_SRC = {
  [START_TRACK]: 0.06,
  [CAMP_TRACK]: 0.06,
  [BOSS_TRACK]: 0.08,
  [HELL_TRACK]: 0.08,
  "/audio/battle.ogg": 0.08,
  "/audio/battle.mp3": 0.05,
  "/audio/doggod.ogg": 0.08,
  "/audio/doggod.wav": 0.08,
};

let campAudio = null;
let titleAudio = null;
let battleAudio = null;
let currentCampSrc = null;
let currentTitleSrc = null;
let currentBattleSrc = null;
let battleStarting = false;
let unlocked = false;

const fileExistsCache = new Map();
let loopResetCount = 0;

function debugLog(runId, hypothesisId, location, message, data = {}) {
  // #region agent log
  fetch("http://127.0.0.1:7481/ingest/7717fbd8-b2fd-4e77-9f73-238fcec14f76", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0a40b8" },
    body: JSON.stringify({
      sessionId: "0a40b8",
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMusicMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
  applyMute();
}

export function getMusicMuted() {
  return isMuted();
}

function applyMute() {
  const m = isMuted();
  if (campAudio) campAudio.muted = m;
  if (titleAudio) titleAudio.muted = m;
  if (battleAudio) battleAudio.muted = m;
}

function attachSeamlessLoop(audio, src) {
  const tailTrim = LOOP_TAIL_TRIM_BY_SRC[src] ?? DEFAULT_LOOP_TAIL_TRIM;
  // Native loop is more reliable on mobile than timeupdate rewinds.
  audio.loop = true;
  debugLog("post-fix", "H1", "themeMusic.js:109", "loop-configured", {
    src,
    loop: audio.loop,
    tailTrim,
  });
  audio.addEventListener("ended", () => {
    debugLog("pre-fix", "H1", "themeMusic.js:125", "audio-ended", {
      src,
      currentTime: audio.currentTime,
      duration: audio.duration,
    });
    // Fallback for browsers that still fire ended despite loop=true.
    if (!audio.loop) return;
    loopResetCount += 1;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    debugLog("post-fix", "H1", "themeMusic.js:134", "loop-ended-fallback-restart", {
      src,
      resetCount: loopResetCount,
    });
  });
}

function makeAudio(src, volume) {
  const a = new Audio(src);
  a.volume = volume;
  a.playbackRate = 1;
  a.preload = "auto";
  a.muted = isMuted();
  attachSeamlessLoop(a, src);
  return a;
}

function isPlaying(audio) {
  return Boolean(audio && !audio.paused && !audio.ended);
}

/** Call on first user gesture (Start / Continue). */
export function unlockAudio() {
  unlocked = true;
  applyMute();
}

async function fileExists(src) {
  if (fileExistsCache.has(src)) return fileExistsCache.get(src);
  let ok = false;
  try {
    const res = await fetch(src, { method: "HEAD" });
    ok = res.ok;
  } catch {
    ok = false;
  }
  fileExistsCache.set(src, ok);
  return ok;
}

async function firstExisting(paths) {
  for (const src of paths) {
    if (await fileExists(src)) return src;
  }
  return null;
}

function fadeOut(audio, ms = 400) {
  if (!audio) return Promise.resolve();
  return new Promise((resolve) => {
    const start = audio.volume;
    const steps = 8;
    let i = 0;
    const tick = () => {
      i += 1;
      audio.volume = Math.max(0, start * (1 - i / steps));
      if (i >= steps) {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = start;
        resolve();
      } else {
        setTimeout(tick, ms / steps);
      }
    };
    tick();
  });
}

async function stopBattle() {
  if (!battleAudio) return;
  const a = battleAudio;
  battleAudio = null;
  currentBattleSrc = null;
  await fadeOut(a);
}

async function stopCamp() {
  if (!campAudio) return;
  const a = campAudio;
  campAudio = null;
  currentCampSrc = null;
  await fadeOut(a, 300);
}

async function stopTitle() {
  if (!titleAudio) return;
  const a = titleAudio;
  titleAudio = null;
  currentTitleSrc = null;
  await fadeOut(a, 300);
}

export async function stopAllMusic() {
  await Promise.all([stopBattle(), stopCamp(), stopTitle()]);
}

async function resolveTitleTrackSrc() {
  if (await fileExists(START_TRACK)) return START_TRACK;
  return CAMP_TRACK;
}

export async function playTitleMusic() {
  await stopBattle();
  await stopCamp();

  const src = await resolveTitleTrackSrc();
  if (titleAudio && currentTitleSrc === src) {
    if (!isPlaying(titleAudio)) {
      try {
        await titleAudio.play();
      } catch {
        /* autoplay blocked */
      }
    }
    return;
  }

  if (titleAudio && currentTitleSrc !== src) {
    await stopTitle();
  }
  if (!titleAudio) {
    currentTitleSrc = src;
    titleAudio = makeAudio(src, CAMP_VOL);
    try {
      await titleAudio.play();
    } catch {
      /* autoplay blocked until user gesture */
    }
  }
}

export async function playCampMusic() {
  await stopBattle();
  await stopTitle();

  if (campAudio && currentCampSrc === CAMP_TRACK) {
    if (!isPlaying(campAudio)) {
      try {
        await campAudio.play();
      } catch {
        /* autoplay blocked */
      }
    }
    return;
  }

  currentCampSrc = CAMP_TRACK;
  campAudio = makeAudio(CAMP_TRACK, CAMP_VOL);
  try {
    await campAudio.play();
  } catch {
    /* ignore */
  }
}

export function themeIdForRound(round) {
  const theme = resolveTheme(round);
  if (typeof theme === "string") return theme;
  return theme?.id ?? THEME_FALLBACK_ID;
}

async function resolveBattleTrackSrc(round, { autoEnabled = false } = {}) {
  if (round === DOGGOD_FLOOR) {
    const doggod = await firstExisting(DOGGOD_TRACK_CANDIDATES);
    if (doggod) return doggod;
  }
  if (!autoEnabled && isBossRound(round) && (await fileExists(BOSS_TRACK))) {
    return BOSS_TRACK;
  }
  if (themeIdForRound(round) === "hell" && (await fileExists(HELL_TRACK))) {
    return HELL_TRACK;
  }
  const battle = await firstExisting(BATTLE_TRACK_CANDIDATES);
  if (battle) return battle;

  let themeId = themeIdForRound(round);
  if (themeId === "freeplay") themeId = FREEPLAY_THEME_ID;
  if (!THEME_IDS.includes(themeId)) themeId = THEME_FALLBACK_ID;
  return `/audio/themes/${themeId}.ogg`;
}

export async function playThemeForRound(round, { autoEnabled = false } = {}) {
  debugLog("pre-fix", "H1", "themeMusic.js:297", "play-theme-request", {
    round,
    autoEnabled,
    unlocked,
    battleStarting,
    currentBattleSrc,
    hasBattleAudio: Boolean(battleAudio),
    isPlaying: isPlaying(battleAudio),
  });
  if (!unlocked || battleStarting) return;
  const src = await resolveBattleTrackSrc(round, { autoEnabled });

  if (src === currentBattleSrc && battleAudio && isPlaying(battleAudio)) {
    return;
  }

  if (campAudio) {
    campAudio.pause();
    campAudio.currentTime = 0;
    campAudio = null;
    currentCampSrc = null;
  }
  if (titleAudio) {
    titleAudio.pause();
    titleAudio.currentTime = 0;
    titleAudio = null;
    currentTitleSrc = null;
  }

  battleStarting = true;
  try {
    if (src !== currentBattleSrc || !battleAudio) {
      await stopBattle();
      currentBattleSrc = src;
      battleAudio = makeAudio(src, BATTLE_VOL);
    }
    battleAudio.playbackRate = 1;
    if (!isPlaying(battleAudio)) {
      try {
        await battleAudio.play();
      } catch {
        /* ignore */
      }
    }
  } finally {
    battleStarting = false;
  }
}

export { THEME_IDS, MUTE_KEY };
