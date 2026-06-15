/**
 * Game events are a no-op on the static itch build (no backend). itch's own
 * dashboard covers top-level funnel stats. Kept as a stub so existing call
 * sites compile unchanged; can be re-wired to a privacy-friendly, cookieless
 * analytics provider later.
 */

export function trackEvent() {}

export const ANALYTICS = {
  DEMO_FLOOR_100: "demo_floor_100_reached",
  PURCHASE_CLICK: "purchase_click",
};
