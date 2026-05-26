import { SignJWT } from "jose";
import { json, readJsonBody } from "./_lib/http.js";
import { checkRateLimit, isAllowedOrigin } from "./_lib/ratelimit.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });
  if (!isAllowedOrigin(req)) return json(res, 403, { error: "forbidden_origin" });

  const rl = await checkRateLimit("validateKey", req);
  if (!rl.ok) return json(res, 429, { error: "rate_limited" });

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const secret = process.env.JWT_SECRET;
  if (!apiKey || !secret) {
    return json(res, 503, { error: "not_configured" });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(res, 400, { error: "invalid_json" });
  }

  const licenseKey = String(body.license_key || "").trim();
  if (!licenseKey || licenseKey.length > 200) {
    return json(res, 400, { error: "missing_key" });
  }

  const storeId = process.env.LEMON_STORE_ID;
  const lsRes = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      license_key: licenseKey,
      ...(storeId ? { store_id: Number(storeId) } : {}),
    }),
  });

  const lsData = await lsRes.json().catch(() => ({}));
  const valid = lsData?.valid ?? lsData?.meta?.valid ?? false;
  if (!lsRes.ok || !valid) {
    return json(res, 401, { error: "invalid_key" });
  }

  const key = new TextEncoder().encode(secret);
  const token = await new SignJWT({ licensed: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(key);

  return json(res, 200, { token, licensed: true });
}
