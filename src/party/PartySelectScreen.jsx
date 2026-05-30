import { useState } from "react";
import {
  PARTY_CLASS_KEYS,
  PARTY_CLASS_NAMES,
  getStatLetterCard,
} from "../content/classDefinitions.js";

const SLOT_COUNT = 4;

/**
 * Minimal party comp picker: four unique base classes, then start run.
 */
export default function PartySelectScreen({
  colors,
  screenShell,
  lastComp,
  partyWallet,
  partyBestFloor,
  onBack,
  onStart,
}) {
  const [slots, setSlots] = useState(() => {
    const seed = Array.isArray(lastComp) && lastComp.length === 4 ? lastComp : [...PARTY_CLASS_KEYS];
    return seed.slice(0, SLOT_COUNT);
  });
  const [infoKey, setInfoKey] = useState(null);

  const used = new Set(slots.filter(Boolean));
  const canStart = slots.length === SLOT_COUNT && new Set(slots).size === SLOT_COUNT;

  function pickSlot(slotIndex, classKey) {
    setSlots((prev) => {
      const next = [...prev];
      for (let i = 0; i < next.length; i++) {
        if (i !== slotIndex && next[i] === classKey) next[i] = null;
      }
      next[slotIndex] = classKey;
      return next;
    });
  }

  function clearSlot(slotIndex) {
    setSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  }

  return (
    <div style={{ ...screenShell, animation: "fadeUp 0.35s ease" }}>
      <div style={{ fontSize: 10, color: colors.gold, marginBottom: 8 }}>PARTY MODE</div>
      <div style={{ fontSize: 7, color: colors.muted, lineHeight: 1.8, marginBottom: 12 }}>
        Pick four unique cats. Floor = level. Skill unlocks persist after a wipe.
      </div>

      <div style={{ fontSize: 7, color: colors.dimmed, marginBottom: 14 }}>
        Party wallet 💰 {Number(partyWallet || 0).toLocaleString()} · Best floor {partyBestFloor ?? 0}
      </div>

      {slots.map((key, slotIndex) => (
        <div
          key={slotIndex}
          style={{
            width: "100%",
            maxWidth: 320,
            marginBottom: 10,
            padding: 10,
            border: `1px solid ${colors.surfaceBorder}`,
            borderRadius: 6,
            background: colors.surface,
          }}
        >
          <div style={{ fontSize: 7, color: colors.muted, marginBottom: 6 }}>
            Slot {slotIndex + 1}
            {key ? ` — ${PARTY_CLASS_NAMES[key]}` : " — empty"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PARTY_CLASS_KEYS.map((classKey) => {
              const selected = key === classKey;
              const takenElsewhere = used.has(classKey) && !selected;
              return (
                <button
                  key={classKey}
                  type="button"
                  disabled={takenElsewhere}
                  onClick={() => pickSlot(slotIndex, classKey)}
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 6,
                    padding: "8px 10px",
                    cursor: takenElsewhere ? "not-allowed" : "pointer",
                    opacity: takenElsewhere ? 0.35 : 1,
                    border: `1px solid ${selected ? colors.fightBorder : "#2a2a3a"}`,
                    background: selected ? `${colors.fight}22` : "#0a0a14",
                    color: selected ? colors.fight : colors.dimmed,
                  }}
                >
                  {PARTY_CLASS_NAMES[classKey]}
                </button>
              );
            })}
            {key && (
              <button
                type="button"
                onClick={() => clearSlot(slotIndex)}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 6,
                  padding: "8px 10px",
                  cursor: "pointer",
                  border: "1px solid #3a2a2a",
                  background: "#140a0a",
                  color: "#aa6666",
                }}
              >
                Clear
              </button>
            )}
            {key && (
              <button
                type="button"
                onClick={() => setInfoKey(infoKey === key ? null : key)}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 6,
                  padding: "8px 10px",
                  cursor: "pointer",
                  border: `1px solid ${colors.gold}`,
                  color: colors.gold,
                  background: "transparent",
                }}
              >
                Stats
              </button>
            )}
          </div>
        </div>
      ))}

      {infoKey && (
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
          marginTop: 8,
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
