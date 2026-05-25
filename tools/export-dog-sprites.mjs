/**
 * Writes PNGs to public/sprites/dogs/ using the browser generator.
 * Run from repo root: npm run sprites:dogs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { getAllEnemySpriteKeys } from "../src/content/enemyThemes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, "generate-dog-sprites.html");
const outBase = path.join(__dirname, "..", "public", "sprites", "dogs");

async function main() {
  const keys = getAllEnemySpriteKeys();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`);
  await page.evaluate((spriteKeys) => {
    window.SPRITE_KEYS = spriteKeys;
  }, keys);
  await page.evaluate(() => window.buildAllSprites());
  await page.waitForFunction(
    (expected) => window.exports && window.exports.length >= expected,
    keys.length * 3,
    { timeout: 60000 }
  );

  const items = await page.evaluate(() =>
    window.exports.map(({ cv, zipPath }) => ({
      zipPath,
      b64: cv.toDataURL("image/png").split(",")[1],
    }))
  );

  for (const { zipPath, b64 } of items) {
    const outPath = path.join(outBase, zipPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
    console.log("wrote", zipPath);
  }

  await browser.close();
  console.log(`Done — ${items.length} files in public/sprites/dogs/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
