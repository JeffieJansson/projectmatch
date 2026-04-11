import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (!data) {
        setNotFound(true);
      } else {
        setProfile(data);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return <div style={styles.center}><span style={styles.muted}>Loading profile...</span></div>;
  }

  if (notFound) {
    return (
      <div style={styles.center}>
        <p style={styles.muted}>Profile not found.</p>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  const roles = profile.roles || [];
  const tools = profile.tools || [];

  return (
    <div style={styles.page}>
      <button style={styles.back} onClick={() => navigate(-1)}>← Back</button>

      {/* Header */}
      <div style={styles.header}>
        <Avatar avatarUrl={profile.avatar_url} name={profile.full_name} size={64} />
        <div>
          <h1 style={styles.name}>{profile.full_name}</h1>
          {profile.tagline && <p style={styles.tagline}>{profile.tagline}</p>}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <Section title="About me">
          <p style={styles.bio}>{profile.bio}</p>
        </Section>
      )}

      {/* Roles */}
      {roles.length > 0 && (
        <Section title="Roles">
          <div style={styles.chipGrid}>
            {roles.map((role) => (
              <span key={role} style={styles.chip}>{role}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Tools */}
      {tools.length > 0 && (
        <Section title="Tools & frameworks">
          <div style={styles.chipGrid}>
            {tools.map((tool) => (
              <span key={tool} style={styles.toolChip}>{tool}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Links */}
      {(profile.github_url || profile.portfolio_url) && (
        <Section title="Links">
          <div style={styles.links}>
            {profile.github_url && (
              <a href={profile.github_url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                GitHub ↗
              </a>
            )}
            {profile.portfolio_url && (
              <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                Portfolio ↗
              </a>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </div>
  );
}

const styles = {
  page: {
    padding: '16px 16px 48px',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 16,
  },
  muted: { color: '#9ca3af', fontSize: 15 },
  back: {
    alignSelf: 'flex-start',
    background: 'none',
    border: 'none',
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  backBtn: {
    padding: '10px 20px',
    borderRadius: 10,
    border: '1.5px solid #e5e7eb',
    background: '#fff',
    fontSize: 14,
    cursor: 'pointer',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    color: '#fff',
    fontSize: 26,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  name: {
    margin: '0 0 4px',
    fontSize: 22,
    fontWeight: 700,
    color: '#111',
  },
  tagline: {
    margin: 0,
    fontSize: 14,
    color: '#6b7280',
  },
  sectionTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bio: {
    margin: 0,
    fontSize: 15,
    color: '#374151',
    lineHeight: 1.6,
  },
  chipGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    padding: '6px 12px',
    borderRadius: 20,
    background: '#ede9fe',
    color: '#6d28d9',
    fontSize: 13,
    fontWeight: 500,
  },
  toolChip: {
    padding: '6px 12px',
    borderRadius: 20,
    background: '#ecfeff',
    color: '#0e7490',
    fontSize: 13,
    fontWeight: 500,
  },
  links: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  link: {
    color: '#7c3aed',
    fontWeight: 600,
    fontSize: 14,
    textDecoration: 'none',
  },
};
