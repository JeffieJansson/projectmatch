import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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
  const [mode, setMode] = useState(MODES.VIEW);

  // Saved data (what's in Supabase)
  const [saved, setSaved]           = useState(null);
  const [userId, setUserId]         = useState(null);
  const [loading, setLoading]       = useState(true);

  // Draft data (what's in the form)
  const [draft, setDraft] = useState({
    fullName: '', tagline: '', bio: '',
    roles: [], tools: [], github: '', portfolio: '',
  });

  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState('');
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
        fullName:  data?.full_name    || '',
        gender:    data?.gender       || '',
        tagline:   data?.tagline      || '',
        bio:       data?.bio          || '',
        roles:     data?.roles        || [],
        tools:     data?.tools        || [],
        github:    data?.github_url   || '',
        portfolio: data?.portfolio_url || '',
      };
      setSaved(profile);
      setDraft(profile);
      setLoading(false);
    }
    load();
  }, []);

  // ── Sync draft when entering edit mode ───────────────────────────────────
  function enterEdit() {
    setDraft(saved);
    setSaveErr('');
    setMode(MODES.EDIT);
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaveErr('');
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:     draft.fullName.trim(),
        gender:        draft.gender             || null,
        tagline:       draft.tagline.trim()   || null,
        bio:           draft.bio.trim()       || null,
        roles:         draft.roles,
        tools:         draft.tools,
        github_url:    draft.github.trim()    || null,
        portfolio_url: draft.portfolio.trim() || null,
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

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ color: '#9ca3af', fontSize: 15 }}>Laddar profil...</span>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
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
      {/* Preview banner */}
      {isPreview && (
        <div style={v.previewBanner}>
          <span style={v.previewLabel}>Förhandsgranskning</span>
          <button style={v.previewBack} onClick={onBackToEdit}>
            ← Tillbaka till redigering
          </button>
        </div>
      )}

      {/* Profile card */}
      <div style={v.card}>
        {/* Avatar */}
        <div style={v.avatarWrap}>
          <div style={v.avatar}>
            <span style={v.avatarEmoji}>🧑‍💻</span>
          </div>
          {/* Gradient overlay at bottom */}
          <div style={v.avatarGradient} />
          <div style={v.avatarName}>
            <h1 style={v.name}>{data.fullName || 'Ditt namn'}</h1>
            {data.tagline && <p style={v.taglineOnAvatar}>{data.tagline}</p>}
          </div>
        </div>

        {/* Body */}
        <div style={v.body}>
          {/* Saved toast */}
          {justSaved && !isPreview && (
            <div style={v.toast}>✓ Profilen sparad!</div>
          )}

          {/* Bio */}
          {data.bio && (
            <Section title="Om mig">
              <p style={v.bio}>{data.bio}</p>
            </Section>
          )}

          {/* Roles */}
          {data.roles.length > 0 && (
            <Section title="Roller">
              <div style={v.chipRow}>
                {data.roles.map((role, i) => {
                  const c = roleColor(i);
                  return (
                    <span key={role} style={{ ...v.chip, background: c.bg, color: c.color }}>
                      {role}
                    </span>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Tools */}
          {data.tools.length > 0 && (
            <Section title="Verktyg & ramverk">
              <div style={v.chipRow}>
                {data.tools.map((tool) => (
                  <span key={tool} style={v.toolChip}>{tool}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Links */}
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

          {/* Empty state */}
          {!data.bio && data.roles.length === 0 && data.tools.length === 0 && (
            <p style={v.empty}>Fyll i din profil så syns du för projektskapare.</p>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isPreview && (
        <div style={v.actions}>
          <button style={v.editBtn} onClick={onEdit}>Redigera profil</button>
          <button style={v.logoutBtn} onClick={onLogout}>Logga ut</button>
        </div>
      )}
    </div>
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
function ProfileEdit({ draft, onChange, saving, error, onPreview, onSave, onCancel }) {
  function set(key, value) {
    onChange((prev) => ({ ...prev, [key]: value }));
  }

  function toggleRole(role) {
    set('roles', draft.roles.includes(role)
      ? draft.roles.filter((r) => r !== role)
      : [...draft.roles, role]);
  }

  function toggleTool(tool) {
    set('tools', draft.tools.includes(tool)
      ? draft.tools.filter((t) => t !== tool)
      : [...draft.tools, tool]);
  }

  return (
    <div style={e.page}>
      <div style={e.topBar}>
        <button style={e.cancelBtn} onClick={onCancel}>← Tillbaka</button>
        <h1 style={e.heading}>Redigera profil</h1>
      </div>

      <div style={e.form}>
        <Field label="Namn *">
          <input
            style={e.input}
            value={draft.fullName}
            onChange={(ev) => set('fullName', ev.target.value)}
            placeholder="Anna Svensson"
          />
        </Field>

        <Field label="Kön">
          <div style={e.radioGroup}>
            {[
              { value: 'man',   label: 'Man' },
              { value: 'kvinna', label: 'Kvinna' },
              { value: 'ej_uppge', label: 'Vill ej uppge' },
            ].map(({ value, label }) => {
              const active = draft.gender === value;
              return (
                <label key={value} style={{ ...e.radioBtn, ...(active ? e.radioBtnActive : {}) }}>
                  <input
                    type="radio"
                    name="gender"
                    value={value}
                    checked={active}
                    onChange={() => set('gender', value)}
                    style={{ display: 'none' }}
                  />
                  <span style={{ ...e.radioCircle, ...(active ? e.radioCircleActive : {}) }} />
                  {label}
                </label>
              );
            })}
          </div>
        </Field>

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

        <Field label="GitHub-länk">
          <input
            style={e.input}
            type="url"
            value={draft.github}
            onChange={(ev) => set('github', ev.target.value)}
            placeholder="https://github.com/användarnamn"
          />
        </Field>

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
          <button style={e.previewBtn} type="button" onClick={onPreview}>
            Förhandsgranska
          </button>
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
  previewLabel: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
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
  },
  avatarWrap: {
    position: 'relative',
    height: 220,
    background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #4f46e5 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(8px)',
    border: '3px solid rgba(255,255,255,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  avatarEmoji: {
    fontSize: 52,
    lineHeight: 1,
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
  name: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: '#111',
    lineHeight: 1.1,
  },
  taglineOnAvatar: {
    margin: '4px 0 0',
    fontSize: 14,
    color: '#6b7280',
    fontWeight: 400,
  },
  body: {
    padding: '20px 20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  toast: {
    background: '#f0fdf4',
    color: '#166534',
    border: '1px solid #bbf7d0',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    fontWeight: 600,
    textAlign: 'center',
  },
  bio: {
    margin: 0,
    fontSize: 15,
    color: '#374151',
    lineHeight: 1.65,
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    padding: '6px 14px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
  },
  toolChip: {
    padding: '6px 14px',
    borderRadius: 20,
    background: '#f1f5f9',
    color: '#475569',
    fontSize: 13,
    fontWeight: 500,
    border: '1px solid #e2e8f0',
  },
  links: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#7c3aed',
    fontWeight: 600,
    fontSize: 14,
    textDecoration: 'none',
  },
  linkIcon: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#ede9fe',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
  },
  empty: {
    margin: 0,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    padding: '16px 0',
  },
  actions: {
    padding: '0 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  editBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: 14,
    border: 'none',
    background: '#7c3aed',
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
  },
  logoutBtn: {
    width: '100%',
    padding: '13px',
    borderRadius: 14,
    border: '1.5px solid #e5e7eb',
    background: '#fff',
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES — EDIT
// ═══════════════════════════════════════════════════════════════════════════
const e = {
  page: {
    padding: '16px 16px 48px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  cancelBtn: {
    background: 'none',
    border: 'none',
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  },
  heading: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: '#111',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  input: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1.5px solid #e5e7eb',
    fontSize: 15,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    color: '#111',
    background: '#fff',
  },
  radioGroup: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  radioBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '9px 14px',
    borderRadius: 20,
    border: '1.5px solid #e5e7eb',
    background: '#fff',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    userSelect: 'none',
  },
  radioBtnActive: {
    border: '1.5px solid #7c3aed',
    background: '#faf5ff',
    color: '#6d28d9',
    fontWeight: 600,
  },
  radioCircle: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: '2px solid #d1d5db',
    flexShrink: 0,
  },
  radioCircleActive: {
    border: '4px solid #7c3aed',
    background: '#fff',
  },
  chipGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    padding: '7px 13px',
    borderRadius: 20,
    border: '1.5px solid #e5e7eb',
    background: '#fff',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    userSelect: 'none',
  },
  chipRoleActive: {
    border: '1.5px solid #7c3aed',
    background: '#ede9fe',
    color: '#6d28d9',
  },
  chipToolActive: {
    border: '1.5px solid #0891b2',
    background: '#ecfeff',
    color: '#0e7490',
  },
  error: {
    margin: 0,
    fontSize: 13,
    color: '#ef4444',
    background: '#fef2f2',
    padding: '10px 14px',
    borderRadius: 8,
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    marginTop: 4,
  },
  previewBtn: {
    flex: 1,
    padding: '13px',
    borderRadius: 12,
    border: '1.5px solid #7c3aed',
    background: '#fff',
    color: '#7c3aed',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  saveBtn: {
    flex: 1,
    padding: '13px',
    borderRadius: 12,
    border: 'none',
    background: '#7c3aed',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
  },
};
