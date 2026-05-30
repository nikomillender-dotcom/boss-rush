import { useState } from "react";
import { PARTY_CLASS_NAMES } from "../content/classDefinitions.js";
import { t } from "../i18n/index.js";
import PartyCommandDock from "./PartyCommandDock.jsx";
import { SettingsGearButton } from "../components/SettingsPanel.jsx";

/**
 * Party battle: enemy top, log middle, party bottom, active-cat command dock.
 */
export default function PartyBattleScreen({
  colors,
  screenShell,
  floor,
  runCoins,
  enemy,
  members,
  log,
  catQueue,
  activeCatIndex,
  turnPhase,
  allSkills = [],
  pendingSkillId,
  pendingSkillName,
  onFight,
  onDefend,
  onSkill,
  onPickAlly,
  onCancelTarget,
  onRetreat,
  onBackToTitle,
  onOpenSettings,
}) {
  const [highlightedSkill, setHighlightedSkill] = useState(null);

  const activeMember =
    activeCatIndex != null && members[activeCatIndex] ? members[activeCatIndex] : null;
  const classDisplayName = PARTY_CLASS_NAMES[activeMember?.classKey] ?? "Cat";

  let queueLabel =
    turnPhase === "enemy"
      ? t("party.battle.enemyTurn")
      : pendingSkillId
        ? t("party.battle.pickAlly", { skill: pendingSkillName ?? "Skill" })
        : catQueue?.length
          ? t("party.battle.catActs", { name: classDisplayName })
          : t("party.battle.roundEnd");

  if (highlightedSkill && !pendingSkillId && turnPhase === "cats") {
    const cdText = highlightedSkill.ready
      ? t("party.battle.ready")
      : `CD:${highlightedSkill.cooldownLeft}`;
    queueLabel = `${highlightedSkill.name} · ${cdText}`;
  }

  const hpPct = enemy ? Math.round((enemy.hp / enemy.maxHp) * 100) : 0;

  return (
    <div
      style={{
        ...screenShell,
        animation: "fadeUp 0.25s ease",
        paddingBottom: 12,
        maxWidth: 400,
      }}
    >
      <header
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 7,
          color: colors.muted,
          marginBottom: 8,
        }}
      >
        <span>Floor {floor}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>Run 💰 {runCoins}</span>
          {onOpenSettings ? (
            <SettingsGearButton onClick={onOpenSettings} colors={colors} size={7} />
          ) : null}
        </span>
      </header>

      {enemy && (
        <section
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 8,
            border: `1px solid ${colors.arenaBorder}`,
            borderRadius: 6,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22 }}>{enemy.icon}</div>
          <div style={{ fontSize: 8, color: colors.gold }}>{enemy.name}</div>
          <div
            style={{
              height: 6,
              marginTop: 8,
              background: "#1a1a28",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${hpPct}%`,
                height: "100%",
                background: colors.fight,
                transition: "width 0.2s",
              }}
            />
          </div>
          <div style={{ fontSize: 6, color: colors.muted, marginTop: 4 }}>
            {enemy.hp}/{enemy.maxHp} · {enemy.partyTier ?? enemy.tier}
            {enemy.blindActionsLeft > 0 ? ` · blind ${enemy.blindActionsLeft}` : ""}
          </div>
        </section>
      )}

      <section
        style={{
          width: "100%",
          flex: 1,
          minHeight: 80,
          maxHeight: 110,
          overflowY: "auto",
          fontSize: 6,
          color: colors.dimmed,
          lineHeight: 1.7,
          marginBottom: 8,
          padding: 8,
          border: `1px solid ${colors.surfaceBorder}`,
          borderRadius: 4,
        }}
      >
        {(log ?? []).slice(-10).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </section>

      <div style={{ fontSize: 6, color: colors.muted, marginBottom: 6, textAlign: "center" }}>
        {queueLabel}
      </div>

      {pendingSkillId && (
        <div
          style={{
            fontSize: 7,
            color: colors.gold,
            textAlign: "center",
            marginBottom: 8,
            padding: "6px 8px",
            border: `1px solid ${colors.gold}`,
            borderRadius: 4,
          }}
        >
          {t("party.battle.pickAllyBanner", { skill: pendingSkillName ?? "Skill" })}
        </div>
      )}

      <section
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          marginBottom: 10,
        }}
      >
        {members.map((m, idx) => {
          const isActive = idx === activeCatIndex && turnPhase === "cats" && !pendingSkillId;
          const pickTarget = Boolean(pendingSkillId);
          const down = m.hp <= 0 || m.ko;
          return (
            <button
              key={`${m.classKey}-${idx}`}
              type="button"
              disabled={!pickTarget || down}
              onClick={() => pickTarget && onPickAlly(idx)}
              style={{
                padding: 8,
                textAlign: "left",
                border: `2px solid ${
                  pickTarget && !down
                    ? colors.gold
                    : isActive
                      ? colors.gold
                      : colors.surfaceBorder
                }`,
                borderRadius: 4,
                opacity: down ? 0.4 : 1,
                background: colors.surface,
                cursor: pickTarget && !down ? "pointer" : "default",
              }}
            >
              <div style={{ fontSize: 7, color: isActive ? colors.gold : colors.fight }}>
                {PARTY_CLASS_NAMES[m.classKey] ?? m.classKey}
                {down ? " KO" : ""}
              </div>
              <div style={{ fontSize: 6, color: colors.muted }}>
                {m.hp}/{m.maxHp}
              </div>
            </button>
          );
        })}
      </section>

      {turnPhase === "cats" && activeMember && !pendingSkillId && (
        <PartyCommandDock
          colors={colors}
          classDisplayName={classDisplayName}
          skills={allSkills}
          onFight={onFight}
          onDefend={onDefend}
          onSkill={onSkill}
          highlightedSkillId={highlightedSkill?.id}
          onHighlightSkill={setHighlightedSkill}
        />
      )}

      {pendingSkillId && (
        <button
          type="button"
          onClick={onCancelTarget}
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 6,
            marginBottom: 8,
            color: colors.muted,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            width: "100%",
          }}
        >
          {t("party.battle.cancelTarget")}
        </button>
      )}

      {turnPhase === "enemy" && (
        <div style={{ fontSize: 7, color: colors.gold, marginBottom: 8, textAlign: "center" }}>
          {t("party.battle.enemyActs")}
        </div>
      )}

      <footer style={{ width: "100%", textAlign: "center" }}>
        <button type="button" onClick={onRetreat} style={retreatStyle}>
          {t("party.battle.retreat")}
        </button>
        <button type="button" onClick={onBackToTitle} style={titleStyle}>
          {t("party.battle.title")}
        </button>
      </footer>
    </div>
  );
}

const retreatStyle = {
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 7,
  padding: "10px 16px",
  marginTop: 8,
  cursor: "pointer",
  border: "1px solid #4a3a2a",
  color: "#ccaa66",
  background: "transparent",
};

const titleStyle = {
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 6,
  padding: "8px 12px",
  marginTop: 6,
  cursor: "pointer",
  border: "none",
  color: "#666",
  background: "transparent",
};
