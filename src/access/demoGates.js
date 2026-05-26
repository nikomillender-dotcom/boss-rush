import { DEMO_MAX_FLOOR } from "./constants.js";
import { accountBestFloor } from "./saveIntegrity.js";

const BASE_UNLOCK = {
  warrior: 0,
  mage: 5,
  rogue: 20,
  cleric: 50,
};

/**
 * Base class selectable in demo: warrior + mage (floor 5+). Rogue/cleric require full game.
 */
export function isBaseClassUnlockedForAccess(save, classKey, accessMode) {
  if (accessMode === "full") {
    const need = BASE_UNLOCK[classKey] ?? 0;
    return accountBestFloor(save) >= need;
  }
  if (classKey === "warrior") return true;
  if (classKey === "mage") return accountBestFloor(save) >= 5;
  return false;
}

export function baseClassUnlockHintForAccess(
  save,
  classKey,
  accessMode,
  t,
  getLocalizedClass
) {
  if (accessMode === "full") {
    const need = BASE_UNLOCK[classKey] ?? 0;
    if (need <= 0) return "";
    return t("select.classUnlock", {
      floor: need,
      name: getLocalizedClass(classKey).name,
    });
  }
  if (classKey === "mage") {
    const need = 5;
    if (accountBestFloor(save) >= need) return "";
    return t("select.classUnlock", { floor: need, name: getLocalizedClass(classKey).name });
  }
  return t("access.fullGameClass");
}

export function demoFloorsRemaining(round) {
  return Math.max(0, DEMO_MAX_FLOOR - round);
}

export function shouldShowDemoHudBanner(round, accessMode) {
  return accessMode === "demo" && round >= 50 && round <= DEMO_MAX_FLOOR;
}

export function shouldShowFloor10Tease(round) {
  return round === 10;
}
