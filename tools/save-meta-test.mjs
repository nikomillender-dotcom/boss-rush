/**
 * Old saves may omit new class keys (e.g. cleric) — shop/battle must not crash.
 */
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

function getClassMetaFromSaveBroken(save, classKey) {
  return save.classes[classKey];
}

function ensureClassMeta(save, classKey, createDefaultClassMeta) {
  if (!save.classes[classKey]) {
    save.classes[classKey] = createDefaultClassMeta(classKey);
  }
  return save.classes[classKey];
}

const createDefaultClassMeta = (key) => ({
  hpBoost: 0,
  atkBoost: 0,
  defBoost: 0,
  skillLevels: {},
  equippedWeaponId: key === "cleric" ? "holy_rosary" : "wooden_sword",
});

const oldSave = {
  classes: {
    warrior: createDefaultClassMeta("warrior"),
    mage: createDefaultClassMeta("mage"),
  },
};

console.log("Old save without cleric:");
const broken = getClassMetaFromSaveBroken(oldSave, "cleric");
assert(broken === undefined, "legacy save missing cleric meta");

let crashed = false;
try {
  const meta = broken;
  void meta.equippedWeaponId;
} catch {
  crashed = true;
}
assert(crashed, "accessing undefined meta throws");

const fixedSave = { ...oldSave, classes: { ...oldSave.classes } };
const fixed = ensureClassMeta(fixedSave, "cleric", createDefaultClassMeta);
assert(fixed.equippedWeaponId === "holy_rosary", "ensureClassMeta creates cleric");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
