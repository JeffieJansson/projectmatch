import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSeenMatchIds, markMatchesSeen } from '../lib/notificationStore';
import Avatar from '../components/Avatar';

export default function Matches() {
  const navigate = useNavigate();
  const [people, setPeople]   = useState([]);
  const [seen, setSeen]       = useState(() => getSeenMatchIds() || new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error: fetchError } = await supabase
          .from('matches')
          .select('id, owner_id, requester_id, created_at')
          .or(`owner_id.eq.${user.id},requester_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        if (!data || data.length === 0) { setPeople([]); return; }

        // Group matches per matched user (one person can match on several projects)
        const byUser = new Map();
        for (const match of data) {
          const otherId = match.owner_id === user.id ? match.requester_id : match.owner_id;
          if (!byUser.has(otherId)) byUser.set(otherId, []);
          byUser.get(otherId).push(match.id);
        }

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, tagline, roles, avatar_url')
          .in('id', [...byUser.keys()]);

        if (profilesError) throw profilesError;
        const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

        setPeople(
          [...byUser.entries()].map(([id, matchIds]) => ({
            profile: profileMap[id] || { id, full_name: 'Unknown' },
            matchIds,
          }))
        );
        setSeen(getSeenMatchIds() || new Set());
      } catch {
        setError('Could not load matches. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function openProfile(person) {
    markMatchesSeen(person.matchIds);
    navigate(`/profile/${person.profile.id}`);
  }

  if (loading) {
    return <div style={s.center}><span style={s.muted}>Loading matches...</span></div>;
  }

  if (error) {
    return <div style={s.center}><span style={{ color: '#f87171', fontSize: 14, textAlign: 'center' }}>{error}</span></div>;
  }

  if (people.length === 0) {
    return (
      <div style={s.page}>
        <h1 style={s.heading}>Matches</h1>
        <div style={s.empty}>
          <span style={s.emptyIcon}>💜</span>
          <p style={s.emptyTitle}>No matches yet</p>
          <p style={s.emptyText}>When a project creator accepts your request they'll appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <h1 style={s.heading}>Matches</h1>
      <div style={s.list}>
        {people.map((person) => {
          const { profile } = person;
          const name    = profile.full_name || 'Unknown';
          const tagline = profile.tagline || null;
          const roles   = profile.roles || [];
          const isNew   = person.matchIds.some((id) => !seen.has(id));

          return (
            <button key={profile.id} style={s.card} onClick={() => openProfile(person)}>
              <Avatar avatarUrl={profile.avatar_url} name={name} size={50} />
              <div style={s.info}>
                <span style={s.nameRow}>
                  <span style={s.name}>{name}</span>
                  {isNew && <span style={s.newChip}>New</span>}
                </span>
                {tagline && <span style={s.tagline}>{tagline}</span>}
                {roles.length > 0 && (
                  <span style={s.roles}>
                    {roles.map((role) => (
                      <span key={role} style={s.roleChip}>{role}</span>
                    ))}
                  </span>
                )}
              </div>
              <span style={s.arrow}>›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  page: { padding: '24px 16px 48px', display: 'flex', flexDirection: 'column', gap: 16 },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' },
  muted: { color: '#64748b', fontSize: 15 },
  heading: { margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#160d2e',
    border: '1px solid rgba(139,92,246,0.15)',
    borderRadius: 16,
    padding: '14px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  info: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  nameRow: { display: 'flex', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: 700, color: '#f1f5f9' },
  newChip: { fontSize: 10, fontWeight: 700, background: '#8b5cf6', color: '#fff', padding: '2px 7px', borderRadius: 20 },
  tagline: { fontSize: 13, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  roles: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  roleChip: { fontSize: 11, background: '#2d1b69', color: '#c4b5fd', padding: '2px 8px', borderRadius: 20, fontWeight: 500 },
  arrow: { fontSize: 22, color: '#4a3a6e', flexShrink: 0 },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' },
  emptyText: { margin: 0, fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 1.6 },
};
