/**
 * Access mode is fixed at build time: the demo build is capped at
 * DEMO_MAX_FLOOR, the full build is unlocked. itch.io gates the full build
 * behind purchase, so there is no runtime license check, account, or server
 * flag anymore.
 *
 * @returns {'demo' | 'full'}
 */
export function getAccessMode() {
  return import.meta.env.VITE_BUILD_TARGET === "demo" ? "demo" : "full";
}
