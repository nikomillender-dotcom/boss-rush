import { json, readJsonBody } from "./_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  try {
    const body = await readJsonBody(req);
    if (process.env.NODE_ENV !== "production") {
      console.log("[event]", body.name, body.props || {});
    }
  } catch {
    /* ignore */
  }

  return json(res, 204, {});
}
