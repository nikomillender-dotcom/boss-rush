/**
 * Documents auto toggle state machine (manual QA + regression notes).
 * Run: node tools/auto-control-test.mjs
 */

const cases = [
  {
    name: "tap while ON → OFF and clear timers",
    before: { autoEnabled: true, autoPaused: false },
    action: "toggleAuto",
    after: { autoEnabled: false, autoPaused: false, timersCleared: true },
  },
  {
    name: "tap while PAUSED → OFF (not resume)",
    before: { autoEnabled: true, autoPaused: true },
    action: "toggleAuto",
    after: { autoEnabled: false, autoPaused: false, timersCleared: true },
  },
  {
    name: "tap while OFF → ON",
    before: { autoEnabled: false, autoPaused: false },
    action: "toggleAuto",
    after: { autoEnabled: true, autoPaused: false },
  },
  {
    name: "unskippable boss floor now schedules auto (hands-off, fights boss)",
    round: 50,
    canAutoSkipBoss: false,
    autoEnabled: true,
    expectSchedule: "runAutoCommand",
  },
  {
    name: "skippable boss still auto-skips",
    round: 50,
    canAutoSkipBoss: true,
    autoEnabled: true,
    expectSchedule: "processAutoBossSkip",
  },
  {
    name: "auto never pauses on low HP (fights to the death)",
    before: { autoEnabled: true, hpFraction: 0.05 },
    action: "runAutoCommand",
    after: { autoPaused: false, expectSchedule: true },
  },
  {
    name: "auto-restart ON: death silently redeploys same class with auto on",
    before: { autoRestart: true, autoEnabled: true, playerDies: true },
    action: "processDeath",
    after: { scene: "battle", autoEnabled: true, gameOverShown: false },
  },
  {
    name: "auto-restart OFF: death shows game-over as before",
    before: { autoRestart: false, playerDies: true },
    action: "processDeath",
    after: { scene: "gameover", autoEnabled: false },
  },
  {
    name: "retreat returns to camp keeping all coins (loop exit, no penalty)",
    before: { runCoinsEarned: 5000, wallet: 12000 },
    action: "actionRetreat",
    after: { scene: "shop", wallet: 12000 },
  },
];

let ok = 0;
for (const c of cases) {
  console.log(`✓ ${c.name}`);
  ok++;
}
console.log(`\n${ok}/${cases.length} auto-control expectations documented.`);
console.log("Implement in BossRush.jsx: toggleAuto(), toggleAutoRestart(), processDeath() redeploy, actionRetreat() no-penalty.");
