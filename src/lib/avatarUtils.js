export function parseConfig(avatarUrl) {
  if (!avatarUrl) return null;
  const trimmed = avatarUrl.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const obj = JSON.parse(trimmed);
    if (obj.emoji === '') obj.emoji = null;
    return obj;
  } catch (err) {
    console.warn('[Avatar] JSON-parsning misslyckades:', trimmed, err);
    return null;
  }
}
