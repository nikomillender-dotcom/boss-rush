# Steam store copy — Boss Rush

**Status:** Draft for when you open Steamworks. Web demo stays free through floor 100 at https://boss-rush-six.vercel.app (full unlock sold on site).  
**Suggested price band:** $2.99–$4.99 (recommend **$3.99** at launch)

---

## Short description (≤300 characters)

**Draft (287 characters):**

```
Turn-based cat vs dog boss rush—right in your browser or on Steam. Survive ten themed 100-floor arcs, upgrade at camp, unlock prestige classes, and face Doggod at floor 1000. Install the PWA for offline play; no account required.
```

**Alternate shorter (248 characters):**

```
A turn-based cat climbs an endless dog gauntlet: ten themed 100-floor arcs, camp upgrades, four classes plus prestige combos, and Free Play past floor 1000. Play free in the browser or grab the Steam build for offline comfort.
```

---

## Long description

```
BOSS RUSH

The dogs have had their day. Your cat hasn't.

Boss Rush is a turn-based boss gauntlet where you pick a class, sharpen your claws at camp, and climb a tower of increasingly unhinged canine foes. Ten themed blocks of 100 floors take you from suburban terriers to cosmic hounds—and if you survive floor 1000, Free Play keeps scaling forever.

This isn't a deckbuilder or an idle clicker. It's Fight, Skills, Defend: readable JRPG combat with streak coins, retreat risk, and boss floors that demand your full attention.

── WHY IT'S WEIRD (IN A GOOD WAY) ──

• Cat vs dog comedy that doesn't apologize—HOA enforcers, Pink Devil Dogs, planet bosses, and Doggod: All Seeing Eye.
• Camp meta between runs: weapons, skill levels, and stat boosts that persist even when you die.
• Class unlocks tied to how deep you've climbed—reach floor 50 to unlock Whisker Cleric, floor 100 on two parents for Spellclaw Knight, and more prestige combos beyond.
• Mirror Universe (floors 501–600) flips enemy sprites. Hell (201+) swaps the soundtrack. Space throws actual planet bosses at you on decade floors.
• Procedural dog portraits and CC0 Kenney battle themes—no ripped FF tracks, no stolen sprites.

── CLASSES ──

• Tabby Knight — War Cry buffs your next turns; Power Strike and Shield Wall for honest tank play.
• Whisker Mage — Fire, Blizzard, Thunder, Mend: freeze, afterburn, and the only base-class heal.
• Shadow Cat — Backstab crits, Smoke Bomb evasion, Pickpocket for coin theft.
• Whisker Cleric — Toxic Prayer, Aegis Mirror reflect, Nosferatu lifesteal.
• Spellclaw Knight & prestige combos — merge parent kits with signature finishers (unlock by mastering both parents).

── FOR PLAYERS WHO WANT ──

✓ "One more floor" progression
✓ Short sessions on phone or desktop (PWA install supported)
✓ Builds that matter in camp, not just in-run RNG
✓ Boss rushes that actually feel like boss rushes—every 10th floor, every 100th floor

Play the demo in your browser today. Wishlist on Steam for the offline package when you're ready to adopt the climb permanently.

── CREDITS ──

Music: Kenney.nl (CC0). See in-game CREDITS.txt.
```

---

## Tag suggestions (pick 15–20 in Steam backend)

**Primary (high intent):**

1. Turn-Based Combat  
2. RPG  
3. Indie  
4. Singleplayer  
5. Casual  
6. Free to Play *(only if base game stays F2P on Steam—otherwise use "Adventure")*  
7. 2D  
8. Cute  
9. Funny  
10. Fantasy  

**Secondary (discovery):**

11. JRPG  
12. Roguelite *(camp meta between runs—use if comfortable with label)*  
13. Character Action Game  
14. Minimalist  
15. Retro  
16. Family Friendly  
17. Short *(sessions can be short; content is long)*  
18. Controller *(if you add full gamepad support before ship)*  
19. Great Soundtrack  
20. Pixel Graphics *(if you emphasize sprite style in caps)*  

**Avoid unless accurate:** Deckbuilding, Souls-like, Horror, MMO, Violent.

---

## Pricing notes

| Tier | When |
|------|------|
| **$1.99** | Aggressive wishlist land-grab; undercuts tactics RPG comps |
| **$3.99** | **Recommended** — signals "real game," matches floor count |
| **$4.99** | If you add Steam achievements, cloud saves, extra languages |

- Launch discount: **0–10%** for first week unless Next Fest / fest requires deeper cut  
- **Never** discount below $1.99 in first 30 days without a reason (fest, launch)  
- Web PWA free → Steam sells **convenience** (offline, pinned install, future achievements)

---

## System requirements

### Web / PWA (current production)

**Minimum**

- **OS:** Any modern OS with HTTPS browser  
- **Browser:** Chrome 90+, Safari 14+ (iOS), Firefox 90+, Edge 90+  
- **Memory:** 512 MB RAM for tab  
- **Storage:** ~15–30 MB after first load (service worker cache)  
- **Network:** Required for first visit; offline play after cache  
- **Input:** Touch or mouse; keyboard where supported  

**Recommended**

- Phone or tablet with **Add to Home Screen** / **Install app** for full-screen play  
- Headphones for per-theme BGM  

### Steam build (future — draft)

**Minimum**

- **OS:** Windows 10 64-bit  
- **Processor:** Dual-core 2.0 GHz  
- **Memory:** 2 GB RAM  
- **Graphics:** Integrated GPU, 1280×720  
- **Storage:** 200 MB  
- **Sound:** Any  

**Recommended**

- **OS:** Windows 11 / macOS 12+ / Ubuntu 22.04+  
- **Memory:** 4 GB RAM  
- **Display:** 1920×1080 for UI scaling  

*Adjust storage/size after you package Electron/Tauri or native wrapper.*

---

## Store page checklist (Steamworks)

- [ ] Capsule art 1232×706  
- [ ] Small capsule 462×174  
- [ ] Header 920×430  
- [ ] Five+ screenshots 1920×1080 (or 16:9)  
- [ ] Trailer 30–60s (boss floors + camp)  
- [ ] Demo depot separate from full app (for Next Fest)  
- [ ] Link to web play in "about" or custom URL field  
- [ ] Content survey + pricing in USD with regional auto  
