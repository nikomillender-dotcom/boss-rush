/**
 * Writes PWA icons to public/icons/. Run: node tools/generate-pwa-icons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");

async function renderIcon(size) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: size, height: size },
  });
  await page.setContent(`<!DOCTYPE html>
<html><body style="margin:0;background:#0a0a12;">
<canvas id="c" width="${size}" height="${size}"></canvas>
<script>
const s = ${size};
const c = document.getElementById("c");
const ctx = c.getContext("2d");
ctx.fillStyle = "#0a0a12";
ctx.fillRect(0, 0, s, s);
ctx.fillStyle = "#1a2840";
ctx.fillRect(s*0.08, s*0.08, s*0.84, s*0.84);
ctx.font = "bold " + Math.floor(s*0.42) + "px serif";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText("⚔️", s/2, s/2);
</script>
</body></html>`);
  const dataUrl = await page.evaluate(() => {
    const canvas = document.getElementById("c");
    return canvas.toDataURL("image/png");
  });
  await browser.close();
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const size of [192, 512]) {
    const buf = await renderIcon(size);
    const out = path.join(outDir, `icon-${size}.png`);
    fs.writeFileSync(out, buf);
    console.log("Wrote", out);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
