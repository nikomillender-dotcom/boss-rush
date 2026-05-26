import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { json } from "./_lib/http.js";
import { checkRateLimit } from "./_lib/ratelimit.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const rl = await checkRateLimit("checkout", req);
  if (!rl.ok) return json(res, 429, { error: "rate_limited" });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  const siteUrl = process.env.PUBLIC_SITE_URL || "https://boss-rush-six.vercel.app";
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey || !priceId || !url || !serviceKey) {
    return json(res, 503, { error: "not_configured" });
  }

  const auth = req.headers.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!bearer) return json(res, 401, { error: "unauthorized" });

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser(bearer);
  if (userErr || !userData?.user) return json(res, 401, { error: "unauthorized" });

  const stripe = new Stripe(stripeKey);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/?checkout=cancel`,
    client_reference_id: userData.user.id,
    metadata: { userId: userData.user.id },
    customer_email: userData.user.email || undefined,
  });

  return json(res, 200, { url: session.url, sessionId: session.id });
}
