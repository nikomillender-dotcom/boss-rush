import { getSupabase, isSupabaseConfigured } from "./supabaseClient.js";
import { trackEvent, ANALYTICS } from "./analytics.js";

/**
 * Start Stripe Checkout (Phase 2). Requires signed-in Supabase user.
 */
export async function startStripeCheckout() {
  if (!isSupabaseConfigured()) {
    throw new Error("not_configured");
  }
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("not_signed_in");

  trackEvent(ANALYTICS.CHECKOUT_START);

  const res = await fetch("/api/create-checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || "checkout_failed");
  window.location.href = data.url;
}

/** Check Supabase profile purchased flag. */
export async function refreshSupabaseAccess() {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return false;

  const res = await fetch("/api/check-access", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) return false;
  const data = await res.json().catch(() => ({}));
  return Boolean(data.purchased);
}
