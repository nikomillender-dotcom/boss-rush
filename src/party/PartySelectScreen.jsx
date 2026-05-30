import { useState } from "react";
import {
  PARTY_CLASS_KEYS,
  PARTY_CLASS_NAMES,
  getStatLetterCard,
} from "../content/classDefinitions.js";

const SLOT_COUNT = 4;
const GRID_SIZE = 16;

/**
 * Party comp picker: 4×4 grid — base classes selectable, combos/mystery grayed.
 */
export default function PartySelectScreen({
  colors,
  screenShell,
  lastComp,
  partyWallet,
  partyBestFloor,
  comboKeys = [],
  comboUnlocked = () => false,
  getComboLabel = (k) => k,
  onBack,
  onStart,
}) {
  const [slots, setSlots] = useState(() => {
    const seed =
      Array.isArray(lastComp) && lastComp.length === 4 ? lastComp : [...PARTY_CLASS_KEYS];
    return seed.slice(0, SLOT_COUNT);
  });
  const [activeSlot, setActiveSlot] = useState(0);
  const [infoKey, setInfoKey] = useState(null);

  const used = new Set(slots.filter(Boolean));
  const canStart = slots.length === SLOT_COUNT && new Set(slots).size === SLOT_COUNT;

  const gridCells = buildGridCells(comboKeys);

  function pickClass(classKey) {
    if (!PARTY_CLASS_KEYS.includes(classKey)) return;
    setSlots((prev) => {
      const next = [...prev];
      for (let i = 0; i < next.length; i++) {
        if (i !== activeSlot && next[i] === classKey) next[i] = null;
      }
      next[activeSlot] = classKey;
      return next;
    });
  }

  return (
    <div style={{ ...screenShell, animation: "fadeUp 0.35s ease" }}>
      <div style={{ fontSize: 10, color: colors.gold, marginBottom: 8 }}>PARTY MODE</div>
      <div style={{ fontSize: 7, color: colors.muted, lineHeight: 1.8, marginBottom: 8 }}>
        Pick four unique cats. Tap a slot, then tap a class.
      </div>
      <div style={{ fontSize: 7, color: colors.dimmed, marginBottom: 12 }}>
        Wallet 💰 {Number(partyWallet || 0).toLocaleString()} · Best floor {partyBestFloor ?? 0}
      </div>

      <div style={{ fontSize: 7, color: colors.muted, marginBottom: 6 }}>
        Your party (slot {activeSlot + 1} active)
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {slots.map((key, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveSlot(i)}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 6,
              padding: "10px 12px",
              minWidth: 72,
              cursor: "pointer",
              border: `2px solid ${activeSlot === i ? colors.gold : colors.surfaceBorder}`,
              background: colors.surface,
              color: key ? colors.fight : colors.dimmed,
            }}
          >
            {key ? PARTY_CLASS_NAMES[key] : "—"}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
          width: "100%",
          maxWidth: 320,
          marginBottom: 12,
        }}
      >
        {gridCells.map((cell) => {
          const selectable = cell.kind === "base";
          const unlockedCombo = cell.kind === "combo" && comboUnlocked(cell.key);
          const disabled = !selectable && !unlockedCombo;
          const taken = used.has(cell.key) && slots[activeSlot] !== cell.key;
          return (
            <button
              key={cell.id}
              type="button"
              disabled={disabled || taken || cell.kind === "mystery"}
              onClick={() => {
                if (selectable || unlockedCombo) pickClass(cell.key);
                if (selectable) setInfoKey(cell.key);
              }}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 5,
                padding: "10px 4px",
                minHeight: 44,
                cursor: disabled || taken ? "not-allowed" : "pointer",
                opacity: disabled ? 0.35 : taken ? 0.4 : 1,
                border: `1px solid ${selectable ? colors.fightBorder : "#2a2a3a"}`,
                background: selectable ? `${colors.fight}15` : "#0a0a12",
                color: selectable ? colors.fight : colors.dimmed,
              }}
            >
              {cell.label}
            </button>
          );
        })}
      </div>

      {infoKey && PARTY_CLASS_KEYS.includes(infoKey) && (
        <pre
          style={{
            fontSize: 6,
            color: colors.muted,
            textAlign: "left",
            whiteSpace: "pre-wrap",
            maxWidth: 320,
            marginBottom: 12,
          }}
        >
          {JSON.stringify(getStatLetterCard(infoKey), null, 2)}
        </pre>
      )}

      <button
        type="button"
        disabled={!canStart}
        onClick={() => canStart && onStart(slots)}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 10,
          padding: "14px 28px",
          cursor: canStart ? "pointer" : "not-allowed",
          opacity: canStart ? 1 : 0.45,
          border: `2px solid ${colors.fightBorder}`,
          background: `${colors.fight}22`,
          color: colors.fight,
        }}
      >
        Start run
      </button>

      <button
        type="button"
        onClick={onBack}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 7,
          padding: "10px 20px",
          marginTop: 12,
          cursor: "pointer",
          border: "1px solid #2a2a3a",
          background: "transparent",
          color: colors.dimmed,
        }}
      >
        Back
      </button>
    </div>
  );
}

function buildGridCells(comboKeys) {
  const cells = PARTY_CLASS_KEYS.map((key) => ({
    id: key,
    key,
    kind: "base",
    label: PARTY_CLASS_NAMES[key]?.split(" ")[0] ?? key,
  }));
  for (const key of comboKeys) {
    cells.push({
      id: `combo-${key}`,
      key,
      kind: "combo",
      label: "◇",
    });
  }
  while (cells.length < GRID_SIZE) {
    cells.push({
      id: `mystery-${cells.length}`,
      key: null,
      kind: "mystery",
      label: "??",
    });
  }
  return cells.slice(0, GRID_SIZE);
}
