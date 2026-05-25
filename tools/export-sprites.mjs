/**
 * Writes PNGs to public/sprites/cats/ using the browser generator.
 * Run from repo root: node tools/export-sprites.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, "generate-cat-sprites.html");
const outBase = path.join(__dirname, "..", "public", "sprites", "cats");

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`);
  await page.waitForFunction(
    () => window.exports && window.exports.length >= 40,
    { timeout: 20000 }
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
  console.log(`Done — ${items.length} files in public/sprites/cats/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
