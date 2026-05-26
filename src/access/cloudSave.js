import { getSupabase, isSupabaseConfigured } from "./supabaseClient.js";
import { getAccessMode } from "./accessMode.js";

let syncTimer = null;

/**
 * @param {object} save Meta save blob
 */
export async function syncProgressToCloud(save) {
  if (!isSupabaseConfigured() || getAccessMode() !== "full") return;
  const supabase = getSupabase();
  if (!supabase) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  await fetch("/api/sync-save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ save_data: save }),
  });
}

export function scheduleCloudSync(save) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncProgressToCloud(save).catch(() => {});
  }, 2000);
}

/**
 * @param {object} localSave
 * @returns {Promise<{ useCloud: boolean, save?: object } | null>}
 */
export async function fetchCloudSaveIfNewer(localSave) {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  const res = await fetch("/api/sync-save", {
    method: "GET",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const cloud = data.save_data;
  if (!cloud || typeof cloud !== "object") return null;

  const localTs = Number(localSave?.cloudUpdatedAt) || 0;
  const cloudTs = Number(cloud.cloudUpdatedAt) || 0;
  if (cloudTs > localTs) return { useCloud: true, save: cloud };
  return { useCloud: false };
}
