# Claude Cowork — SFX handoff checklist

Copy this message (and attach reference OGGs) when asking Claude to produce sound effects.

---

## Your task

Create **35 one-shot SFX** for **Meow Rush: Gauntlet** (Boss Rush), matching the existing UltraBox BGM. Deliver as OGG files.

## Read these files (in the repo)

1. **[docs/sfx-bible.md](sfx-bible.md)** — full manifest, durations, tone, prompts  
2. **[public/audio/sfx/README.md](../public/audio/sfx/README.md)** — drop folder  
3. **Listen:** `public/audio/battle.ogg`, `camp.ogg`, `boss.ogg`, `themes/hell.ogg`

## Output

- One file per id: `public/audio/sfx/{id}.ogg`  
- Mono 44100 Hz OGG, normalized ~-6 dBFS peak  
- Original compositions only (no copyrighted rips)

## Verify

```bash
npm run sfx:verify
```

Must report `All SFX files ready` before we ship.

## Do not

- Change game code unless asked  
- Replace existing BGM in `public/audio/`  
- Use loops for SFX (one-shots only)
