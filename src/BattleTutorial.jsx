import { t } from "./i18n/index.js";

export const BATTLE_TUTORIAL_SEEN_KEY = "bossRush_battleTutorialSeen";

export function hasSeenBattleTutorial() {
  try {
    return localStorage.getItem(BATTLE_TUTORIAL_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markBattleTutorialSeen() {
  try {
    localStorage.setItem(BATTLE_TUTORIAL_SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

const COLORS = {
  skill: "#7e9cd8",
  muted: "#888",
  text: "#e0e0e0",
  fight: "#55cc55",
};

export default function BattleTutorialOverlay({ open, onDismiss, classKey }) {
  if (!open) return null;

  const showMageTip = classKey === "mage";
  const showLowDefTip =
    classKey === "rogue" || classKey === "arcanist" || classKey === "mage_knight";

  return (
    <div
      style={{
        position: "fixed",
        left: "max(8px, env(safe-area-inset-left))",
        right: "max(8px, env(safe-area-inset-right))",
        bottom: "max(72px, calc(48px + env(safe-area-inset-bottom)))",
        zIndex: 9000,
        maxHeight: "min(52vh, 340px)",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        background: "rgba(12, 14, 28, 0.97)",
        border: "1px solid rgba(126,156,216,0.45)",
        borderRadius: 8,
        padding: 14,
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 7,
        color: COLORS.text,
        lineHeight: 2.2,
        boxShadow: "0 6px 24px rgba(0,0,0,0.55)",
      }}
    >
      <div style={{ color: COLORS.skill, fontSize: 9, marginBottom: 10 }}>{t("tutorial.title")}</div>
      <p style={{ margin: "0 0 8px" }}>{t("tutorial.turnOrder")}</p>
      <p style={{ margin: "0 0 8px" }}>{t("tutorial.fight")}</p>
      <p style={{ margin: "0 0 8px" }}>{t("tutorial.skills")}</p>
      <p style={{ margin: "0 0 8px", color: COLORS.fight }}>{t("tutorial.defend")}</p>
      <p style={{ margin: "0 0 8px" }}>{t("tutorial.auto")}</p>
      <p style={{ margin: "0 0 8px" }}>{t("tutorial.run")}</p>
      {showMageTip && (
        <p style={{ margin: "0 0 8px", color: "#c8a96e" }}>{t("tutorial.tipMage")}</p>
      )}
      {!showMageTip && showLowDefTip && (
        <p style={{ margin: "0 0 8px", color: "#c8a96e" }}>{t("tutorial.tipLowDef")}</p>
      )}
      <button
        type="button"
        onClick={onDismiss}
        style={{
          marginTop: 8,
          width: "100%",
          fontFamily: "inherit",
          fontSize: 8,
          padding: "12px 8px",
          cursor: "pointer",
          border: "2px solid #4a6a9a",
          borderRadius: 5,
          background: "#1a2840",
          color: COLORS.skill,
        }}
      >
        {t("tutorial.gotIt")}
      </button>
    </div>
  );
}
