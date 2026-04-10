/**
 * Delad Avatar-komponent.
 *
 * avatarUrl-format:
 *   - null / ''           → initialer på lila gradient (default)
 *   - HTTP(S)-URL         → foto
 *   - JSON { bg, fg, font?, emoji? } → anpassad avatar
 *   - legacy ensam emoji  → emoji med lila bakgrund
 */

export function parseConfig(avatarUrl) {
  if (!avatarUrl) return null;
  const trimmed = avatarUrl.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const obj = JSON.parse(trimmed);
    // Normalisera: behandla tom emoji-sträng som "ingen emoji"
    if (obj.emoji === '') obj.emoji = null;
    return obj;
  } catch (err) {
    console.warn('[Avatar] JSON-parsning misslyckades:', trimmed, err);
    return null;
  }
}

export default function Avatar({ avatarUrl, name, size = 48, style = {} }) {
  // Alltid en säker strängfallback för name
  const safeName = (typeof name === 'string' && name.trim()) ? name.trim() : '';

  const initials = safeName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join('') || '?';

  console.log('[Avatar] avatarUrl:', avatarUrl, '| initials:', initials);

  const base = {
    width:          size,
    height:         size,
    borderRadius:   '50%',
    flexShrink:     0,
    overflow:       'hidden',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    ...style,
  };

  // ── 1. Foto (HTTP-URL) ────────────────────────────────────────────────────
  if (avatarUrl && avatarUrl.startsWith('http')) {
    return (
      <div style={{ ...base, background: '#e5e7eb' }}>
        <img
          src={avatarUrl}
          alt={safeName}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  // ── 2. JSON-konfigurerad avatar ───────────────────────────────────────────
  const config = parseConfig(avatarUrl);
  if (config) {
    const bg   = config.bg   || '#7c3aed';
    const fg   = config.fg   || '#ffffff';
    const font = config.font || 'inherit';

    return (
      <div style={{ ...base, background: bg }}>
        {config.emoji ? (
          <span style={{ fontSize: size * 0.52, lineHeight: 1 }}>{config.emoji}</span>
        ) : (
          <span style={{ color: fg, fontSize: size * 0.36, fontWeight: 700, lineHeight: 1, fontFamily: font }}>
            {initials}
          </span>
        )}
      </div>
    );
  }

  // ── 3. Legacy: ensam emoji-sträng (inte URL, inte JSON) ───────────────────
  if (avatarUrl && avatarUrl.trim().length > 0) {
    return (
      <div style={{ ...base, background: '#f3f0ff' }}>
        <span style={{ fontSize: size * 0.52, lineHeight: 1 }}>{avatarUrl.trim()}</span>
      </div>
    );
  }

  // ── 4. Default: initialer på lila gradient ────────────────────────────────
  return (
    <div style={{ ...base, background: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }}>
      <span style={{ color: '#fff', fontSize: size * 0.36, fontWeight: 700, lineHeight: 1 }}>
        {initials}
      </span>
    </div>
  );
}
