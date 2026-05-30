import { useEffect, useState } from "react";
import { t } from "../i18n/index.js";
import {
  getAudioSettingsSnapshot,
  setMasterVolume,
  setMusicVolume,
  setSfxVolume,
  setMuteAll,
  SILENCE_THRESHOLD,
} from "../audio/audioSettings.js";
import { playSfx } from "../audio/sfx.js";

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.78)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  padding: 16,
};

function pct(value) {
  return `${Math.round(clamp01(value) * 100)}%`;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function VolumeSlider({ label, value, onChange, onRelease }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 7,
          color: "#aaa",
          marginBottom: 6,
        }}
      >
        <span>{label}</span>
        <span style={{ color: "#FFD700" }}>{pct(value)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(clamp01(value) * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        onPointerUp={onRelease}
        onTouchEnd={onRelease}
        style={{ width: "100%", accentColor: "#c8a96e" }}
      />
    </label>
  );
}

export default function SettingsPanel({ open, onClose, colors }) {
  const [volumes, setVolumes] = useState(() => getAudioSettingsSnapshot());

  useEffect(() => {
    if (open) setVolumes(getAudioSettingsSnapshot());
  }, [open]);

  if (!open) return null;

  const gold = colors?.gold ?? "#FFD700";
  const fight = colors?.fight ?? "#c8a96e";
  const muted = colors?.muted ?? "#555";

  const masterMuted = volumes.master <= SILENCE_THRESHOLD;

  return (
    <div
      style={overlay}
      role="dialog"
      aria-modal="true"
      aria-label={t("settings.title")}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0c0c18",
          border: `1px solid ${fight}`,
          borderRadius: 8,
          padding: 20,
          maxWidth: 340,
          width: "100%",
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        <div style={{ fontSize: 9, color: gold, marginBottom: 16, textAlign: "center" }}>
          {t("settings.title")}
        </div>

        <VolumeSlider
          label={t("settings.master")}
          value={volumes.master}
          onChange={(v) => {
            setMasterVolume(v);
            setVolumes(getAudioSettingsSnapshot());
          }}
        />
        <VolumeSlider
          label={t("settings.music")}
          value={volumes.music}
          onChange={(v) => {
            setMusicVolume(v);
            setVolumes(getAudioSettingsSnapshot());
          }}
        />
        <VolumeSlider
          label={t("settings.sfx")}
          value={volumes.sfx}
          onChange={(v) => {
            setSfxVolume(v);
            setVolumes(getAudioSettingsSnapshot());
          }}
          onRelease={() => playSfx("ui_click")}
        />

        <button
          type="button"
          onClick={() => {
            setMuteAll(!masterMuted);
            setVolumes(getAudioSettingsSnapshot());
          }}
          style={{
            width: "100%",
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 7,
            padding: "10px 8px",
            marginBottom: 12,
            cursor: "pointer",
            border: `1px solid ${masterMuted ? fight : muted}`,
            background: masterMuted ? `${fight}22` : "transparent",
            color: masterMuted ? fight : muted,
          }}
        >
          {masterMuted ? t("settings.unmuteAll") : t("settings.muteAll")}
        </button>

        <button
          type="button"
          onClick={() => {
            playSfx("ui_cancel");
            onClose();
          }}
          style={{
            width: "100%",
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 8,
            padding: "12px 8px",
            cursor: "pointer",
            border: `2px solid ${fight}`,
            background: `${fight}22`,
            color: fight,
          }}
        >
          {t("settings.close")}
        </button>
      </div>
    </div>
  );
}

export function SettingsGearButton({ onClick, colors, size = 8 }) {
  const fight = colors?.fight ?? "#c8a96e";
  const fightBorder = colors?.fightBorder ?? "#6a5a30";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("settings.open")}
      style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: size,
        padding: "8px 10px",
        borderRadius: 5,
        cursor: "pointer",
        border: `2px solid ${fightBorder}`,
        background: `${fight}18`,
        color: fight,
        flexShrink: 0,
      }}
    >
      ⚙
    </button>
  );
}
