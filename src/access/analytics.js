/**
 * Lightweight game events (optional server log).
 */

export function trackEvent(name, props = {}) {
  if (typeof window === "undefined") return;
  try {
    fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        name,
        props,
        ts: Date.now(),
        path: window.location.pathname,
      }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export const ANALYTICS = {
  DEMO_FLOOR_100: "demo_floor_100_reached",
  PURCHASE_CLICK: "purchase_click",
  LICENSE_SUCCESS: "license_unlock",
  CHECKOUT_START: "stripe_checkout_start",
};
