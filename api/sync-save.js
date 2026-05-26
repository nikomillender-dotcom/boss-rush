import { createClient } from "@supabase/supabase-js";
import { json, readJsonBody } from "./_lib/http.js";

async function getUser(req) {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { error: "not_configured" };

  const auth = req.headers.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!bearer) return { error: "unauthorized" };

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(bearer);
  if (error || !data?.user) return { error: "unauthorized" };
  return { supabase, userId: data.user.id };
}

export default async function handler(req, res) {
  const ctx = await getUser(req);
  if (ctx.error) {
    const code = ctx.error === "not_configured" ? 503 : 401;
    return json(res, code, { error: ctx.error });
  }

  const { supabase, userId } = ctx;

  if (req.method === "GET") {
    const { data } = await supabase
      .from("profiles")
      .select("save_data, purchased")
      .eq("id", userId)
      .maybeSingle();
    return json(res, 200, {
      save_data: data?.save_data ?? null,
      purchased: Boolean(data?.purchased),
    });
  }

  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("purchased")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.purchased) return json(res, 403, { error: "not_purchased" });

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(res, 400, { error: "invalid_json" });
  }

  const saveData = {
    ...body.save_data,
    cloudUpdatedAt: Date.now(),
  };

  await supabase.from("profiles").upsert({
    id: userId,
    save_data: saveData,
    updated_at: new Date().toISOString(),
  });

  return json(res, 200, { ok: true });
}
