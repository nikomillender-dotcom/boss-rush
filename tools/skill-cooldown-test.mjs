/**
 * Skill cooldown helpers (mirror BossRush.jsx logic).
 * Run: node tools/skill-cooldown-test.mjs
 */

function cooldownFromLevel(baseCooldown, level) {
  let cd = baseCooldown ?? 1;
  if (level >= 5) cd -= 1;
  if (level >= 10) cd -= 1;
  return Math.max(1, cd);
}

function applySkillCastCooldown(skills, skillIndex) {
  return skills.map((s, i) => {
    if (i !== skillIndex) return s;
    const cd = Math.max(1, s.cooldown ?? 1);
    return { ...s, currentCooldown: cd };
  });
}

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("OK:", msg);
  }
}

ok(cooldownFromLevel(undefined, 0) === 1, "undefined base → 1");
ok(cooldownFromLevel(6, 10) === 4, "thunder L10 → 4");
ok(!Number.isNaN(cooldownFromLevel(undefined, 10)), "no NaN at high level");

const skills = [
  { id: "fire", cooldown: 3, currentCooldown: 0 },
  { id: "mend", cooldown: 4, currentCooldown: 0 },
];
const after = applySkillCastCooldown(skills, 0);
ok(after[0].currentCooldown === 3, "cast fire → CD 3");
ok(after[1].currentCooldown === 0, "mend untouched");

// Simulate commitPlayer spread preserving CD
const live = { skills: after };
const committed = { ...live, hp: 5, skills: live.skills };
ok(committed.skills[0].currentCooldown === 3, "commit spread keeps CD");

console.log(failed ? `\n${failed} failed` : "\nAll passed");
process.exit(failed ? 1 : 0);
