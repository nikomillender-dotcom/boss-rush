import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";
import { json } from "./_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return json(res, 405, { error: "method_not_allowed" });
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return json(res, 503, { error: "not_configured" });

  const auth = req.headers.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!bearer) return json(res, 401, { error: "unauthorized" });

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser(bearer);
  if (userErr || !userData?.user) return json(res, 401, { error: "unauthorized" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("purchased")
    .eq("id", userData.user.id)
    .maybeSingle();

  let purchased = Boolean(profile?.purchased);

  const secret = process.env.JWT_SECRET;
  if (!purchased && secret) {
    const licenseHeader = req.headers["x-license-token"];
    if (licenseHeader) {
      try {
        const key = new TextEncoder().encode(secret);
        const { payload } = await jwtVerify(String(licenseHeader), key);
        if (payload.licensed) purchased = true;
      } catch {
        /* ignore */
      }
    }
  }

  return json(res, 200, { purchased, userId: userData.user.id });
}
