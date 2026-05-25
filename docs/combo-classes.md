# Combo prestige classes

Combo classes are **normal camps** (shop HP/ATK/DEF, weapons, skill upgrades) with harder unlocks and higher caps. They are not a separate “ascension” mode.

## Rules (all combos)

| Rule | Detail |
|------|--------|
| Camp | Same shop flow as base classes on `save.classes[comboKey]` |
| Upgrade cap | **200** for HP, ATK, DEF, and each skill (bases stay **100**) |
| Weapons | Per-combo weapon ladders in `WEAPON_BLUEPRINTS`; combo-only tiers |
| Skill roster | Union of both parents’ skills **plus one signature** (`getComboSkillBases`) |
| Skill levels | Stored only on combo `skillLevels`; start at **0** on first unlock — **no** parent borrowing |
| Innate stats | Sum of both parents’ **base** `maxHp`, `attack`, `baseDefense` from `CLASSES` — **exclude** parent camp boosts |
| Unlock | **Floor 100** on **both** parent classes (`COMBO_UNLOCK_FLOOR`) |

## Spellclaw Knight (Warrior + Mage)

**Passive**

- All skills: **cooldown +1** (after camp CD reductions).
- All skill damage: **×1.25** (tune in playtest).

**Signature — Light**

- ~**2.75×** ATK nuke + **full HP heal**.
- Large cooldown (base **9**).

**FIGHT:** Normal.

## Sage of the Meow (Mage + Cleric)

**Passive — status efficacy**

- **Freeze:** guaranteed **2–4** turns (not mage 1–3).
- **Afterburn:** at least **2** carriers (or +1 vs baseline).
- **Poison:** compounding tick — damage rises each poison turn on the same target.

**Signature — Bio**

- Damage above Fire/Blizzard, below Thunder.
- Applies/refreshes standard 3-turn poison.

**FIGHT:** Normal.

## Sunclaw Templar (Warrior + Cleric)

**Passive**

- **Heal 8% max HP** at start of each player turn.

**Signature — Poison Shield**

- Block next hit (Shield Wall–style) and **poison attacker** on contact.
- Cooldown ~**6**.

**FIGHT:** Normal.

## Bladeclaw Duelist (Warrior + Rogue)

**Passive — FIGHT**

- **Two hits:** first normal ATK roll, second **×1.5** (separate damage / log).

**Signature — Flurry Burst**

- High burst damage.
- On cast: **+2** to all skills’ **current** cooldowns.

**FIGHT:** Uses dual-hit passive.

## Trickclaw Arcanist (Mage + Rogue)

**Passive — FIGHT**

- If enemy **HP < maxHp**, FIGHT damage **×1.33**.

**Signature — Dark Magic**

- Massive single-target nuke; long cooldown.
- On cast: **+2** to all current cooldowns.

**FIGHT:** Uses wounded-enemy passive.

## Plagueclaw (Rogue + Cleric)

**Passive — FIGHT**

- If enemy has **poison** (`poisonTurnsLeft > 0`), FIGHT damage **×2**.

**Signature — Toxic Smoke**

- **Evade** next enemy attack.
- **Poison** enemy.
- Moderate cooldown (~**5**).

**FIGHT:** Uses poisoned-enemy passive.
