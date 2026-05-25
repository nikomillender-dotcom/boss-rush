import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import BossRush from "../BossRush.jsx";
import InstallBanner from "./InstallBanner.jsx";
import "./mobile.css";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (typeof window !== "undefined" && window.confirm("Boss Rush updated. Reload now?")) {
      updateSW(true);
    }
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BossRush />
    <InstallBanner />
  </StrictMode>
);
