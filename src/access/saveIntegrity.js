/**
 * Lightweight save tamper detection (deterrent, not security).
 * Checksums wallet + aggregate records + account best floor.
 */

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function accountBestFloor(save) {
  if (!save?.classes) return 0;
  let best = 0;
  for (const meta of Object.values(save.classes)) {
    best = Math.max(best, Number(meta?.bestFloorReached) || 0);
  }
  return best;
}

export function computeSaveChecksum(save) {
  const payload = {
    wallet: Number(save?.wallet) || 0,
    rounds: Number(save?.records?.rounds) || 0,
    coins: Number(save?.records?.coins) || 0,
    bestFloor: accountBestFloor(save),
    purchased: Boolean(save?.purchased),
  };
  return fnv1a(JSON.stringify(payload));
}

export function attachSaveChecksum(save) {
  const checksum = computeSaveChecksum(save);
  return { ...save, _saveChecksum: checksum };
}

export function verifySaveIntegrity(save) {
  if (!save || typeof save !== "object") return { ok: false, save: null };
  const expected = save._saveChecksum;
  if (!expected) return { ok: true, save };
  const actual = computeSaveChecksum(save);
  if (actual === expected) return { ok: true, save };
  if (import.meta.env.DEV) {
    console.warn("[save] checksum mismatch — resetting wallet/records");
  }
  const reset = {
    ...save,
    wallet: 0,
    records: { coins: 0, streak: 0, rounds: 0 },
    _saveChecksum: computeSaveChecksum({
      ...save,
      wallet: 0,
      records: { coins: 0, streak: 0, rounds: 0 },
    }),
  };
  return { ok: false, save: reset };
}
