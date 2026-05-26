import { decodeJwt } from "jose";
import { LICENSE_TOKEN_KEY } from "./constants.js";

let serverPurchased = false;
let serverChecked = false;

export function setServerPurchased(value) {
  serverPurchased = Boolean(value);
  serverChecked = true;
}

export function hasServerPurchaseFlag() {
  return serverChecked && serverPurchased;
}

export function isLicenseTokenValid(token) {
  if (!token) return false;
  try {
    const payload = decodeJwt(token);
    if (!payload?.licensed) return false;
    if (payload.exp && payload.exp * 1000 <= Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * @returns {'demo' | 'full'}
 */
export function getAccessMode() {
  if (serverPurchased) return "full";
  const token =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(LICENSE_TOKEN_KEY)
      : null;
  if (isLicenseTokenValid(token)) return "full";
  return "demo";
}

export function clearLicenseToken() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(LICENSE_TOKEN_KEY);
  }
}

export function storeLicenseToken(token) {
  if (typeof localStorage !== "undefined" && token) {
    localStorage.setItem(LICENSE_TOKEN_KEY, token);
  }
  serverPurchased = false;
  serverChecked = false;
}
