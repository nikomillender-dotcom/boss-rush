import { json, readJsonBody } from "./_lib/http.js";
import { checkRateLimit, isAllowedOrigin } from "./_lib/ratelimit.js";

const ALLOWED_EVENTS = new Set([
  "demo_floor_100_reached",
  "purchase_click",
  "license_unlock",
  "stripe_checkout_start",
]);

const MAX_EVENT_BYTES = 4 * 1024;

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });
  if (!isAllowedOrigin(req)) return json(res, 403, { error: "forbidden_origin" });

  const rl = await checkRateLimit("event", req);
  if (!rl.ok) return json(res, 429, { error: "rate_limited" });

  try {
    const body = await readJsonBody(req);
    const raw = JSON.stringify(body);
    if (raw.length > MAX_EVENT_BYTES) {
      return json(res, 413, { error: "payload_too_large" });
    }
    const name = String(body?.name || "");
    if (!ALLOWED_EVENTS.has(name)) {
      return json(res, 400, { error: "unknown_event" });
    }
    if (process.env.NODE_ENV !== "production") {
      console.log("[event]", name, body.props || {});
    }
  } catch {
    return json(res, 400, { error: "invalid_json" });
  }

  return json(res, 204, {});
}
