# Sound effects (Claude / Cowork delivery)

Drop **OGG** one-shots here. The game plays them automatically once files exist.

## Instructions for Claude

1. Read **[docs/sfx-bible.md](../../../docs/sfx-bible.md)** in full (tone, UltraBox style, file list, durations).
2. Listen to reference BGM in `public/audio/`: `battle.ogg`, `camp.ogg`, `boss.ogg`, `themes/hell.ogg`.
3. Export each sound as **`{id}.ogg`** mono, 44100 Hz, short tails (see bible table).
4. Place every file in **this folder** (`public/audio/sfx/`).
5. Run `npm run sfx:verify` to list any missing files.

## Example

```
public/audio/sfx/
  fight_hit.ogg
  victory.ogg
  ui_click.ogg
  ...
```

No code changes needed after drop-in — redeploy or hard-refresh the PWA.

## License

Original compositions only. Add one block per file in `public/CREDITS.txt` when delivered.
