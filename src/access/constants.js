/** Demo vs full-game boundary and the itch.io full-game link. */

export const DEMO_MAX_FLOOR = 100;

/**
 * Where the demo's "get the full game" button points. Set
 * VITE_ITCH_FULL_URL to the live itch listing once it exists.
 */
export const ITCH_FULL_URL =
  import.meta.env.VITE_ITCH_FULL_URL || "https://njmventures.itch.io";
