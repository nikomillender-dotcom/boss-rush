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
  const refPath = path.join(__dirname, "reference", "mage-cat-reference.png");
  const refB64 = fs.existsSync(refPath)
    ? fs.readFileSync(refPath).toString("base64")
    : null;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  if (refB64) {
    await page.addInitScript((b64) => {
      window.__mageRefB64 = b64;
    }, refB64);
  }
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`);
  await page.waitForFunction(
    () => window.exports && window.exports.length >= 16,
    { timeout: 15000 }
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
