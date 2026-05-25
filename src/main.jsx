import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import BossRush from "../BossRush.jsx";
import InstallBanner from "./InstallBanner.jsx";
import "./mobile.css";

registerSW({ immediate: true });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BossRush />
    <InstallBanner />
  </StrictMode>
);
