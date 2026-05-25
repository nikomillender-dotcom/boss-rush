/**
 * Theme BGM — CC0 loops from Kenney Music Loops (see CREDITS.txt).
 */

import { resolveTheme } from "../content/enemyThemes.js";

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

let campAudio = null;
let battleAudio = null;
let currentThemeId = null;
let unlocked = false;

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
  if (battleAudio) battleAudio.muted = m;
}

function makeAudio(src, volume, loop = true) {
  const a = new Audio(src);
  a.loop = loop;
  a.volume = volume;
  a.preload = "auto";
  a.muted = isMuted();
  return a;
}

/** Call on first user gesture (Start / Continue). */
export function unlockAudio() {
  unlocked = true;
  applyMute();
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
  currentThemeId = null;
  await fadeOut(a);
}

async function stopCamp() {
  if (!campAudio) return;
  const a = campAudio;
  campAudio = null;
  await fadeOut(a, 300);
}

export async function stopAllMusic() {
  await Promise.all([stopBattle(), stopCamp()]);
}

export async function playCampMusic() {
  if (!unlocked) return;
  await stopBattle();
  if (campAudio) {
    try {
      await campAudio.play();
    } catch {
      /* autoplay blocked */
    }
    return;
  }
  campAudio = makeAudio("/audio/camp.ogg", CAMP_VOL);
  try {
    await campAudio.play();
  } catch {
    /* ignore */
  }
}

export function themeIdForRound(round) {
  return resolveTheme(round).id;
}

export async function playThemeForRound(round) {
  if (!unlocked) return;
  const themeId = themeIdForRound(round);
  if (themeId === currentThemeId && battleAudio) {
    try {
      await battleAudio.play();
    } catch {
      /* ignore */
    }
    return;
  }

  if (campAudio) {
    campAudio.pause();
    campAudio = null;
  }

  await stopBattle();
  currentThemeId = themeId;
  const src = `/audio/themes/${themeId}.ogg`;
  battleAudio = makeAudio(src, BATTLE_VOL);
  try {
    await battleAudio.play();
  } catch {
    /* ignore */
  }
}

export { THEME_IDS, MUTE_KEY };
