# Press kit checklist — Boss Rush

**Play (production):** https://boss-rush-six.vercel.app  
**Repo icons:** `public/icons/icon-512.png`, `icon-192.png`  
**Handoff shots:** [`../marketing-handoff.md`](../marketing-handoff.md)

---

## What exists today (in repo / live build)

| Asset | Status | Location / notes |
|-------|--------|------------------|
| Playable game (HTTPS) | ✅ Live | https://boss-rush-six.vercel.app |
| PWA manifest + install | ✅ | `manifest.webmanifest`, service worker in build |
| App icon 512 / 192 | ✅ | `public/icons/` |
| Open Graph / Twitter meta | ✅ | `index.html` → `/icons/icon-512.png` |
| Cat sprites (all classes) | ✅ | `public/sprites/cats/{classKey}/` |
| Dog sprites (themed) | ✅ | `public/sprites/dogs/` |
| CC0 music + credits doc | ✅ | `public/audio/themes/`, `CREDITS.txt` |
| Enemy / theme documentation | ✅ | `docs/enemy-themes.md` |
| Class / combo documentation | ✅ | `docs/combo-classes.md`, `BossRush.jsx` CLASSES |
| Marketing copy package | ✅ | `docs/marketing/*` (this folder) |
| Marketing handoff for creators | ✅ | `docs/marketing-handoff.md` |

---

## What is missing (you must create)

| Asset | Priority | Spec |
|-------|----------|------|
| **Trailer** (30–60s) | High | MP4 H.264, 1920×1080 or 1080×1920 vertical cut |
| **Screenshot set** (9 shots) | High | PNG, 1920×1080 or native phone res; see shot list below |
| **GIF / short loops** | Medium | Floor 100 boss, War Cry, mirror flip |
| **Logo wordmark** | Medium | Transparent PNG for press header |
| **Steam capsule** | High (if Steam) | **1232 × 706** px — main store capsule |
| **Steam small capsule** | High | **462 × 174** px |
| **Steam header** | High | **920 × 430** px |
| **Steam library hero** | Medium | **3840 × 1240** px (optional but recommended) |
| **Steam page background** | Low | **1438 × 810** px |
| **Press ZIP** | Medium | `/press.zip` on site or Google Drive — trailer + 5 PNGs + fact sheet PDF |
| **Fact sheet PDF** | Low | One-pager from press release |
| **Developer photo / bio** | Low | For press inquiries |

---

## Required screenshot list (capture from live build)

1. Title screen (personal best visible)  
2. Class select — scroll to show combo rows  
3. Camp / shop with upgrades priced  
4. Floor 1 battle — human theme (Yard Terrier or similar)  
5. Floor 100 — **Guy With A Dog** boss UI  
6. Hell block ~250 — **Pink Devil Dog** or Underbark transition  
7. Floor 600 — **Inverted Overdog** (mirror flip obvious)  
8. Floor 1000 — **Doggod: All Seeing Eye**  
9. Free Play HUD — floor **1005+**

**Capture tips:** Hide desktop browser UI; use iPhone PWA for one “mobile authentic” shot.

---

## Steam capsule checklist (when you open Steamworks)

Source: [Steamworks — Store Graphical Assets](https://partner.steamgames.com/doc/store/assets/graphicalassets) (verify current spec in partner docs).

- [ ] **Main capsule** — 1232×706 — readable at thumbnail size; cat + dog silhouette, big floor number  
- [ ] **Small capsule** — 462×174 — simplify composition; no small text  
- [ ] **Header** — 920×430 — used on store page top  
- [ ] **Library capsule** — 600×900 (grid) if required by current Steam UI  
- [ ] **Library hero** — 3840×1240 — wide banner  
- [ ] **Icon** — 32×32, 64×64 (from 512 source downscale)  
- [ ] **Screenshots** — min 5, 1920×1080 recommended  
- [ ] **Trailer** — upload to Steam Video or YouTube unlisted link per current workflow  
- [ ] **Demo branch** — separate depot for Next Fest if applicable  

**Design notes:** Avoid cluttering capsule with ten theme names; one hook line: **“1000 floors. One cat.”**

---

## Legal / attribution (include in press ZIP README)

```
Boss Rush
Music: Kenney.nl — CC0 1.0 (see CREDITS.txt in repo)
No Final Fantasy or third-party franchise assets.
Contact: [email]
Play: https://boss-rush-six.vercel.app
```

---

## Hosting press kit

**Option A:** `https://boss-rush-six.vercel.app/press/` static folder in `public/press/`  
**Option B:** GitHub Release attachment  
**Option C:** Google Drive / itch “press” page  

Minimum viable press kit = **5 screenshots + 1 trailer + fact sheet link**.
