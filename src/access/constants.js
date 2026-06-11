/** Demo vs full-game boundary and storage keys. */

export const DEMO_MAX_FLOOR = 100;

export const LICENSE_TOKEN_KEY = "bossRush_license_token";
export const SUPABASE_SESSION_KEY = "bossRush_supabase_session";

/** Hostnames allowed to run the game (domain lock). */
export const ALLOWED_HOSTS = [
  "boss-rush-six.vercel.app",
  "localhost",
  "127.0.0.1",
  "bossrush.gg",
  "",
];

export const PAYHIP_CHECKOUT_URL =
  import.meta.env.VITE_PAYHIP_CHECKOUT_URL ||
  "https://payhip.com/NJMVentures";

export const STRIPE_ENABLED = Boolean(import.meta.env.VITE_STRIPE_ENABLED);

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
