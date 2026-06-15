import { useState } from "react";
import { t } from "../i18n/index.js";
import { isSupabaseConfigured } from "../access/supabaseClient.js";
import { STRIPE_ENABLED } from "../access/constants.js";

export default function AuthPanel({
  userEmail,
  onSignIn,
  onSignUp,
  onSignOut,
  onBuyStripe,
  busy,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");

  if (!isSupabaseConfigured()) return null;

  if (userEmail) {
    return (
      <div style={{ fontSize: 7, color: "#666", lineHeight: 2.2, maxWidth: 320 }}>
        <div>{t("auth.signedIn", { email: userEmail })}</div>
        {STRIPE_ENABLED && (
          <button
            type="button"
            disabled={busy}
            onClick={onBuyStripe}
            style={linkButtonStyle}
          >
            {t("auth.buyStripe")}
          </button>
        )}
        <button type="button" onClick={onSignOut} style={mutedButtonStyle}>
          {t("auth.signOut")}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 320, width: "100%" }}>
      <div style={{ fontSize: 7, color: "#555", marginBottom: 8 }}>{t("auth.heading")}</div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("auth.email")}
        style={inputStyle}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t("auth.password")}
        style={{ ...inputStyle, marginTop: 6 }}
      />
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            mode === "login" ? onSignIn(email, password) : onSignUp(email, password)
          }
          style={linkButtonStyle}
        >
          {mode === "login" ? t("auth.login") : t("auth.signup")}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          style={mutedButtonStyle}
        >
          {mode === "login" ? t("auth.needAccount") : t("auth.haveAccount")}
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "monospace",
  fontSize: 11,
  padding: 8,
  background: "#080810",
  border: "1px solid #2a2a3a",
  color: "#ccc",
};

const linkButtonStyle = {
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 7,
  padding: "8px 12px",
  cursor: "pointer",
  border: "1px solid #3a5080",
  background: "#10102a",
  color: "#88aaff",
};

const mutedButtonStyle = {
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 7,
  padding: "8px 12px",
  cursor: "pointer",
  border: "1px solid #2a2a3a",
  background: "transparent",
  color: "#666",
};
