import { useState } from "react";
import { t } from "../i18n/index.js";

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.75)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  padding: 16,
};

export default function LicenseKeyModal({ open, onClose, onSubmit, busy, error }) {
  const [key, setKey] = useState("");

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await onSubmit(key);
    if (ok) {
      setKey("");
      onClose();
    }
  };

  return (
    <div style={overlay} role="dialog" aria-modal="true">
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#0c0c18",
          border: "1px solid #2a2a4a",
          borderRadius: 8,
          padding: 20,
          maxWidth: 360,
          width: "100%",
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        <div style={{ fontSize: 9, color: "#FFD700", marginBottom: 12 }}>
          {t("license.title")}
        </div>
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={t("license.placeholder")}
          autoComplete="off"
          style={{
            width: "100%",
            boxSizing: "border-box",
            fontFamily: "monospace",
            fontSize: 12,
            padding: 10,
            marginBottom: 10,
            background: "#080810",
            border: "1px solid #333",
            color: "#eee",
          }}
        />
        {error && (
          <div style={{ fontSize: 7, color: "#f66", marginBottom: 10, lineHeight: 1.8 }}>
            {t("license.error")}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={busy || !key.trim()}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 8,
              padding: "10px 14px",
              cursor: busy ? "wait" : "pointer",
              border: "1px solid #00cc77",
              background: "#00ff9922",
              color: "#00ff99",
            }}
          >
            {busy ? "…" : t("license.submit")}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 8,
              padding: "10px 14px",
              cursor: "pointer",
              border: "1px solid #333",
              background: "#101020",
              color: "#888",
            }}
          >
            {t("license.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
