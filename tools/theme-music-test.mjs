/**
 * themeIdForRound must return a string theme id (not undefined).
 * Run: node tools/theme-music-test.mjs
 */
import { resolveTheme } from "../src/content/enemyThemes.js";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  OK: ${msg}`);
  } else {
    fail++;
    console.error(`  FAIL: ${msg}`);
  }
}

function themeIdForRound(round) {
  const theme = resolveTheme(round);
  if (typeof theme === "string") return theme;
  return theme?.id ?? "human";
}

assert(themeIdForRound(1) === "human", "floor 1 → human");
assert(themeIdForRound(150) === "monster", "floor 150 → monster");
assert(themeIdForRound(1001) === "freeplay", "freeplay id string");
assert(typeof themeIdForRound(1) !== "undefined", "never undefined");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
