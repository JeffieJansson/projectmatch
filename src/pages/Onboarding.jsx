import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ROLES = [
  'Frontend', 'Backend', 'Fullstack', 'UI/UX Design', 'Grafisk design',
  'Marknadsföring', 'Growth', 'iOS/Android', 'Data/AI', 'Copywriting',
];

const TOOLS = [
  'React', 'Node.js', 'TypeScript', 'Vue', 'Next.js', 'Supabase',
  'PostgreSQL', 'Docker', 'Figma', 'Tailwind', 'Python', 'Swift',
  'Kotlin', 'AWS', 'Firebase',
];

export default function Onboarding({ onComplete }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 = welcome, 1 = profile form
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    tagline: '',
    bio: '',
    gender: '',
    roles: [],
    tools: [],
    github: '',
    portfolio: '',
  });

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleRole(role) {
    set('roles', form.roles.includes(role)
      ? form.roles.filter((r) => r !== role)
      : [...form.roles, role]
    );
  }

  function toggleTool(tool) {
    set('tools', form.tools.includes(tool)
      ? form.tools.filter((t) => t !== tool)
      : [...form.tools, tool]
    );
  }

  async function markDone(profileData = {}) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('profiles').update({
      onboarding_completed: true,
      ...profileData,
    }).eq('id', user.id);
    setSaving(false);
    onComplete();
    navigate('/explore', { replace: true });
  }

  async function handleSave() {
    await markDone({
      full_name:     form.fullName.trim() || null,
      tagline:       form.tagline.trim()  || null,
      bio:           form.bio.trim()      || null,
      gender:        form.gender          || null,
      roles:         form.roles,
      tools:         form.tools,
      github_url:    form.github.trim()   || null,
      portfolio_url: form.portfolio.trim()|| null,
    });
  }

  async function handleSkip() {
    await markDone();
  }

  // ── Step 0: Welcome ───────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div style={s.page}>
        <div style={s.welcomeWrap}>
          <div style={s.logo}>🚀</div>
          <h1 style={s.welcomeTitle}>Välkommen till ProjectMatch!</h1>
          <p style={s.welcomeText}>
            Här matchar du med spännande sidoprojekt och hittar medgrundare,
            designers, utvecklare och marknadsförare som delar dina ambitioner.
          </p>
          <p style={s.welcomeText}>
            Swipa igenom projekt, visa intresse och starta en konversation
            med projektägaren om det känns rätt.
          </p>
          <div style={s.featureList}>
            <FeatureRow icon="🔍" text="Utforska projekt som söker din kompetens" />
            <FeatureRow icon="♥" text="Matcha med grundare du vill jobba med" />
            <FeatureRow icon="💬" text="Chatta direkt i appen" />
          </div>
        </div>

        <div style={s.welcomeFooter}>
          <button style={s.primaryBtn} onClick={() => setStep(1)}>
            Kom igång →
          </button>
          <button style={s.skipLink} onClick={handleSkip} disabled={saving}>
            Hoppa över
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: Profile form ──────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.formHeader}>
        <h1 style={s.formTitle}>Din profil</h1>
        <p style={s.formSub}>Hjälper projektägare att förstå vem du är.</p>
      </div>

      <div style={s.formScroll}>
        {/* Name */}
        <Field label="Namn">
          <input
            style={s.input}
            placeholder="Ditt namn"
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
          />
        </Field>

        {/* Gender */}
        <Field label="Kön">
          <div style={s.radioGroup}>
            {['Man', 'Kvinna', 'Vill ej ange'].map((g) => (
              <label key={g} style={s.radioLabel}>
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={form.gender === g}
                  onChange={() => set('gender', g)}
                  style={s.radioInput}
                />
                {g}
              </label>
            ))}
          </div>
        </Field>

        {/* Tagline */}
        <Field label="Tagline">
          <input
            style={s.input}
            placeholder="T.ex. Full-stack dev som älskar produktutveckling"
            value={form.tagline}
            onChange={(e) => set('tagline', e.target.value)}
          />
        </Field>

        {/* Bio */}
        <Field label="Bio">
          <textarea
            style={{ ...s.input, ...s.textarea }}
            placeholder="Berätta lite om dig själv, dina erfarenheter och vad du letar efter..."
            value={form.bio}
            onChange={(e) => set('bio', e.target.value)}
            rows={4}
          />
        </Field>

        {/* Roles */}
        <Field label="Dina roller">
          <div style={s.chipGrid}>
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                style={{
                  ...s.chip,
                  ...(form.roles.includes(role) ? s.chipActive : {}),
                }}
                onClick={() => toggleRole(role)}
              >
                {role}
              </button>
            ))}
          </div>
        </Field>

        {/* Tools */}
        <Field label="Verktyg & ramverk">
          <div style={s.chipGrid}>
            {TOOLS.map((tool) => (
              <button
                key={tool}
                type="button"
                style={{
                  ...s.chip,
                  ...(form.tools.includes(tool) ? s.chipActive : {}),
                }}
                onClick={() => toggleTool(tool)}
              >
                {tool}
              </button>
            ))}
          </div>
        </Field>

        {/* GitHub */}
        <Field label="GitHub">
          <input
            style={s.input}
            placeholder="https://github.com/..."
            value={form.github}
            onChange={(e) => set('github', e.target.value)}
          />
        </Field>

        {/* Portfolio */}
        <Field label="Portfolio">
          <input
            style={s.input}
            placeholder="https://..."
            value={form.portfolio}
            onChange={(e) => set('portfolio', e.target.value)}
          />
        </Field>

        <div style={{ height: 16 }} />
      </div>

      <div style={s.formFooter}>
        <button
          style={{ ...s.primaryBtn, opacity: saving ? 0.6 : 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Sparar...' : 'Spara och kom igång'}
        </button>
        <button style={s.skipLink} onClick={handleSkip} disabled={saving}>
          Hoppa över
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={s.field}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function FeatureRow({ icon, text }) {
  return (
    <div style={s.featureRow}>
      <span style={s.featureIcon}>{icon}</span>
      <span style={s.featureText}>{text}</span>
    </div>
  );
}

const s = {
  page: { display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' },

  welcomeWrap: { flex: 1, overflowY: 'auto', padding: '48px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  logo: { fontSize: 56, lineHeight: 1 },
  welcomeTitle: { margin: 0, fontSize: 24, fontWeight: 800, color: '#f1f5f9', textAlign: 'center', lineHeight: 1.2 },
  welcomeText: { margin: 0, fontSize: 15, color: '#94a3b8', lineHeight: 1.6, textAlign: 'center' },
  featureList: {
    width: '100%', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8,
    background: '#160d2e', borderRadius: 16, padding: '16px 20px',
    boxSizing: 'border-box', border: '1px solid rgba(139,92,246,0.15)',
  },
  featureRow: { display: 'flex', alignItems: 'center', gap: 12 },
  featureIcon: { fontSize: 20, flexShrink: 0 },
  featureText: { fontSize: 14, color: '#94a3b8', lineHeight: 1.4 },
  welcomeFooter: {
    flexShrink: 0, padding: '16px 24px 32px', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: 12,
    borderTop: '1px solid rgba(139,92,246,0.15)', background: '#0d0920',
  },

  formHeader: { flexShrink: 0, padding: '24px 24px 0' },
  formTitle: { margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#f1f5f9' },
  formSub: { margin: 0, fontSize: 14, color: '#64748b' },
  formScroll: { flex: 1, overflowY: 'auto', padding: '16px 24px 0', display: 'flex', flexDirection: 'column', gap: 20 },
  formFooter: {
    flexShrink: 0, padding: '16px 24px 32px', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: 12,
    borderTop: '1px solid rgba(139,92,246,0.15)', background: '#0d0920',
  },

  primaryBtn: {
    width: '100%', padding: '14px', borderRadius: 12, border: 'none',
    background: '#8b5cf6', color: '#fff', fontSize: 16, fontWeight: 700,
    cursor: 'pointer', boxShadow: '0 4px 14px rgba(139,92,246,0.4)',
  },
  skipLink: { background: 'none', border: 'none', color: '#64748b', fontSize: 14, cursor: 'pointer', padding: 0 },

  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1.5px solid rgba(139,92,246,0.2)', fontSize: 15,
    color: '#f1f5f9', background: '#1a1035', boxSizing: 'border-box',
    fontFamily: 'inherit', outline: 'none',
  },
  textarea: { resize: 'vertical', lineHeight: 1.5 },
  radioGroup: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#94a3b8', cursor: 'pointer' },
  radioInput: { accentColor: '#8b5cf6', width: 16, height: 16 },
  chipGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: {
    padding: '7px 14px', borderRadius: 20, border: '1.5px solid rgba(139,92,246,0.2)',
    background: '#160d2e', color: '#64748b', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.15s',
  },
  chipActive: { background: '#2d1b69', borderColor: '#8b5cf6', color: '#c4b5fd' },
};
