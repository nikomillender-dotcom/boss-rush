/**
 * Fetches CC0 Kenney loops + jingles and maps them to theme OGG paths.
 * Run: node tools/prepare-theme-music.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const themesDir = path.join(root, "public", "audio", "themes");
const baseUrl =
  "https://www.gamesounds.xyz/Kenney%27s%20Sound%20Pack/Music%20Loops";

/** themeId → Kenney Music Loops paths (CC0) on gamesounds.xyz */
const THEME_SOURCES = {
  human: { file: "Retro/Retro Beat.ogg", title: "Retro Beat" },
  monster: { file: "Retro/Retro Mystic.ogg", title: "Retro Mystic" },
  hell: { file: "Loops/Sad Descent.ogg", title: "Sad Descent" },
  space: { file: "Loops/Space Cadet.ogg", title: "Space Cadet" },
  alien: { file: "Loops/German Virtue.ogg", title: "German Virtue" },
  mirror: { file: "Retro/Retro Comedy.ogg", title: "Retro Comedy" },
  heaven_low: { file: "Loops/Night at the Beach.ogg", title: "Night at the Beach" },
  olympus: { file: "Loops/Mission Plausible.ogg", title: "Mission Plausible" },
  pantheon: { file: "Loops/Flowing Rocks.ogg", title: "Flowing Rocks" },
  angelic: { file: "Loops/Alpha Dance.ogg", title: "Alpha Dance" },
};

const CAMP_SOURCE = { file: "Loops/Farm Frolics.ogg", title: "Farm Frolics" };

function enc(p) {
  return p.split("/").map(encodeURIComponent).join("/");
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  console.log(`  wrote ${path.relative(root, dest)} (${buf.length} bytes)`);
}

async function main() {
  fs.mkdirSync(themesDir, { recursive: true });

  for (const [themeId, meta] of Object.entries(THEME_SOURCES)) {
    const url = `${baseUrl}/${enc(meta.file)}`;
    const dest = path.join(themesDir, `${themeId}.ogg`);
    try {
      await download(url, dest);
    } catch (e) {
      console.warn(`  fallback jingle for ${themeId}: ${e.message}`);
      await fallbackFromJingles(themeId, dest);
    }
  }

  const campDest = path.join(root, "public", "audio", "camp.ogg");
  try {
    await download(`${baseUrl}/${enc(CAMP_SOURCE.file)}`, campDest);
  } catch (e) {
    console.warn(`  camp fallback: ${e.message}`);
    await fallbackFromJingles("camp", campDest);
  }

  writeCredits();
  console.log("\nDone. See CREDITS.txt");
}

async function fallbackFromJingles(themeId, dest) {
  const zip = path.join(__dirname, "_kenney-jingles.zip");
  const extractDir = path.join(__dirname, "_jingles_extract");
  if (!fs.existsSync(zip)) {
    throw new Error("Run: curl -L -o tools/_kenney-jingles.zip https://lpc.opengameart.org/sites/default/files/jingleSounds_Kenney.zip");
  }
  if (!fs.existsSync(extractDir)) {
    fs.mkdirSync(extractDir, { recursive: true });
    try {
      execSync(
        `powershell -NoProfile -Command "Expand-Archive -Path '${zip.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force"`,
        { stdio: "inherit" }
      );
    } catch {
      /* may already be extracted as folder */
    }
  }
  const oggs = [];
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith(".ogg")) oggs.push(p);
    }
  }
  walk(extractDir);
  if (!oggs.length) throw new Error("No OGG in jingles extract");
  const idx = [...themeId].reduce((a, c) => a + c.charCodeAt(0), 0) % oggs.length;
  fs.copyFileSync(oggs[idx], dest);
  console.log(`  copied jingle ${path.basename(oggs[idx])} → ${path.basename(dest)}`);
}

function writeCredits() {
  const lines = [
    "BOSS RUSH — AUDIO CREDITS",
    "========================",
    "",
    "All music in public/audio/ is royalty-safe for commercial use.",
    "Do NOT substitute Final Fantasy or other copyrighted game rips.",
    "",
    "---",
    "",
    "Primary pack: Kenney Music Loops (CC0 1.0)",
    "Artist: Kenney (www.kenney.nl)",
    "License: Creative Commons Zero — https://creativecommons.org/publicdomain/zero/1.0/",
    "Optional credit: \"Music by Kenney.nl\" (not required)",
    "Source mirror: https://www.gamesounds.xyz/?dir=Kenney%27s+Sound+Pack%2FMusic+Loops",
    "OpenGameArt listing (jingles fallback): https://opengameart.org/content/85-short-music-jingles",
    "",
    "Per-file mapping:",
    "",
  ];

  lines.push(
    "camp.ogg",
    `  Title: ${CAMP_SOURCE.title}`,
    "  Artist: Kenney",
    "  License: CC0",
    `  Source: ${baseUrl}/${CAMP_SOURCE.file}`,
    "",
  );

  for (const [themeId, meta] of Object.entries(THEME_SOURCES)) {
    lines.push(
      `themes/${themeId}.ogg`,
      `  Title: ${meta.title}`,
      "  Artist: Kenney",
      "  License: CC0",
      `  Source: ${baseUrl}/${meta.file}`,
      "  Notes: Used as battle BGM for floors in this theme block",
      "",
    );
  }

  lines.push("---", "", "Generated by: node tools/prepare-theme-music.mjs", "");

  const text = lines.join("\n");
  fs.writeFileSync(path.join(root, "CREDITS.txt"), text);
  fs.writeFileSync(path.join(root, "public", "CREDITS.txt"), text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
