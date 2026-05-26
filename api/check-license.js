import { jwtVerify } from "jose";
import { json, readJsonBody } from "./_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const secret = process.env.JWT_SECRET;
  if (!secret) return json(res, 503, { error: "not_configured" });

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(res, 400, { error: "invalid_json" });
  }

  const token = String(body.token || "").trim();
  if (!token) return json(res, 400, { error: "missing_token" });

  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    if (!payload.licensed) return json(res, 401, { licensed: false });
    return json(res, 200, { licensed: true });
  } catch {
    return json(res, 401, { licensed: false });
  }
}
