export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export class PayloadTooLargeError extends Error {
  constructor() {
    super("payload_too_large");
    this.code = "PAYLOAD_TOO_LARGE";
  }
}

export async function readJsonBody(req, maxBytes = Infinity) {
  if (req.body && typeof req.body === "object") return req.body;
  const raw = (await readRawBody(req, maxBytes)).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

export async function readRawBody(req, maxBytes = Infinity) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    total += buf.length;
    if (total > maxBytes) throw new PayloadTooLargeError();
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}
