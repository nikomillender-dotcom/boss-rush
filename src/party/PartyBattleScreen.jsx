import { partyActOrderIndices } from "../combat/turnSystem.js";

/**
 * Minimal party battle UI: enemy panel, log, four cats, fight/defend/run.
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
  onFight,
  onDefend,
  onRetreat,
  onBackToTitle,
}) {
  const activeMember =
    activeCatIndex != null && members[activeCatIndex] ? members[activeCatIndex] : null;
  const queueLabel =
    turnPhase === "enemy"
      ? "Enemy turn"
      : catQueue?.length
        ? `Cat ${catQueue[0] + 1} acts next`
        : "Round end";

  return (
    <div style={{ ...screenShell, animation: "fadeUp 0.25s ease" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 7,
          color: colors.muted,
          marginBottom: 8,
        }}
      >
        <span>Floor {floor} (party level)</span>
        <span>Run 💰 {runCoins}</span>
      </div>

      {enemy && (
        <div
          style={{
            width: "100%",
            maxWidth: 360,
            padding: 12,
            marginBottom: 10,
            border: `1px solid ${colors.arenaBorder}`,
            borderRadius: 6,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 20 }}>{enemy.icon}</div>
          <div style={{ fontSize: 8, color: colors.gold }}>{enemy.name}</div>
          <div style={{ fontSize: 7, color: colors.muted, marginTop: 4 }}>
            HP {enemy.hp}/{enemy.maxHp} · ATK {enemy.attack} · {enemy.partyTier ?? enemy.tier}
          </div>
        </div>
      )}

      <div
        style={{
          width: "100%",
          maxWidth: 360,
          minHeight: 72,
          maxHeight: 120,
          overflowY: "auto",
          fontSize: 6,
          color: colors.dimmed,
          lineHeight: 1.7,
          marginBottom: 10,
          padding: 8,
          border: `1px solid ${colors.surfaceBorder}`,
          borderRadius: 4,
        }}
      >
        {(log ?? []).slice(-8).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      <div style={{ fontSize: 6, color: colors.muted, marginBottom: 8 }}>{queueLabel}</div>

      <div
        style={{
          width: "100%",
          maxWidth: 360,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {members.map((m, idx) => {
          const isActive = idx === activeCatIndex && turnPhase === "cats";
          const down = m.hp <= 0 || m.ko;
          return (
            <div
              key={`${m.classKey}-${idx}`}
              style={{
                padding: 8,
                border: `2px solid ${isActive ? colors.gold : colors.surfaceBorder}`,
                borderRadius: 4,
                opacity: down ? 0.45 : 1,
                background: colors.surface,
              }}
            >
              <div style={{ fontSize: 7, color: isActive ? colors.gold : colors.fight }}>
                {m.classKey}
                {down ? " KO" : ""}
              </div>
              <div style={{ fontSize: 6, color: colors.muted }}>
                HP {m.hp}/{m.maxHp} SPD {m.speed}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 6, color: colors.muted, marginBottom: 8 }}>
        Speed order:{" "}
        {partyActOrderIndices(members)
          .map((i) => members[i]?.classKey)
          .join(" → ")}
      </div>

      {turnPhase === "cats" && activeMember && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            type="button"
            onClick={onFight}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 8,
              padding: "12px 18px",
              cursor: "pointer",
              border: `2px solid ${colors.fightBorder}`,
              background: `${colors.fight}22`,
              color: colors.fight,
            }}
          >
            Fight ({activeMember.classKey})
          </button>
          <button
            type="button"
            onClick={onDefend}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 8,
              padding: "12px 18px",
              cursor: "pointer",
              border: "1px solid #2a3a4a",
              color: colors.dimmed,
              background: "transparent",
            }}
          >
            Defend
          </button>
        </div>
      )}

      {turnPhase === "enemy" && (
        <div style={{ fontSize: 7, color: colors.gold }}>Resolving enemy…</div>
      )}

      <button
        type="button"
        onClick={onRetreat}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 7,
          padding: "10px 16px",
          marginTop: 14,
          cursor: "pointer",
          border: "1px solid #4a3a2a",
          color: "#ccaa66",
          background: "transparent",
        }}
      >
        Retreat (lose 50% run coins)
      </button>

      <button
        type="button"
        onClick={onBackToTitle}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 6,
          padding: "8px 12px",
          marginTop: 8,
          cursor: "pointer",
          border: "none",
          color: colors.muted,
          background: "transparent",
        }}
      >
        Title
      </button>
    </div>
  );
}
