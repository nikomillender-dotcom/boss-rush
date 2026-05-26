import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { json, readRawBody } from "./_lib/http.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey || !webhookSecret || !url || !serviceKey) {
    return json(res, 503, { error: "not_configured" });
  }

  const stripe = new Stripe(stripeKey);
  const sig = req.headers["stripe-signature"];
  const rawBody = await readRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature", err.message);
    return json(res, 400, { error: "invalid_signature" });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId || session.client_reference_id;
    if (userId) {
      const supabase = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await supabase.from("profiles").upsert({
        id: userId,
        purchased: true,
        updated_at: new Date().toISOString(),
      });
    }
  }

  return json(res, 200, { received: true });
}
