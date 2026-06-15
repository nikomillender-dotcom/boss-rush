import { t } from "../i18n/index.js";
import { ITCH_FULL_URL } from "../access/constants.js";
import { trackEvent, ANALYTICS } from "../access/analytics.js";

const COLORS = {
  gold: "#FFD700",
  fight: "#00ff99",
  fightBorder: "#00cc77",
  muted: "#666",
  text: "#e0e0f0",
  bg: "#0a0a14",
};

const screenShell = {
  minHeight: "100dvh",
  background: COLORS.bg,
  color: COLORS.text,
  fontFamily: "'Press Start 2P', monospace",
  padding: "24px 16px",
  boxSizing: "border-box",
};

export default function PaywallScreen({
  floorReached,
  wallet,
  onReturnCamp,
  accessMode,
}) {
  const buyUrl = ITCH_FULL_URL;

  return (
    <div
      style={{
        ...screenShell,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        textAlign: "center",
        maxWidth: 420,
        margin: "0 auto",
      }}
    >
      <div style={{ fontSize: 40 }}>🏆</div>
      <div style={{ fontSize: 11, color: COLORS.gold, lineHeight: 1.8 }}>
        {t("paywall.heading")}
      </div>
      <div style={{ fontSize: 8, color: COLORS.muted, lineHeight: 2.2, maxWidth: 340 }}>
        {t("paywall.body", { floor: floorReached })}
      </div>
      <div style={{ fontSize: 7, color: "#888" }}>
        {t("paywall.wallet")} 💰 {wallet.toLocaleString()}
      </div>

      <a
        href={buyUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent(ANALYTICS.PURCHASE_CLICK, { source: "paywall" })}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 10,
          padding: "14px 28px",
          borderRadius: 5,
          cursor: "pointer",
          border: `2px solid ${COLORS.fightBorder}`,
          background: `${COLORS.fight}22`,
          color: COLORS.fight,
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        {t("paywall.buy")}
      </a>

      <button
        type="button"
        onClick={onReturnCamp}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 7,
          padding: "8px 16px",
          cursor: "pointer",
          border: "none",
          background: "transparent",
          color: COLORS.muted,
        }}
      >
        {t("paywall.backCamp")}
      </button>

      {accessMode === "demo" && (
        <div style={{ fontSize: 6, color: "#444", marginTop: 12, lineHeight: 2 }}>
          {t("paywall.demoNote")}
        </div>
      )}
    </div>
  );
}
