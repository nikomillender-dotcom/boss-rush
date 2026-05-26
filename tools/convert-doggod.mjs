/**
 * Converts public/audio/doggod.wav → doggod.ogg.
 * Run: npm run music:doggod
 * Uses ffmpeg on PATH, or @ffmpeg-installer/ffmpeg.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const wavPath = path.join(root, "public", "audio", "doggod.wav");
const oggPath = path.join(root, "public", "audio", "doggod.ogg");

async function resolveFfmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return "ffmpeg";
  } catch {
    /* try bundled */
  }
  try {
    const mod = await import("@ffmpeg-installer/ffmpeg");
    return mod.default.path;
  } catch {
    return null;
  }
}

async function main() {
  if (!fs.existsSync(wavPath)) {
    console.error("Missing public/audio/doggod.wav (copy from dist/audio/themes/ if needed)");
    process.exit(1);
  }
  const ffmpeg = await resolveFfmpeg();
  if (!ffmpeg) {
    console.error("No ffmpeg found. Install ffmpeg or run: npm install");
    process.exit(1);
  }
  execSync(
    `"${ffmpeg}" -y -i "${wavPath}" -c:a libvorbis -q:a 4 "${oggPath}"`,
    { stdio: "inherit" }
  );
  console.log(`Wrote ${path.relative(root, oggPath)}`);
}

main();
