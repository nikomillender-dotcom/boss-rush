import { useState } from "react";
import { t } from "../i18n/index.js";

/**
 * Active-cat command dock: Fight / Defend / Skills + scrollable skill list.
 */
export default function PartyCommandDock({
  colors,
  classDisplayName,
  skills = [],
  onFight,
  onDefend,
  onSkill,
  highlightedSkillId = null,
  onHighlightSkill,
}) {
  const [skillsOpen, setSkillsOpen] = useState(false);

  const dockBtn = (label, onClick, primary) => ({
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 7,
    padding: "10px 14px",
    cursor: "pointer",
    border: `2px solid ${primary ? colors.fightBorder : colors.gold}`,
    background: primary ? `${colors.fight}22` : colors.surface,
    color: primary ? colors.fight : colors.gold,
  });

  return (
    <section style={{ width: "100%", marginBottom: 10 }}>
      {!skillsOpen ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button type="button" onClick={onFight} style={dockBtn(t("party.battle.fight"), onFight, true)}>
            {t("party.battle.fight")}
          </button>
          <button type="button" onClick={onDefend} style={dockBtn(t("party.battle.defend"), onDefend, false)}>
            {t("party.battle.defend")}
          </button>
          <button
            type="button"
            onClick={() => setSkillsOpen(true)}
            style={dockBtn(t("party.battle.skills"), () => setSkillsOpen(true), false)}
          >
            {t("party.battle.skills")}
          </button>
        </div>
      ) : (
        <div
          style={{
            background: "#12100a",
            border: `1px solid ${colors.gold}`,
            borderRadius: 6,
            padding: 10,
            maxHeight: "min(38vh, 240px)",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 7, color: colors.gold, fontFamily: "'Press Start 2P', monospace" }}>
              {classDisplayName} · {t("party.battle.skillsHeader")}
            </span>
            <button
              type="button"
              onClick={() => setSkillsOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: colors.muted,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              ✕
            </button>
          </div>
          {skills.map((skill) => {
            const onCd = !skill.ready;
            return (
              <button
                key={skill.id}
                type="button"
                disabled={onCd}
                onMouseEnter={() => onHighlightSkill?.(skill)}
                onMouseLeave={() => onHighlightSkill?.(null)}
                onFocus={() => onHighlightSkill?.(skill)}
                onBlur={() => onHighlightSkill?.(null)}
                onClick={() => {
                  if (!onCd) {
                    setSkillsOpen(false);
                    onSkill(skill.id);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 10px",
                  marginBottom: 6,
                  borderRadius: 4,
                  cursor: onCd ? "not-allowed" : "pointer",
                  border: `1px solid ${onCd ? colors.surfaceBorder : colors.gold}`,
                  background: onCd ? colors.surface : "#1a1608",
                  color: onCd ? colors.muted : colors.text,
                  fontFamily: "'Press Start 2P', monospace",
                  textAlign: "left",
                  opacity: onCd ? 0.45 : 1,
                  outline:
                    highlightedSkillId === skill.id ? `1px solid ${colors.gold}` : "none",
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{skill.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 7, color: onCd ? colors.muted : colors.gold }}>{skill.name}</div>
                  {skill.description ? (
                    <div style={{ fontSize: 6, color: colors.dimmed, marginTop: 2 }}>{skill.description}</div>
                  ) : null}
                </div>
                <span style={{ fontSize: 6, color: onCd ? colors.fight : colors.gold, flexShrink: 0 }}>
                  {onCd ? `CD:${skill.cooldownLeft}` : t("party.battle.ready")}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
