# Adding a base class

The class system is data-driven: adding a class is mostly filling in data in the
spots below. All of these live in `BossRush.jsx` unless noted. The UI (class
select, camp/shop, build logic, per-class wallet) already iterates `CLASS_KEYS`,
so no rendering code needs to change.

## Checklist

1. **`CLASS_KEYS`** — add the new `classKey` string. This drives the class-select
   list, default save metas (`createDefaultSave`), per-class wallets, etc.

2. **`CLASSES[classKey]`** — add the class object:
   ```js
   {
     name: "Display Name",        // also add an i18n entry (see step 5)
     icon: "🐱…",                 // emoji fallback shown when no sprite exists
     maxHp, attack, baseDefense, speed,
     attackType: "physical" | "magical",
     attackLabel: "⚔️ Physical",
     weapon: "Starter Weapon Name",
     description: "...",
     skills: [ /* 1-4 skills, see step 3 */ ],
   }
   ```

3. **Skills** — each skill is `{ id, nameKey, descKey, icon, cooldown, type, ...params }`.
   Reuse an existing `type` to avoid new combat code. Supported types live in
   `executeSkill` (`damage`, `damage_afterburn`, `damage_freeze`, `heal`,
   `heal_block`, `buff_war_cry`, `buff_dodge`, `apply_poison`, `reflect_guard`,
   `damage_lifesteal`, `damage_steal`, …). Damage skills take `multiplier` or
   `damageBase`/`attackScale`; heals take `healAmount` (auto-scales via
   `calcHealAmount`). Only add a new `executeSkill` case if you need a genuinely
   new effect.

4. **Weapons** — add 5 tiers to `WEAPON_BLUEPRINTS` (`id`, `classKey`, `name`,
   `tier` 0-4, `attackMult`, `description`, optional `passive`). Set the starter
   (tier 0) as the class's default in `DEFAULT_WEAPON_IDS[classKey]`. Prices come
   from the fixed ladder in `src/battle/scaling.js` (`WEAPON_FIXED_PRICES`).
   Weapon passives: give a blueprint a `passive: { type, value }` and handle the
   `type` in `applyWeaponPassiveOnHit` (one example today: `lifesteal`).

5. **i18n** (`src/i18n/en.json` + `es.json`) — add the class name key plus each
   skill's `spell.<id>.name` / `spell.<id>.desc`. No em dashes; keep descriptions
   accurate to the actual numbers.

6. **Sprites (optional)** — drop PNGs under `public/sprites/cats/<classKey>/`
   (`combat_*.png`, box art) and wire `CLASS_SPRITES`. If omitted, the emoji
   `icon` is used automatically (`CharacterSprite` fallback), so a class is
   playable with no art.

7. **Unlock rule** — base-class unlock logic lives in
   `src/access/demoGates.js` (`isBaseClassUnlockedForAccess` /
   `baseClassUnlockHintForAccess`). Add the new class's gate (e.g. unlocked at a
   floor reached by another class) and a hint string.

## Notes
- New class metas (`createDefaultClassMeta`) already include `hpBoost/atkBoost/
  defBoost/skillLevels/ownedWeaponIds/bossesDefeated/bestFloorReached/wallet/
  megaBossKills` — no schema change needed per class.
- Per-class wallet means a new class genuinely starts at 0 coins.
- Run `node tools/save-meta-test.mjs` after adding a class to confirm meta
  creation still passes.
