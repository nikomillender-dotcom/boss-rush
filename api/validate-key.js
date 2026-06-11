import { SignJWT } from "jose";
import { json, readJsonBody } from "./_lib/http.js";
import { checkRateLimit, isAllowedOrigin } from "./_lib/ratelimit.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });
  if (!isAllowedOrigin(req)) return json(res, 403, { error: "forbidden_origin" });

  const rl = await checkRateLimit("validateKey", req);
  if (!rl.ok) return json(res, 429, { error: "rate_limited" });

  const apiKey = process.env.PAYHIP_API_KEY;
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

  // Verify against Payhip's License API. product_link scopes the check to the
  // specific product (the payhip.com/b/SLUG permalink); recommended but optional.
  const productLink = process.env.PAYHIP_PRODUCT_LINK;
  const params = new URLSearchParams({ license_key: licenseKey });
  if (productLink) params.set("product_link", productLink);
  const phRes = await fetch(
    `https://payhip.com/api/v1/license/verify?${params.toString()}`,
    {
      method: "GET",
      headers: { "payhip-api-key": apiKey },
    }
  );

  const phData = await phRes.json().catch(() => ({}));
  const valid = phData?.data?.enabled === true;
  if (!phRes.ok || !valid) {
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
