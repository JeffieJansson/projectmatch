import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Avatar, { parseConfig } from '../components/Avatar';

// 'view' | 'edit' | 'preview'
const MODES = { VIEW: 'view', EDIT: 'edit', PREVIEW: 'preview' };

const ROLES = [
  'Frontend', 'Backend', 'Fullstack', 'UI/UX Design', 'Grafisk design',
  'Marknadsföring', 'Growth', 'iOS/Android', 'Data/AI', 'Copywriting',
];

const TOOLS = [
  'React', 'Node.js', 'TypeScript', 'Vue', 'Next.js', 'Supabase',
  'PostgreSQL', 'Docker', 'Figma', 'Tailwind', 'Python', 'Swift',
  'Kotlin', 'AWS', 'Firebase',
];

const EMOJIS = [
  '🦊','🐼','🦁','🐸','🦄','🐙','🦋','🐺','🦅','🐬',
  '🧙‍♂️','🧜‍♀️','🧛','👾','🤖','🎃','🦸‍♀️','🧟‍♂️','🧝‍♀️','🥷',
  '🐯','🦩','🦚','🐉','🧞','🦾','🕵️','🧑‍🚀','🎯','🔮',
];

const ROLE_COLORS = [
  { bg: '#ede9fe', color: '#6d28d9' },
  { bg: '#fce7f3', color: '#9d174d' },
  { bg: '#d1fae5', color: '#065f46' },
  { bg: '#dbeafe', color: '#1e40af' },
  { bg: '#fef3c7', color: '#92400e' },
  { bg: '#fee2e2', color: '#991b1b' },
  { bg: '#e0f2fe', color: '#0369a1' },
  { bg: '#f3e8ff', color: '#7e22ce' },
  { bg: '#dcfce7', color: '#166534' },
  { bg: '#fdf4ff', color: '#86198f' },
];

function roleColor(index) {
  return ROLE_COLORS[index % ROLE_COLORS.length];
}

