import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import BossRush from "../BossRush.jsx";
import "./mobile.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BossRush />
  </StrictMode>
);
