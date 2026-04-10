import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ROLES = [
  'Frontend',
  'Backend',
  'Fullstack',
  'UI/UX Design',
  'Grafisk design',
  'Marknadsföring',
  'Growth',
  'iOS/Android',
  'Data/AI',
  'Copywriting',
];

const STAGES = [
  { value: 'idea',  label: 'Idé',   desc: 'Konceptfas, inget byggt än' },
  { value: 'mvp',   label: 'MVP',   desc: 'Första version under bygge' },
  { value: 'beta',  label: 'Beta',  desc: 'Lanserat, söker tillväxt' },
];

export default function CreateProject() {
  const navigate = useNavigate();

  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage]           = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [roles, setRoles]           = useState([]);
  const [link, setLink]             = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  function toggleRole(role) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!stage) {
      setError('Välj ett stadium för projektet.');
      return;
    }
    if (roles.length === 0) {
      setError('Välj minst en roll du söker.');
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from('projects').insert({
      creator_id:    user.id,
      title:         title.trim(),
      description:   description.trim(),
      stage,
      hours_per_week: parseInt(hoursPerWeek, 10) || null,
      roles_needed:  roles,
      link:          link.trim() || null,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    navigate('/explore');
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Nytt projekt</h1>

      <form onSubmit={handleSubmit} style={styles.form}>

        {/* Titel */}
        <Field label="Projektnamn *">
          <input
            style={styles.input}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="T.ex. EcoTrack"
            maxLength={80}
            required
          />
        </Field>

        {/* Beskrivning */}
        <Field label="Beskrivning *">
          <textarea
            style={{ ...styles.input, ...styles.textarea }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Vad är projektet? Vilket problem löser det?"
            maxLength={600}
            rows={4}
            required
          />
          <span style={styles.charCount}>{description.length} / 600</span>
        </Field>

        {/* Stadium */}
        <Field label="Stadium *">
          <div style={styles.stageGroup}>
            {STAGES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStage(s.value)}
                style={{
                  ...styles.stageBtn,
                  ...(stage === s.value ? styles.stageBtnActive : {}),
                }}
              >
                <span style={styles.stageLabel}>{s.label}</span>
                <span style={styles.stageDesc}>{s.desc}</span>
              </button>
            ))}
          </div>
        </Field>

        {/* Tid per vecka */}
        <Field label="Tid per vecka (timmar) *">
          <div style={styles.hoursRow}>
            {[2, 5, 10, 20].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHoursPerWeek(String(h))}
                style={{
                  ...styles.hoursBtn,
                  ...(hoursPerWeek === String(h) ? styles.hoursBtnActive : {}),
                }}
              >
                {h}h
              </button>
            ))}
            <input
              style={{ ...styles.input, ...styles.hoursInput }}
              type="number"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(e.target.value)}
              placeholder="Eget"
              min={1}
              max={80}
            />
          </div>
        </Field>

        {/* Roller */}
        <Field label="Roller som söks *">
          <div style={styles.rolesGrid}>
            {ROLES.map((role) => {
              const active = roles.includes(role);
              return (
                <label key={role} style={{ ...styles.roleChip, ...(active ? styles.roleChipActive : {}) }}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleRole(role)}
                    style={{ display: 'none' }}
                  />
                  {active && <span style={styles.checkmark}>✓ </span>}
                  {role}
                </label>
              );
            })}
          </div>
        </Field>

        {/* Länk */}
        <Field label="Länk (valfritt)">
          <input
            style={styles.input}
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
          />
        </Field>

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.submitBtn} type="submit" disabled={loading}>
          {loading ? 'Sparar...' : 'Publicera projekt'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  page: {
    padding: '24px 16px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  heading: {
    margin: '0 0 20px',
    fontSize: 22,
    fontWeight: 700,
    color: '#111',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
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
  textarea: {
    resize: 'vertical',
    lineHeight: 1.5,
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: -4,
  },
  stageGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  stageBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '12px 16px',
    borderRadius: 10,
    border: '1.5px solid #e5e7eb',
    background: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
    gap: 2,
  },
  stageBtnActive: {
    border: '1.5px solid #7c3aed',
    background: '#faf5ff',
  },
  stageLabel: {
    fontSize: 15,
    fontWeight: 600,
    color: '#111',
  },
  stageDesc: {
    fontSize: 12,
    color: '#9ca3af',
  },
  hoursRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  hoursBtn: {
    padding: '10px 16px',
    borderRadius: 10,
    border: '1.5px solid #e5e7eb',
    background: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    color: '#374151',
  },
  hoursBtnActive: {
    border: '1.5px solid #7c3aed',
    background: '#faf5ff',
    color: '#7c3aed',
  },
  hoursInput: {
    width: 80,
    flex: '0 0 auto',
  },
  rolesGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    padding: '8px 14px',
    borderRadius: 20,
    border: '1.5px solid #e5e7eb',
    background: '#fff',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.15s',
  },
  roleChipActive: {
    border: '1.5px solid #7c3aed',
    background: '#ede9fe',
    color: '#6d28d9',
  },
  checkmark: {
    fontWeight: 700,
    color: '#7c3aed',
  },
  error: {
    margin: 0,
    fontSize: 13,
    color: '#ef4444',
    background: '#fef2f2',
    padding: '10px 14px',
    borderRadius: 8,
  },
  submitBtn: {
    padding: '14px',
    borderRadius: 12,
    border: 'none',
    background: '#7c3aed',
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 4,
  },
};
