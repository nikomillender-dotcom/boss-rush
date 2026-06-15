import { createClient } from "@supabase/supabase-js";
import { json, readJsonBody } from "./_lib/http.js";
import { checkRateLimit } from "./_lib/ratelimit.js";

const MAX_SAVE_BYTES = 64 * 1024;
const ALLOWED_SAVE_KEYS = new Set([
  "wallet",
  "locale",
  "classes",
  "records",
  "unlocks",
  "_saveChecksum",
  "cloudUpdatedAt",
]);
const MAX_WALLET = 1e9;

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

function isPlainObject(v) {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

/**
 * Strip unknown keys, validate field shapes, clamp numerics. The save blob is
 * a client-authored backup of single-player progress (the checksum is a
 * tamper deterrent, not security) — this guards against malformed blobs that
 * would crash the game when loaded back, not against cheating. The server
 * stamps cloudUpdatedAt so clients cannot forge future timestamps.
 */
function sanitizeSave(input) {
  if (!isPlainObject(input)) return null;
  const clean = {};
  for (const [k, v] of Object.entries(input)) {
    if (!ALLOWED_SAVE_KEYS.has(k)) continue;
    clean[k] = v;
  }
  if (typeof clean.wallet !== "undefined") {
    const w = Number(clean.wallet);
    if (!Number.isFinite(w) || w < 0) return null;
    clean.wallet = Math.min(Math.floor(w), MAX_WALLET);
  }
  if (typeof clean.locale !== "undefined") {
    if (clean.locale !== "en" && clean.locale !== "es") delete clean.locale;
  }
  for (const key of ["classes", "records", "unlocks"]) {
    if (typeof clean[key] !== "undefined" && !isPlainObject(clean[key])) {
      delete clean[key];
    }
  }
  // Per-class wallets (v1.0.7): clamp each class's coins to sane bounds.
  if (isPlainObject(clean.classes)) {
    const classes = {};
    for (const [classKey, meta] of Object.entries(clean.classes)) {
      if (!isPlainObject(meta)) continue;
      const next = { ...meta };
      if (typeof next.wallet !== "undefined") {
        const w = Number(next.wallet);
        next.wallet = Number.isFinite(w) && w >= 0 ? Math.min(Math.floor(w), MAX_WALLET) : 0;
      }
      if (typeof next.megaBossKills !== "undefined") {
        const k = Number(next.megaBossKills);
        next.megaBossKills = Number.isFinite(k) && k >= 0 ? Math.floor(k) : 0;
      }
      classes[classKey] = next;
    }
    clean.classes = classes;
  }
  if (clean.records) {
    const records = { ...clean.records };
    for (const key of ["coins", "rounds", "streak"]) {
      if (typeof records[key] === "undefined") continue;
      const n = Number(records[key]);
      records[key] = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    }
    clean.records = records;
  }
  if (typeof clean._saveChecksum !== "undefined") {
    if (
      typeof clean._saveChecksum !== "string" ||
      !/^[0-9a-f]{1,16}$/.test(clean._saveChecksum)
    ) {
      delete clean._saveChecksum;
    }
  }
  clean.cloudUpdatedAt = Date.now();
  return clean;
}

export default async function handler(req, res) {
  const rl = await checkRateLimit("syncSave", req);
  if (!rl.ok) return json(res, 429, { error: "rate_limited" });

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
    body = await readJsonBody(req, MAX_SAVE_BYTES + 1024);
  } catch (err) {
    if (err?.code === "PAYLOAD_TOO_LARGE") {
      return json(res, 413, { error: "save_too_large" });
    }
    return json(res, 400, { error: "invalid_json" });
  }

  const rawSize = JSON.stringify(body?.save_data ?? {}).length;
  if (rawSize > MAX_SAVE_BYTES) {
    return json(res, 413, { error: "save_too_large" });
  }

  const saveData = sanitizeSave(body?.save_data);
  if (!saveData) return json(res, 400, { error: "invalid_save" });

  await supabase.from("profiles").upsert({
    id: userId,
    save_data: saveData,
    updated_at: new Date().toISOString(),
  });

  return json(res, 200, { ok: true });
}
