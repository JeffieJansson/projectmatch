// Local, per-device notification state (seen matches, chat read markers).
// Changes dispatch a window event so useNotifications can refresh badges immediately.

const SEEN_MATCHES_KEY = 'seen_match_ids';
export const NOTIFICATIONS_CHANGED = 'notifications:changed';

function notify() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
}

/** Returns a Set of seen match ids, or null if nothing has ever been stored. */
export function getSeenMatchIds() {
  try {
    const raw = localStorage.getItem(SEEN_MATCHES_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markMatchesSeen(ids) {
  const seen = getSeenMatchIds() || new Set();
  ids.forEach((id) => seen.add(id));
  try {
    localStorage.setItem(SEEN_MATCHES_KEY, JSON.stringify([...seen]));
  } catch {
    // storage unavailable – badge just won't persist
  }
  notify();
}

export function markChatRead(matchId) {
  try {
    localStorage.setItem(`chat_last_read_${matchId}`, new Date().toISOString());
  } catch {
    // ignore
  }
  notify();
}

/** Removes all locally stored notification state (used when the account is deleted). */
export function clearNotificationStore() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === SEEN_MATCHES_KEY || key?.startsWith('chat_last_read_')) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // storage unavailable – nothing to clear
  }
  // No notify() here: useNotifications would treat the missing key as a first
  // run and write seen_match_ids again. The caller navigates away instead.
}

export function getChatLastRead(matchId) {
  try {
    return localStorage.getItem(`chat_last_read_${matchId}`) || '1970-01-01T00:00:00.000Z';
  } catch {
    return '1970-01-01T00:00:00.000Z';
  }
}
