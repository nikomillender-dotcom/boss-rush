/**
 * Party Mode speed-based turn ordering.
 * Normal cats act before the enemy; "slow" cats (from slow debuff) act after the enemy.
 */

/** @typedef {{ classKey: string, speed: number, hp?: number, ko?: boolean }} PartyMemberLike */

/**
 * Alive members sorted by speed (desc). KO members are excluded.
 * @param {PartyMemberLike[]} party
 */
export function sortPartyBySpeed(party) {
  const alive = (party ?? []).filter((m) => (m.hp ?? 0) > 0 && !m.ko);
  return [...alive].sort((a, b) => (b.speed ?? 0) - (a.speed ?? 0));
}

/**
 * Indices of alive members in speed order for the pre-enemy phase.
 * @param {PartyMemberLike[]} party
 */
export function partyActOrderIndices(party) {
  const sorted = sortPartyBySpeed(party);
  return sorted.map((m) => party.indexOf(m)).filter((i) => i >= 0);
}

/**
 * Members that should act after the enemy this round (slow debuff).
 * @param {PartyMemberLike[]} party
 * @param {string[]} slowClassKeys
 */
export function sortSlowPartyMembers(party, slowClassKeys = []) {
  const slowSet = new Set(slowClassKeys);
  const alive = (party ?? []).filter(
    (m) => (m.hp ?? 0) > 0 && !m.ko && slowSet.has(m.classKey)
  );
  return [...alive].sort((a, b) => (b.speed ?? 0) - (a.speed ?? 0));
}

export function slowActOrderIndices(party, slowClassKeys = []) {
  const sorted = sortSlowPartyMembers(party, slowClassKeys);
  return sorted.map((m) => party.indexOf(m)).filter((i) => i >= 0);
}
