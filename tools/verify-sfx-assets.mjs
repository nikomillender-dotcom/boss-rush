/**
 * Lists missing SFX OGG files. Run: npm run sfx:verify
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SFX_IDS } from "../src/audio/sfx.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sfxDir = path.join(__dirname, "..", "public", "audio", "sfx");

const missing = [];
const present = [];

for (const id of SFX_IDS) {
  const p = path.join(sfxDir, `${id}.ogg`);
  if (fs.existsSync(p)) present.push(id);
  else missing.push(id);
}

console.log(`SFX: ${present.length}/${SFX_IDS.length} present in public/audio/sfx/`);

if (present.length) {
  console.log("\nPresent:");
  for (const id of present) console.log(`  ✓ ${id}.ogg`);
}

if (missing.length) {
  console.log("\nMissing (Claude should add):");
  for (const id of missing) console.log(`  ✗ ${id}.ogg`);
  console.log("\nSee docs/sfx-bible.md and public/audio/sfx/README.md");
  process.exit(1);
}

console.log("\nAll SFX files ready.");
