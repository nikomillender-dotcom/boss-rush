import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import BossRush from "../BossRush.jsx";
import InstallBanner from "./InstallBanner.jsx";
import { assertAllowedHost } from "./access/domainLock.js";
import "./mobile.css";

const allowedHost = assertAllowedHost();

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
});

if ("serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

if (allowedHost) {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <BossRush />
      <InstallBanner />
    </StrictMode>
  );
}
