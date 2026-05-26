import { storeLicenseToken } from "./accessMode.js";

/**
 * Validate a Lemon Squeezy license key via Vercel API.
 * @param {string} licenseKey
 * @returns {Promise<{ ok: boolean, token?: string, error?: string }>}
 */
export async function validateLicenseKey(licenseKey) {
  const key = String(licenseKey || "").trim();
  if (!key) return { ok: false, error: "empty" };

  const res = await fetch("/api/validate-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ license_key: key }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error || "invalid" };
  }
  if (data.token) storeLicenseToken(data.token);
  return { ok: true, token: data.token };
}

/** Re-verify stored JWT with server (once per session). */
export async function refreshLicenseToken() {
  const token =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("bossRush_license_token")
      : null;
  if (!token) return false;

  const res = await fetch("/api/check-license", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) return false;
  const data = await res.json().catch(() => ({}));
  return Boolean(data.licensed);
}
