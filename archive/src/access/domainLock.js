import { ALLOWED_HOSTS } from "./constants.js";

/**
 * Blocks unknown hosts (clone sites). Call once before React mount.
 * @returns {boolean} true if this host may run the game
 */
export function assertAllowedHost() {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  const allowedByList = ALLOWED_HOSTS.includes(host);
  const allowedVercelPreview = host.endsWith(".vercel.app");
  if (allowedByList || allowedVercelPreview) return true;
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<div style="font-family:monospace;padding:2rem;color:#f88;max-width:420px;margin:auto;text-align:center">
      <p>Boss Rush is not licensed for this domain.</p>
      <p style="color:#888;font-size:12px;margin-top:1rem">Play at <a href="https://boss-rush-six.vercel.app">boss-rush-six.vercel.app</a></p>
    </div>`;
  }
  return false;
}
