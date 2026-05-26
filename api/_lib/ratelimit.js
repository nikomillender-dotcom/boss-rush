import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let redisClient = null;
let cachedLimiters = null;

function getRedis() {
  if (redisClient) return redisClient;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redisClient = new Redis({ url, token });
  return redisClient;
}

function buildLimiters(redis) {
  return {
    validateKey: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "10 m"),
      prefix: "rl:validate-key",
      analytics: false,
    }),
    event: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "rl:event",
      analytics: false,
    }),
    syncSave: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      prefix: "rl:sync-save",
      analytics: false,
    }),
    checkout: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10 m"),
      prefix: "rl:checkout",
      analytics: false,
    }),
    checkAccess: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "rl:check-access",
      analytics: false,
    }),
    checkLicense: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "rl:check-license",
      analytics: false,
    }),
  };
}

function getLimiters() {
  if (cachedLimiters) return cachedLimiters;
  const redis = getRedis();
  if (!redis) return null;
  cachedLimiters = buildLimiters(redis);
  return cachedLimiters;
}

export function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  const first = Array.isArray(fwd) ? fwd[0] : String(fwd || "").split(",")[0];
  return first.trim() || req.socket?.remoteAddress || "anon";
}

/**
 * Apply rate limit for a given bucket. Fail-open if Upstash is not configured
 * (lets local dev work without env vars). In production, set KV_REST_API_URL
 * and KV_REST_API_TOKEN via the Vercel Marketplace Upstash integration.
 *
 * @param {keyof ReturnType<typeof buildLimiters>} bucket
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<{ ok: true } | { ok: false, reset: number }>}
 */
export async function checkRateLimit(bucket, req) {
  const limiters = getLimiters();
  if (!limiters || !limiters[bucket]) return { ok: true };
  const ip = getClientIp(req);
  const { success, reset } = await limiters[bucket].limit(ip);
  if (success) return { ok: true };
  return { ok: false, reset };
}

const ALLOWED_API_HOSTS = new Set([
  "boss-rush-six.vercel.app",
  "bossrush.gg",
  "localhost",
  "127.0.0.1",
]);

/**
 * Soft origin allow-list for public (unauthenticated) endpoints.
 * Same-origin browser fetches send no Origin header; we accept those.
 * Cross-site fetches from unknown origins are rejected.
 */
export function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname;
    if (ALLOWED_API_HOSTS.has(host)) return true;
    if (host.endsWith(".vercel.app")) return true;
    return false;
  } catch {
    return false;
  }
}
