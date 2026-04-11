import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';

export default function Matches() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [userId, setUserId]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user.id);

      // Fetch matches where the user is owner or requester
      const { data } = await supabase
        .from('matches')
        .select(`
          id,
          owner_id,
          requester_id,
          created_at,
          projects(title)
        `)
        .or(`owner_id.eq.${user.id},requester_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      // Fetch the other person's profile for each match
      const enriched = await Promise.all(
        data.map(async (match) => {
          const otherId = match.owner_id === user.id
            ? match.requester_id
            : match.owner_id;

          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, tagline, roles, avatar_url')
            .eq('id', otherId)
            .single();

          return { ...match, other: profile || { id: otherId, full_name: 'Unknown' } };
        })
      );

      setMatches(enriched);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={s.center}>
        <span style={s.muted}>Loading matches...</span>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div style={s.page}>
        <h1 style={s.heading}>Matches</h1>
        <div style={s.empty}>
          <span style={s.emptyIcon}>💜</span>
          <p style={s.emptyTitle}>No matches yet</p>
          <p style={s.emptyText}>
            When a project creator accepts your request they'll appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <h1 style={s.heading}>Matches</h1>
      <div style={s.list}>
        {matches.map((match) => {
          const name    = match.other.full_name || 'Unknown';
          const tagline = match.other.tagline || null;
          const project = match.projects?.title || null;

          return (
            <button
              key={match.id}
              style={s.card}
              onClick={() => navigate(`/chat/${match.id}`)}
            >
              <Avatar avatarUrl={match.other.avatar_url} name={name} size={50} />

              <div style={s.info}>
                <span style={s.name}>{name}</span>
                {tagline && <span style={s.tagline}>{tagline}</span>}
                {project && (
                  <span style={s.projectLabel}>
                    <span style={s.projectDot} />
                    {project}
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
  page: {
    padding: '24px 16px 48px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  muted: { color: '#9ca3af', fontSize: 15 },
  heading: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#111',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#fff',
    border: 'none',
    borderRadius: 16,
    padding: '14px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  info: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: 700,
    color: '#111',
  },
  tagline: {
    fontSize: 13,
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  projectLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: 600,
  },
  projectDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#7c3aed',
    flexShrink: 0,
  },
  arrow: {
    fontSize: 22,
    color: '#d1d5db',
    flexShrink: 0,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    gap: 8,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: '#111' },
  emptyText: { margin: 0, fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 1.6 },
};