export default function Profile() {
  const navigate = useNavigate();
  const [mode, setMode]   = useState(MODES.VIEW);
  const [saved, setSaved] = useState(null);
  const [userId, setUserId]   = useState(null);
  const [loading, setLoading] = useState(true);

  const [draft, setDraft] = useState({
    fullName: '', gender: '', tagline: '', bio: '',
    roles: [], tools: [], github: '', portfolio: '',
    avatarUrl: '',
  });

  const [saving, setSaving]     = useState(false);
  const [saveErr, setSaveErr]   = useState('');
  const [justSaved, setJustSaved] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user.id);

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const profile = {
        fullName:  data?.full_name     || '',
        gender:    data?.gender        || '',
        tagline:   data?.tagline       || '',
        bio:       data?.bio           || '',
        roles:     data?.roles         || [],
        tools:     data?.tools         || [],
        github:    data?.github_url    || '',
        portfolio: data?.portfolio_url || '',
        avatarUrl: data?.avatar_url    || '',
      };
      setSaved(profile);
      setDraft(profile);
      setLoading(false);
    }
    load();
  }, []);

  function enterEdit() {
    setDraft(saved);
    setSaveErr('');
    setMode(MODES.EDIT);
  }

  async function handleSave() {
    setSaveErr('');
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:     draft.fullName.trim(),
        gender:        draft.gender        || null,
        tagline:       draft.tagline.trim()   || null,
        bio:           draft.bio.trim()       || null,
        roles:         draft.roles,
        tools:         draft.tools,
        github_url:    draft.github.trim()    || null,
        portfolio_url: draft.portfolio.trim() || null,
        avatar_url:    draft.avatarUrl        || null,
      })
      .eq('id', userId);

    if (error) {
      setSaveErr(error.message);
      setSaving(false);
      return;
    }

    setSaved(draft);
    setSaving(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
    setMode(MODES.VIEW);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ color: '#9ca3af', fontSize: 15 }}>Laddar profil...</span>
      </div>
    );
  }

  if (mode === MODES.VIEW || mode === MODES.PREVIEW) {
    const data = mode === MODES.PREVIEW ? draft : saved;
    return (
      <ProfileView
        data={data}
        mode={mode}
        justSaved={justSaved}
        onEdit={enterEdit}
        onBackToEdit={() => setMode(MODES.EDIT)}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <ProfileEdit
      draft={draft}
      userId={userId}
      onChange={setDraft}
      saving={saving}
      error={saveErr}
      onPreview={() => setMode(MODES.PREVIEW)}
      onSave={handleSave}
      onCancel={() => setMode(MODES.VIEW)}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VIEW / PREVIEW
// ═══════════════════════════════════════════════════════════════════════════
function ProfileView({ data, mode, justSaved, onEdit, onBackToEdit, onLogout }) {
  const isPreview = mode === MODES.PREVIEW;

  return (
    <div style={v.page}>
      {isPreview && (
        <div style={v.previewBanner}>
          <span style={v.previewLabel}>Förhandsgranskning</span>
          <button style={v.previewBack} onClick={onBackToEdit}>← Tillbaka till redigering</button>
        </div>
      )}

      <div style={v.card}>
        {/* Avatar-banner */}
        <div style={v.avatarWrap}>
          <AvatarBanner avatarUrl={data.avatarUrl} name={data.fullName} />
          <div style={v.avatarGradient} />
          <div style={v.avatarName}>
            <h1 style={v.name}>{data.fullName || 'Ditt namn'}</h1>
            {data.tagline && <p style={v.taglineOnAvatar}>{data.tagline}</p>}
          </div>
        </div>

        <div style={v.body}>
          {justSaved && !isPreview && (
            <div style={v.toast}>✓ Profilen sparad!</div>
          )}

          {data.bio && (
            <Section title="Om mig">
              <p style={v.bio}>{data.bio}</p>
            </Section>
          )}

          {data.roles.length > 0 && (
            <Section title="Roller">
              <div style={v.chipRow}>
                {data.roles.map((role, i) => {
                  const c = roleColor(i);
                  return <span key={role} style={{ ...v.chip, background: c.bg, color: c.color }}>{role}</span>;
                })}
              </div>
            </Section>
          )}

          {data.tools.length > 0 && (
            <Section title="Verktyg & ramverk">
              <div style={v.chipRow}>
                {data.tools.map((tool) => (
                  <span key={tool} style={v.toolChip}>{tool}</span>
                ))}
              </div>
            </Section>
          )}

          {(data.github || data.portfolio) && (
            <Section title="Länkar">
              <div style={v.links}>
                {data.github && (
                  <a href={data.github} target="_blank" rel="noopener noreferrer" style={v.link}>
                    <span style={v.linkIcon}>⌥</span> GitHub
                  </a>
                )}
                {data.portfolio && (
                  <a href={data.portfolio} target="_blank" rel="noopener noreferrer" style={v.link}>
                    <span style={v.linkIcon}>✦</span> Portfolio
                  </a>
                )}
              </div>
            </Section>
          )}

          {!data.bio && data.roles.length === 0 && data.tools.length === 0 && (
            <p style={v.empty}>Fyll i din profil så syns du för projektskapare.</p>
          )}
        </div>
      </div>

      {!isPreview && (
        <div style={v.actions}>
          <button style={v.editBtn} onClick={onEdit}>Redigera profil</button>
          <button style={v.logoutBtn} onClick={onLogout}>Logga ut</button>
        </div>
      )}
    </div>
  );
}

// ── Avatar i bannern (stor, 110px) ────────────────────────────────────────
// Delegerar all logik till Avatar-komponenten som hanterar foto/JSON/emoji/initialer
function AvatarBanner({ avatarUrl, name }) {
  return (
    <Avatar
      avatarUrl={avatarUrl}
      name={name}
      size={110}
      style={{
        border: '3px solid rgba(255,255,255,0.5)',
        marginBottom: 48,
        backdropFilter: 'blur(8px)',
      }}
    />
  );
}

function Section({ title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </span>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EDIT
// ═══════════════════════════════════════════════════════════════════════════
const FONTS = [
  { value: 'inherit',    label: 'Sans' },
  { value: 'serif',      label: 'Serif' },
  { value: 'monospace',  label: 'Mono' },
];

function initPickerState(avatarUrl) {
  const config = parseConfig(avatarUrl);
  if (config) {
    return { emoji: config.emoji || '', bg: config.bg || '#7c3aed', fg: config.fg || '#ffffff', font: config.font || 'inherit' };
  }
  // Legacy emoji string
  if (avatarUrl && !avatarUrl.startsWith('http')) {
    return { emoji: avatarUrl, bg: '#7c3aed', fg: '#ffffff', font: 'inherit' };
  }
  return { emoji: '', bg: '#7c3aed', fg: '#ffffff', font: 'inherit' };
}

function buildAvatarUrl(p) {
  return JSON.stringify({
    ...(p.emoji ? { emoji: p.emoji } : {}),
    bg: p.bg,
    fg: p.fg,
    ...(p.font && p.font !== 'inherit' ? { font: p.font } : {}),
  });
}

function ProfileEdit({ draft, userId, onChange, saving, error, onPreview, onSave, onCancel }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab]   = useState('emoji'); // 'emoji' | 'upload'
  const [uploading, setUploading]   = useState(false);
  const [uploadErr, setUploadErr]   = useState('');
  const [picker, setPicker]         = useState(() => initPickerState(draft.avatarUrl));
  const fileInputRef = useRef(null);

  function set(key, value) {
    onChange((prev) => ({ ...prev, [key]: value }));
  }

  function toggleRole(role) {
    set('roles', draft.roles.includes(role) ? draft.roles.filter((r) => r !== role) : [...draft.roles, role]);
  }

  function toggleTool(tool) {
    set('tools', draft.tools.includes(tool) ? draft.tools.filter((t) => t !== tool) : [...draft.tools, tool]);
  }

  function openPicker() {
    setPicker(initPickerState(draft.avatarUrl));
    setPickerOpen(true);
  }

  function setPick(key, value) {
    setPicker((prev) => ({ ...prev, [key]: value }));
  }

  function confirmEmojiPicker() {
    set('avatarUrl', buildAvatarUrl(picker));
    setPickerOpen(false);
  }

  async function handleFileUpload(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    setUploadErr('');
    setUploading(true);
    const ext  = file.name.split('.').pop();
    const path = `${userId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      console.error('[Avatar upload]', upErr);
      setUploadErr(upErr.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    set('avatarUrl', `${urlData.publicUrl}?t=${Date.now()}`);
    setUploading(false);
    setPickerOpen(false);
  }

  // Live preview URL for picker
  const previewUrl = buildAvatarUrl(picker);

  return (
    <div style={e.page}>
      <div style={e.topBar}>
        <button style={e.cancelBtn} onClick={onCancel}>← Tillbaka</button>
        <h1 style={e.heading}>Redigera profil</h1>
      </div>

      <div style={e.form}>

        {/* Avatar-väljare */}
        <Field label="Profilbild">
          <div style={e.avatarRow}>
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <Avatar avatarUrl={draft.avatarUrl} name={draft.fullName} size={72} />
              {draft.avatarUrl && (
                <button style={e.removeAvatar} onClick={() => set('avatarUrl', '')} title="Ta bort">×</button>
              )}
            </div>
            <button style={e.changeAvatarBtn} onClick={openPicker}>Välj avatar</button>
          </div>
        </Field>

        {/* Picker-modal */}
        {pickerOpen && (
          <div style={e.modalOverlay} onClick={() => setPickerOpen(false)}>
            <div style={e.modal} onClick={(ev) => ev.stopPropagation()}>
              <div style={e.modalHeader}>
                <span style={e.modalTitle}>Välj profilbild</span>
                <button style={e.modalClose} onClick={() => setPickerOpen(false)}>×</button>
              </div>

              {/* Tabs */}
              <div style={e.pickerTabs}>
                {['emoji', 'upload'].map((tab) => (
                  <button
                    key={tab}
                    style={{ ...e.pickerTab, ...(pickerTab === tab ? e.pickerTabActive : {}) }}
                    onClick={() => setPickerTab(tab)}
                  >
                    {tab === 'emoji' ? 'Emoji-avatar' : 'Ladda upp foto'}
                  </button>
                ))}
              </div>

              {pickerTab === 'emoji' ? (
                <div style={e.emojiPanel}>

                  {/* Live preview */}
                  <div style={e.previewRow}>
                    <Avatar avatarUrl={previewUrl} name={draft.fullName} size={80} />
                    <div style={e.previewControls}>

                      {/* Bakgrundsfärg */}
                      <div style={e.colorRow}>
                        <label style={e.colorLabel}>Bakgrund</label>
                        <div style={e.colorInputWrap}>
                          <input
                            type="color"
                            value={picker.bg}
                            onChange={(ev) => setPick('bg', ev.target.value)}
                            style={e.colorInput}
                          />
                          <span style={e.colorHex}>{picker.bg}</span>
                        </div>
                      </div>

                      {/* Textfärg — bara synlig när ingen emoji */}
                      {!picker.emoji && (
                        <div style={e.colorRow}>
                          <label style={e.colorLabel}>Textfärg</label>
                          <div style={e.colorInputWrap}>
                            <input
                              type="color"
                              value={picker.fg}
                              onChange={(ev) => setPick('fg', ev.target.value)}
                              style={e.colorInput}
                            />
                            <span style={e.colorHex}>{picker.fg}</span>
                          </div>
                        </div>
                      )}

                      {/* Font — bara synlig när ingen emoji */}
                      {!picker.emoji && (
                        <div style={e.colorRow}>
                          <label style={e.colorLabel}>Typsnitt</label>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {FONTS.map((f) => (
                              <button
                                key={f.value}
                                style={{
                                  ...e.fontBtn,
                                  fontFamily: f.value,
                                  ...(picker.font === f.value ? e.fontBtnActive : {}),
                                }}
                                onClick={() => setPick('font', f.value)}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Rensa emoji */}
                      {picker.emoji && (
                        <button style={e.clearEmojiBtn} onClick={() => setPick('emoji', '')}>
                          Använd initialer
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Emoji-grid */}
                  <div style={e.emojiGrid}>
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        style={{
                          ...e.emojiBtn,
                          background: picker.emoji === emoji ? '#ede9fe' : '#f9f9fb',
                          border: picker.emoji === emoji ? '2px solid #7c3aed' : '2px solid transparent',
                        }}
                        onClick={() => setPick('emoji', emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {/* Bekräfta */}
                  <div style={{ padding: '0 16px 16px' }}>
                    <button style={e.confirmBtn} onClick={confirmEmojiPicker}>
                      Använd denna avatar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={e.uploadArea}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <button
                    style={e.uploadBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Laddar upp...' : '📷 Välj bild från enhet'}
                  </button>
                  {uploadErr && <p style={e.uploadErr}>{uploadErr}</p>}
                  <p style={e.uploadHint}>JPG, PNG eller GIF. Max 5 MB.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Namn */}
        <Field label="Namn *">
          <input
            style={e.input}
            value={draft.fullName}
            onChange={(ev) => set('fullName', ev.target.value)}
            placeholder="Anna Svensson"
          />
        </Field>

        {/* Kön */}
        <Field label="Kön">
          <div style={e.radioGroup}>
            {[
              { value: 'man',      label: 'Man' },
              { value: 'kvinna',   label: 'Kvinna' },
              { value: 'ej_uppge', label: 'Vill ej uppge' },
            ].map(({ value, label }) => {
              const active = draft.gender === value;
              return (
                <label key={value} style={{ ...e.radioBtn, ...(active ? e.radioBtnActive : {}) }}>
                  <input type="radio" name="gender" value={value} checked={active} onChange={() => set('gender', value)} style={{ display: 'none' }} />
                  <span style={{ ...e.radioCircle, ...(active ? e.radioCircleActive : {}) }} />
                  {label}
                </label>
              );
            })}
          </div>
        </Field>

        {/* Tagline */}
        <Field label="Tagline">
          <input
            style={e.input}
            value={draft.tagline}
            onChange={(ev) => set('tagline', ev.target.value)}
            placeholder="T.ex. Fullstack-utvecklare som älskar SaaS"
            maxLength={100}
          />
          <CharCount value={draft.tagline} max={100} />
        </Field>

        {/* Bio */}
        <Field label="Bio">
          <textarea
            style={{ ...e.input, resize: 'vertical', lineHeight: 1.55 }}
            value={draft.bio}
            onChange={(ev) => set('bio', ev.target.value)}
            placeholder="Berätta om dig själv, dina intressen och vad du söker..."
            rows={4}
            maxLength={500}
          />
          <CharCount value={draft.bio} max={500} />
        </Field>

        {/* Roller */}
        <Field label="Mina roller">
          <div style={e.chipGrid}>
            {ROLES.map((role) => {
              const active = draft.roles.includes(role);
              return (
                <label key={role} style={{ ...e.chip, ...(active ? e.chipRoleActive : {}) }}>
                  <input type="checkbox" checked={active} onChange={() => toggleRole(role)} style={{ display: 'none' }} />
                  {active && <span style={{ color: '#6d28d9', fontWeight: 700 }}>✓ </span>}
                  {role}
                </label>
              );
            })}
          </div>
        </Field>

        {/* Verktyg */}
        <Field label="Verktyg & ramverk">
          <div style={e.chipGrid}>
            {TOOLS.map((tool) => {
              const active = draft.tools.includes(tool);
              return (
                <label key={tool} style={{ ...e.chip, ...(active ? e.chipToolActive : {}) }}>
                  <input type="checkbox" checked={active} onChange={() => toggleTool(tool)} style={{ display: 'none' }} />
                  {active && <span style={{ color: '#0891b2', fontWeight: 700 }}>✓ </span>}
                  {tool}
                </label>
              );
            })}
          </div>
        </Field>

        {/* GitHub */}
        <Field label="GitHub-länk">
          <input
            style={e.input}
            type="url"
            value={draft.github}
            onChange={(ev) => set('github', ev.target.value)}
            placeholder="https://github.com/användarnamn"
          />
        </Field>

        {/* Portfolio */}
        <Field label="Portfolio-länk">
          <input
            style={e.input}
            type="url"
            value={draft.portfolio}
            onChange={(ev) => set('portfolio', ev.target.value)}
            placeholder="https://minportfolio.se"
          />
        </Field>

        {error && <p style={e.error}>{error}</p>}

        <div style={e.btnRow}>
          <button style={e.previewBtn} type="button" onClick={onPreview}>Förhandsgranska</button>
          <button style={e.saveBtn} type="button" onClick={onSave} disabled={saving}>
            {saving ? 'Sparar...' : 'Spara'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</label>
      {children}
    </div>
  );
}

function CharCount({ value, max }) {
  return (
    <span style={{ fontSize: 12, color: '#9ca3af', textAlign: 'right', marginTop: -4 }}>
      {value.length} / {max}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES — VIEW
// ═══════════════════════════════════════════════════════════════════════════
const v = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    paddingBottom: 32,
    background: '#f7f7f9',
    minHeight: '100%',
    width: '100%',
    boxSizing: 'border-box',
  },
  previewBanner: {
    background: '#111',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    gap: 8,
    flexShrink: 0,
  },
  previewLabel: { fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' },
  previewBack: {
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    padding: '6px 12px',
    borderRadius: 8,
    cursor: 'pointer',
  },
  card: {
    background: '#fff',
    borderRadius: '0 0 24px 24px',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    margin: '0 0 16px',
    width: '100%',
    boxSizing: 'border-box',
  },
  avatarWrap: {
    position: 'relative',
    height: 220,
    width: '100%',
    background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #4f46e5 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  avatarGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    background: 'linear-gradient(to top, rgba(255,255,255,0.95), transparent)',
  },
  avatarName: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
  },
  name: { margin: 0, fontSize: 24, fontWeight: 800, color: '#111', lineHeight: 1.1 },
  taglineOnAvatar: { margin: '4px 0 0', fontSize: 14, color: '#6b7280', fontWeight: 400 },
  body: { padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20, width: '100%', boxSizing: 'border-box' },
  toast: {
    background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
    borderRadius: 10, padding: '10px 14px', fontSize: 14, fontWeight: 600, textAlign: 'center',
  },
  bio: { margin: 0, fontSize: 15, color: '#374151', lineHeight: 1.65 },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: { padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 },
  toolChip: {
    padding: '6px 14px', borderRadius: 20, background: '#f1f5f9',
    color: '#475569', fontSize: 13, fontWeight: 500, border: '1px solid #e2e8f0',
  },
  links: { display: 'flex', flexDirection: 'column', gap: 10 },
  link: { display: 'flex', alignItems: 'center', gap: 8, color: '#7c3aed', fontWeight: 600, fontSize: 14, textDecoration: 'none' },
  linkIcon: {
    width: 28, height: 28, borderRadius: '50%', background: '#ede9fe',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
  },
  empty: { margin: 0, fontSize: 14, color: '#9ca3af', textAlign: 'center', padding: '16px 0' },
  actions: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', boxSizing: 'border-box' },
  editBtn: {
    width: '100%', padding: '14px', borderRadius: 14, border: 'none',
    background: '#7c3aed', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
  },
  logoutBtn: {
    width: '100%', padding: '13px', borderRadius: 14, border: '1.5px solid #e5e7eb',
    background: '#fff', color: '#9ca3af', fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES — EDIT
// ═══════════════════════════════════════════════════════════════════════════
const e = {
  page: { padding: '16px 16px 48px', display: 'flex', flexDirection: 'column', gap: 20, width: '100%', boxSizing: 'border-box' },
  topBar: { display: 'flex', alignItems: 'center', gap: 12 },
  cancelBtn: { background: 'none', border: 'none', color: '#7c3aed', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0, flexShrink: 0 },
  heading: { margin: 0, fontSize: 20, fontWeight: 700, color: '#111' },
  form: { display: 'flex', flexDirection: 'column', gap: 20, width: '100%', boxSizing: 'border-box' },
  input: {
    padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 15,
    outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', color: '#111', background: '#fff',
  },

  // Avatar picker
  avatarRow: { display: 'flex', alignItems: 'center', gap: 16 },
  removeAvatar: {
    position: 'absolute',
    top: -4, right: -4,
    width: 22, height: 22,
    borderRadius: '50%',
    border: 'none',
    background: '#ef4444',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  changeAvatarBtn: {
    padding: '10px 18px',
    borderRadius: 10,
    border: '1.5px solid #7c3aed',
    background: '#fff',
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    width: '100%',
    maxWidth: 480,
    maxHeight: '80dvh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px 12px',
    borderBottom: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  modalTitle: { fontSize: 16, fontWeight: 700, color: '#111' },
  modalClose: { background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer', padding: 0, lineHeight: 1 },
  pickerTabs: { display: 'flex', borderBottom: '1px solid #f0f0f0', flexShrink: 0 },
  pickerTab: {
    flex: 1, padding: '10px', border: 'none', background: 'none',
    fontSize: 14, fontWeight: 600, color: '#9ca3af', cursor: 'pointer',
    borderBottom: '2px solid transparent', marginBottom: -1,
  },
  pickerTabActive: { color: '#7c3aed', borderBottom: '2px solid #7c3aed' },
  // Emoji panel
  emojiPanel: {
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    flex: 1,
  },
  previewRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    padding: '16px 16px 12px',
    borderBottom: '1px solid #f0f0f0',
  },
  previewControls: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  colorRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  colorLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    flexShrink: 0,
  },
  colorInputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  colorInput: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: '1.5px solid #e5e7eb',
    padding: 2,
    cursor: 'pointer',
    background: 'none',
  },
  colorHex: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#6b7280',
  },
  fontBtn: {
    padding: '5px 10px',
    borderRadius: 8,
    border: '1.5px solid #e5e7eb',
    background: '#fff',
    fontSize: 12,
    cursor: 'pointer',
    color: '#374151',
  },
  fontBtnActive: {
    border: '1.5px solid #7c3aed',
    background: '#ede9fe',
    color: '#6d28d9',
  },
  clearEmojiBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: 12,
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
    textAlign: 'left',
  },
  emojiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 8,
    padding: '12px 16px',
  },
  emojiBtn: {
    fontSize: 28,
    padding: '8px',
    borderRadius: 12,
    cursor: 'pointer',
    lineHeight: 1,
    transition: 'transform 0.1s',
  },
  confirmBtn: {
    width: '100%',
    padding: '13px',
    borderRadius: 12,
    border: 'none',
    background: '#7c3aed',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  uploadArea: {
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  uploadBtn: {
    padding: '13px 24px',
    borderRadius: 12,
    border: '1.5px solid #7c3aed',
    background: '#faf5ff',
    color: '#7c3aed',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  uploadErr: { margin: 0, fontSize: 13, color: '#ef4444' },
  uploadHint: { margin: 0, fontSize: 12, color: '#9ca3af' },

  // Radio
  radioGroup: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  radioBtn: {
    display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px',
    borderRadius: 20, border: '1.5px solid #e5e7eb', background: '#fff',
    fontSize: 14, fontWeight: 500, color: '#374151', cursor: 'pointer', userSelect: 'none',
  },
  radioBtnActive: { border: '1.5px solid #7c3aed', background: '#faf5ff', color: '#6d28d9', fontWeight: 600 },
  radioCircle: { width: 14, height: 14, borderRadius: '50%', border: '2px solid #d1d5db', flexShrink: 0 },
  radioCircleActive: { border: '4px solid #7c3aed', background: '#fff' },

  // Chips
  chipGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: {
    padding: '7px 13px', borderRadius: 20, border: '1.5px solid #e5e7eb', background: '#fff',
    fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer', userSelect: 'none',
  },
  chipRoleActive: { border: '1.5px solid #7c3aed', background: '#ede9fe', color: '#6d28d9' },
  chipToolActive: { border: '1.5px solid #0891b2', background: '#ecfeff', color: '#0e7490' },
  error: { margin: 0, fontSize: 13, color: '#ef4444', background: '#fef2f2', padding: '10px 14px', borderRadius: 8 },
  btnRow: { display: 'flex', gap: 10, marginTop: 4 },
  previewBtn: {
    flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #7c3aed',
    background: '#fff', color: '#7c3aed', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
  saveBtn: {
    flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: '#7c3aed',
    color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
  },
};
