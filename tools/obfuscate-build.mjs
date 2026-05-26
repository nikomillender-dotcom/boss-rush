/**
 * Post-build obfuscation for production JS bundle (deterrent only).
 * Run: npm run build:release
 */
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import JavaScriptObfuscator from "javascript-obfuscator";

const distAssets = join(process.cwd(), "dist", "assets");
let files;
try {
  files = readdirSync(distAssets).filter(
    (f) => f.startsWith("index-") && f.endsWith(".js")
  );
} catch (err) {
  console.error("[obfuscate] dist/assets missing — run vite build first");
  process.exit(1);
}

if (files.length === 0) {
  console.warn("[obfuscate] no index-*.js found — skipping");
  process.exit(0);
}

const options = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: false,
  stringArray: true,
  stringArrayThreshold: 0.5,
  unicodeEscapeSequence: false,
};

for (const file of files) {
  const path = join(distAssets, file);
  const code = readFileSync(path, "utf8");
  const result = JavaScriptObfuscator.obfuscate(code, options);
  writeFileSync(path, result.getObfuscatedCode());
  console.log("[obfuscate]", file);
}

console.log("[obfuscate] done");
