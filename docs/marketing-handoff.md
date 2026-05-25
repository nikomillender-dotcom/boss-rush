# Boss Rush — marketing handoff

## Play now

**Production:** https://boss-rush-six.vercel.app

Install as PWA on iPhone/Android (Add to Home Screen) for full-screen play.

## Hook (one line)

Endless turn-based **cat vs wacky dog** gauntlet — ten themed 100-floor arcs, camp meta, streak coins, and free play past floor 1000.

## Try these beats

| Moment | Why |
| ------ | --- |
| Warrior **War Cry** → **Power Strike** | +25% ATK/DEF for 2 player turns; buff applies to skills |
| Floor **100** — Guy With A Dog | First capstone boss; manual command on boss floors |
| Floor **201** — Hell theme + new BGM | Theme transition + music swap |
| Floor **600** — Mirror dogs (flipped sprites) | Visual gimmick |
| Floor **1000** — Doggod | Ultimate capstone |
| Floor **1001+** — Free Play HUD | Endless scaling |

## Screenshots to capture

1. Title screen
2. Class select (scroll combos)
3. Camp / shop upgrades
4. Floor 1 battle (human theme)
5. Floor 100 boss
6. Hell block (~250) pink devil vibe
7. Floor 600 mirror flip
8. Floor 1000 Doggod
9. Free play HUD (1005+)

## Tech notes for ads

- **PWA**, mobile-first, offline-capable after first load
- **No login** — wallet + class progress in localStorage
- **Music:** CC0 Kenney loops per theme — see [CREDITS.txt](../CREDITS.txt)
- **Art:** procedural side-profile dog sprites (not FF assets)

## Known good in this build

- AUTO tap always turns **off** (clears ghost timers); paused no longer resumes on tap
- Manual boss floors (every 10) do not auto-fight unless class can skip bosses
- Skill cooldowns sync after cast (Mage/Warrior regression tests pass)
- War Cry: +25% ATK & DEF for 2 player turns
- Per-theme background music + mute toggle (♪ / 🔇)

## Launch marketing kit

Full written package (Steam copy, TikTok scripts, Reddit drafts, market check): [`marketing/README.md`](marketing/README.md)

## Link preview

Open Graph / Twitter meta in `index.html` — image uses `/icons/icon-512.png`.

## Music / legal

Do **not** use Final Fantasy or other copyrighted game rips. All shipped audio is documented in `CREDITS.txt`.
