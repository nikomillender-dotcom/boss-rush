/**
 * E2E: Frost Bolt must skip the enemy's counter-attack (including speed-order).
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BOSS_RUSH_URL || "http://127.0.0.1:5173";
const STORAGE_KEY = "bossRush_debug_0a40b8";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(maxMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await sleep(400);
  }
  throw new Error("Dev server did not start");
}

let exitCode = 1;
try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(BASE);
  await page.getByRole("button", { name: /START/i }).click();
  await page.getByRole("button", { name: /Whisker Mage/i }).click();
  await page.getByRole("button", { name: /START GAUNTLET/i }).click();

  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /MAGIC/i }).click();
  await page.getByRole("button", { name: /Frost Bolt/i }).click();

  await page.waitForTimeout(2500);

  const logText = await page.locator("body").innerText();
  const debugRing = await page.evaluate((key) => {
    try {
      return JSON.parse(sessionStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  }, STORAGE_KEY);

  const hasFrozenLog = /frozen.*cannot move/i.test(logText);
  const enemyFirstOnFreeze = debugRing.some(
    (e) =>
      e.location === "BossRush.jsx:submitCommand:enemy-first" &&
      e.runId === "post-fix" &&
      e.timestamp > (debugRing.find((x) => x.location === "BossRush.jsx:applyEnemyFreezeIntent")?.timestamp ?? 0)
  );
  const hasPreFreeze = debugRing.some((e) => e.location === "BossRush.jsx:applyEnemyFreezeIntent");
  const hasSkip = debugRing.some((e) => e.location === "BossRush.jsx:processEnemyTurn:skip");
  const hasAttackAfterFreeze = debugRing.some((e) => {
    const freezeTs = debugRing
      .filter((x) => x.location === "BossRush.jsx:applyEnemyFreezeIntent")
      .map((x) => x.timestamp)
      .pop();
    return (
      e.location === "BossRush.jsx:processEnemyTurn:attack" &&
      freezeTs != null &&
      e.timestamp > freezeTs &&
      e.timestamp < freezeTs + 3000
    );
  });

  console.log("Log has frozen message:", hasFrozenLog);
  console.log("Debug pre-freeze intent:", hasPreFreeze);
  console.log("Debug enemy turn skipped:", hasSkip);
  console.log("Debug enemy-first AFTER freeze intent:", enemyFirstOnFreeze);
  console.log("Debug enemy attack within 3s of freeze:", hasAttackAfterFreeze);

  if (hasFrozenLog && hasPreFreeze && hasSkip && !enemyFirstOnFreeze && !hasAttackAfterFreeze) {
    console.log("\nE2E PASS: freeze skipped enemy turn without post-freeze attack.");
    exitCode = 0;
  } else {
    console.error("\nE2E FAIL: freeze behavior did not match expectations.");
    exitCode = 1;
  }

  await browser.close();
} finally {
  /* dev server managed externally when BOSS_RUSH_URL is set */
}

process.exit(exitCode);
