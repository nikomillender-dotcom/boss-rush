import { PARTY_CLASS_NAMES } from "../content/classDefinitions.js";
import { partyActOrderIndices } from "../combat/turnSystem.js";

/**
 * Party battle: enemy top, log middle, party bottom, compact skill boxes.
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
  readySkills,
  pendingSkill,
  onFight,
  onDefend,
  onSkill,
  onPickAlly,
  onCancelTarget,
  onRetreat,
  onBackToTitle,
}) {
  const activeMember =
    activeCatIndex != null && members[activeCatIndex] ? members[activeCatIndex] : null;
  const queueLabel =
    turnPhase === "enemy"
      ? "Enemy turn"
      : pendingSkill
        ? "Pick ally target"
        : catQueue?.length
          ? `${PARTY_CLASS_NAMES[activeMember?.classKey] ?? "Cat"} acts`
          : "Round end";

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
          fontSize: 7,
          color: colors.muted,
          marginBottom: 8,
        }}
      >
        <span>Floor {floor}</span>
        <span>Run 💰 {runCoins}</span>
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

      <div style={{ fontSize: 6, color: colors.muted, marginBottom: 6 }}>{queueLabel}</div>

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
          const isActive = idx === activeCatIndex && turnPhase === "cats" && !pendingSkill;
          const pickTarget = Boolean(pendingSkill);
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

      {turnPhase === "cats" && activeMember && !pendingSkill && (
        <section style={{ width: "100%", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            <ActionBtn colors={colors} label="FIGHT" onClick={onFight} primary />
            <ActionBtn colors={colors} label="DEF" onClick={onDefend} />
            {(readySkills ?? []).map((sk) => (
              <ActionBtn
                key={sk.id}
                colors={colors}
                label={sk.abbr}
                title={`${sk.name} (CD ${sk.cooldown})`}
                onClick={() => onSkill(sk.id)}
              />
            ))}
          </div>
        </section>
      )}

      {pendingSkill && (
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
          }}
        >
          Cancel targeting
        </button>
      )}

      {turnPhase === "enemy" && (
        <div style={{ fontSize: 7, color: colors.gold, marginBottom: 8 }}>Enemy acts…</div>
      )}

      <footer style={{ width: "100%", textAlign: "center" }}>
        <button type="button" onClick={onRetreat} style={retreatStyle}>
          Retreat
        </button>
        <button type="button" onClick={onBackToTitle} style={titleStyle}>
          Title
        </button>
      </footer>
    </div>
  );
}

function ActionBtn({ colors, label, onClick, primary, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 7,
        padding: "10px 12px",
        minWidth: 44,
        cursor: "pointer",
        border: `2px solid ${primary ? colors.fightBorder : colors.surfaceBorder}`,
        background: primary ? `${colors.fight}22` : colors.surface,
        color: primary ? colors.fight : colors.dimmed,
      }}
    >
      {label}
    </button>
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
