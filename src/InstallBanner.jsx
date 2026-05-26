import { useEffect, useState } from "react";
import { t } from "./i18n/index.js";

const DISMISS_ANDROID = "bossRush_installDismiss_android";
const DISMISS_IOS = "bossRush_installDismiss_ios";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return ios && safari;
}

export default function InstallBanner() {
  const [iosHint, setIosHint] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;

    if (isIosSafari() && !localStorage.getItem(DISMISS_IOS)) {
      setIosHint(true);
      setDismissed(false);
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      if (localStorage.getItem(DISMISS_ANDROID)) return;
      setDeferredPrompt(e);
      setDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    if (deferredPrompt) localStorage.setItem(DISMISS_ANDROID, "1");
    if (iosHint) localStorage.setItem(DISMISS_IOS, "1");
    setDismissed(true);
    setDeferredPrompt(null);
    setIosHint(false);
  };

  const installAndroid = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setDismissed(true);
  };

  if (dismissed || isStandalone()) return null;

  const message = iosHint ? t("install.iosHint") : t("install.androidMessage");

  return (
    <div
      style={{
        position: "fixed",
        left: "max(8px, env(safe-area-inset-left))",
        right: "max(8px, env(safe-area-inset-right))",
        bottom: "max(8px, env(safe-area-inset-bottom))",
        zIndex: 9999,
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: "10px 12px",
        background: "rgba(20, 24, 40, 0.96)",
        border: "1px solid #3a5080",
        borderRadius: 8,
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 7,
        color: "#c8d0e8",
        lineHeight: 1.8,
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      {deferredPrompt && (
        <button
          type="button"
          onClick={installAndroid}
          style={{
            fontFamily: "inherit",
            fontSize: 7,
            padding: "8px 10px",
            border: "1px solid #4a6a9a",
            borderRadius: 4,
            background: "#1a2840",
            color: "#8af",
            cursor: "pointer",
          }}
        >
          {t("install.button")}
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("install.dismissAria")}
        style={{
          fontFamily: "inherit",
          fontSize: 10,
          padding: "4px 8px",
          border: "none",
          background: "transparent",
          color: "#666",
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </div>
  );
}
