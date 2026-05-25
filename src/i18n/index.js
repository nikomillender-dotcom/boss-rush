import en from "./en.json";
import es from "./es.json";

const catalogs = { en, es };

let locale = "en";

export function getLocale() {
  return locale;
}

export function setLocale(next) {
  if (catalogs[next]) locale = next;
}

export function t(key, params = {}) {
  let str = catalogs[locale]?.[key] ?? catalogs.en[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    str = str.replaceAll(`{${k}}`, String(v));
  }
  return str;
}
