/**
 * Verifies cat and dog sprite PNGs exist for all expected keys.
 * Run: node tools/verify-sprite-assets.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAllEnemySpriteKeys } from "../src/content/enemyThemes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const CAT_CLASSES = [
  "warrior",
  "mage",
  "rogue",
  "cleric",
  "mage_knight",
  "sage",
  "templar",
  "duelist",
  "arcanist",
  "plaguecat",
];

const CAT_FILES = ["box.png", "combat_healthy.png", "combat_alert.png", "combat_hurt.png"];
const DOG_FILES = ["combat_healthy.png", "combat_alert.png", "combat_hurt.png"];

function checkDir(base, key, files) {
  const missing = [];
  for (const file of files) {
    const p = path.join(base, key, file);
    if (!fs.existsSync(p)) missing.push(path.relative(root, p));
  }
  return missing;
}

function main() {
  const catsRoot = path.join(root, "public", "sprites", "cats");
  const dogsRoot = path.join(root, "public", "sprites", "dogs");
  const allMissing = [];

  for (const key of CAT_CLASSES) {
    allMissing.push(...checkDir(catsRoot, key, CAT_FILES));
  }

  for (const key of getAllEnemySpriteKeys()) {
    allMissing.push(...checkDir(dogsRoot, key, DOG_FILES));
  }

  if (allMissing.length) {
    console.error("Missing sprite files:");
    for (const m of allMissing) console.error(`  ${m}`);
    process.exit(1);
  }

  console.log(
    `OK: ${CAT_CLASSES.length} cat classes, ${getAllEnemySpriteKeys().length} dog sprite keys`
  );
}

main();
