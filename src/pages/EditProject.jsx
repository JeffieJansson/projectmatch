import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ROLES = [
  'Frontend', 'Backend', 'Fullstack', 'UI/UX Design', 'Graphic design',
  'Marketing', 'Growth', 'iOS/Android', 'Data/AI', 'Copywriting',
];

const STAGES = [
  { value: 'idea', label: 'Idea', desc: 'Concept stage, nothing built yet' },
  { value: 'mvp',  label: 'MVP',  desc: 'First version in progress' },
  { value: 'beta', label: 'Beta', desc: 'Launched, looking for growth' },
];

export default function EditProject() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [stage,        setStage]        = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [roles,        setRoles]        = useState([]);
  const [link,         setLink]         = useState('');

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
      if (error || !data) { navigate('/my-projects', { replace: true }); return; }
      setTitle(data.title || '');
      setDescription(data.description || '');
      setStage(data.stage || '');
      setHoursPerWeek(data.hours_per_week ? String(data.hours_per_week) : '');
      setRoles(Array.isArray(data.roles_needed) ? data.roles_needed : (data.roles_needed || '').split(',').map((r) => r.trim()).filter(Boolean));
      setLink(data.link || '');
      setLoading(false);
    }
    load();
  }, [id, navigate]);

  function toggleRole(role) {
    setRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!stage)             { setError('Please select a stage for the project.'); return; }
    if (roles.length === 0) { setError('Please select at least one role.'); return; }

    setSaving(true);
    const { error: updateError } = await supabase.from('projects').update({
      title:          title.trim(),
      description:    description.trim(),
      stage,
      hours_per_week: parseInt(hoursPerWeek, 10) || null,
      roles_needed:   roles,
      link:           link.trim() || null,
    }).eq('id', id);

    if (updateError) { setError(updateError.message); setSaving(false); return; }
    navigate('/my-projects');
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><span style={{ color: '#64748b', fontSize: 15 }}>Loading...</span></div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={() => navigate('/my-projects')}>← Back</button>
        <h1 style={styles.heading}>Edit project</h1>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <Field label="Project name *">
          <input style={styles.input} type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. EcoTrack" maxLength={80} required />
        </Field>

        <Field label="Description *">
          <textarea style={{ ...styles.input, ...styles.textarea }} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} rows={4} required />
          <span style={styles.charCount}>{description.length} / 600</span>
        </Field>

        <Field label="Stage *">
          <div style={styles.stageGroup}>
            {STAGES.map((s) => (
              <button key={s.value} type="button" onClick={() => setStage(s.value)} style={{ ...styles.stageBtn, ...(stage === s.value ? styles.stageBtnActive : {}) }}>
                <span style={styles.stageLabel}>{s.label}</span>
                <span style={styles.stageDesc}>{s.desc}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Hours per week *">
          <div style={styles.hoursRow}>
            {[2, 5, 10, 20].map((h) => (
              <button key={h} type="button" onClick={() => setHoursPerWeek(String(h))} style={{ ...styles.hoursBtn, ...(hoursPerWeek === String(h) ? styles.hoursBtnActive : {}) }}>
                {h}h
              </button>
            ))}
            <input style={{ ...styles.input, ...styles.hoursInput }} type="number" value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} placeholder="Other" min={1} max={80} />
          </div>
        </Field>

        <Field label="Roles needed *">
          <div style={styles.rolesGrid}>
            {ROLES.map((role) => {
              const active = roles.includes(role);
              return (
                <label key={role} style={{ ...styles.roleChip, ...(active ? styles.roleChipActive : {}) }}>
                  <input type="checkbox" checked={active} onChange={() => toggleRole(role)} style={{ display: 'none' }} />
                  {active && <span style={styles.checkmark}>✓ </span>}
                  {role}
                </label>
              );
            })}
          </div>
        </Field>

        <Field label="Link (optional)">
          <input style={styles.input} type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
        </Field>

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.submitBtn} type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return <div style={styles.field}><label style={styles.label}>{label}</label>{children}</div>;
}

const styles = {
  page: { padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 4 },
  topBar: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { background: 'none', border: 'none', color: '#a78bfa', fontSize: 15, fontWeight: 600, cursor: 'pointer', padding: 0, flexShrink: 0 },
  heading: { margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 13, fontWeight: 600, color: '#94a3b8' },
  input: {
    padding: '12px 14px', borderRadius: 10, border: '1.5px solid rgba(139,92,246,0.2)',
    fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box',
    fontFamily: 'inherit', color: '#f1f5f9', background: '#1a1035',
  },
  textarea: { resize: 'vertical', lineHeight: 1.5 },
  charCount: { fontSize: 12, color: '#64748b', textAlign: 'right', marginTop: -4 },
  stageGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  stageBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    padding: '12px 16px', borderRadius: 10, border: '1.5px solid rgba(139,92,246,0.2)',
    background: '#160d2e', cursor: 'pointer', textAlign: 'left', gap: 2,
  },
  stageBtnActive: { border: '1.5px solid #8b5cf6', background: '#2d1b69' },
  stageLabel: { fontSize: 15, fontWeight: 600, color: '#f1f5f9' },
  stageDesc: { fontSize: 12, color: '#64748b' },
  hoursRow: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  hoursBtn: {
    padding: '10px 16px', borderRadius: 10, border: '1.5px solid rgba(139,92,246,0.2)',
    background: '#160d2e', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#94a3b8',
  },
  hoursBtnActive: { border: '1.5px solid #8b5cf6', background: '#2d1b69', color: '#c4b5fd' },
  hoursInput: { width: 80, flex: '0 0 auto' },
  rolesGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    padding: '8px 14px', borderRadius: 20, border: '1.5px solid rgba(139,92,246,0.2)',
    background: '#160d2e', fontSize: 13, fontWeight: 500, color: '#94a3b8',
    cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s',
  },
  roleChipActive: { border: '1.5px solid #8b5cf6', background: '#2d1b69', color: '#c4b5fd' },
  checkmark: { fontWeight: 700, color: '#a78bfa' },
  error: { margin: 0, fontSize: 13, color: '#f87171', background: 'rgba(239,68,68,0.1)', padding: '10px 14px', borderRadius: 8 },
  submitBtn: {
    padding: '14px', borderRadius: 12, border: 'none', background: '#8b5cf6',
    color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 4,
    boxShadow: '0 4px 14px rgba(139,92,246,0.4)',
  },
};
