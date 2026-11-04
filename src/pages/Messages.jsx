import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { NOTIFICATIONS_CHANGED, getChatLastRead } from '../lib/notificationStore';
import Avatar from '../components/Avatar';

// Latest message + unread count for one conversation.
// "Unread" = same rule as useNotifications: messages from the other person
// created after the chat_last_read_<matchId> timestamp in localStorage.
async function fetchConversationStats(matchId, userId) {
  const [lastRes, unreadRes] = await Promise.all([
    supabase
      .from('messages')
      .select('content, sender_id, created_at')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', matchId)
      .neq('sender_id', userId)
      .gt('created_at', getChatLastRead(matchId)),
  ]);
  if (lastRes.error) console.error(`Failed to load last message for ${matchId}:`, lastRes.error);
  if (unreadRes.error) console.error(`Failed to count unread for ${matchId}:`, unreadRes.error);
  return { lastMessage: lastRes.data || null, unread: unreadRes.count || 0 };
}

// Unread conversations first, then by latest activity (last message, or match date)
function sortConversations(list) {
  const activity = (c) => c.lastMessage?.created_at || c.created_at;
  return [...list].sort((a, b) => {
    const unreadDiff = (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0);
    if (unreadDiff !== 0) return unreadDiff;
    return new Date(activity(b)) - new Date(activity(a));
  });
}

export default function Messages() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [userId, setUserId]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const conversationIdsRef    = useRef([]);

  useEffect(() => {
    conversationIdsRef.current = conversations.map((c) => c.id);
  }, [conversations]);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user.id);

        const { data, error: fetchError } = await supabase
          .from('matches')
          .select('id, owner_id, requester_id, created_at, projects(title)')
          .or(`owner_id.eq.${user.id},requester_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        if (!data || data.length === 0) { setConversations([]); return; }

        const enriched = await Promise.all(
          data.map(async (match) => {
            const otherId = match.owner_id === user.id ? match.requester_id : match.owner_id;
            const [{ data: profile }, stats] = await Promise.all([
              supabase
                .from('profiles')
                .select('id, full_name, tagline, roles, avatar_url')
                .eq('id', otherId)
                .single(),
              fetchConversationStats(match.id, user.id),
            ]);
            return { ...match, ...stats, other: profile || { id: otherId, full_name: 'Unknown' } };
          })
        );

        setConversations(sortConversations(enriched));
      } catch (err) {
        console.error('Failed to load conversations:', err);
        setError('Could not load conversations. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Live updates: new incoming/outgoing messages, and chats marked as read
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function refresh(matchId) {
      const stats = await fetchConversationStats(matchId, userId);
      if (cancelled) return;
      setConversations((prev) =>
        prev.some((c) => c.id === matchId)
          ? sortConversations(prev.map((c) => (c.id === matchId ? { ...c, ...stats } : c)))
          : prev
      );
    }

    function refreshAll() {
      conversationIdsRef.current.forEach((id) => refresh(id));
    }

    const channel = supabase
      .channel('messages-page')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => refresh(payload.new.match_id)
      )
      .subscribe();

    window.addEventListener(NOTIFICATIONS_CHANGED, refreshAll);
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.removeEventListener(NOTIFICATIONS_CHANGED, refreshAll);
    };
  }, [userId]);

  if (loading) {
    return <div style={s.center}><span style={s.muted}>Loading messages...</span></div>;
  }

  if (error) {
    return <div style={s.center}><span style={{ color: '#f87171', fontSize: 14, textAlign: 'center' }}>{error}</span></div>;
  }

  if (conversations.length === 0) {
    return (
      <div style={s.page}>
        <h1 style={s.heading}>Messages</h1>
        <div style={s.empty}>
          <span style={s.emptyIcon}>💬</span>
          <p style={s.emptyTitle}>No conversations yet</p>
          <p style={s.emptyText}>Once you match with someone you can chat with them here.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <h1 style={s.heading}>Messages</h1>
      <div style={s.list}>
        {conversations.map((match) => {
          const name     = match.other.full_name || 'Unknown';
          const project  = match.projects?.title || null;
          const last     = match.lastMessage;
          const isUnread = match.unread > 0;
          const preview  = last
            ? `${last.sender_id === userId ? 'You: ' : ''}${last.content}`
            : 'No messages yet';

          return (
            <button
              key={match.id}
              style={{ ...s.card, ...(isUnread ? s.cardUnread : {}) }}
              onClick={() => navigate(`/chat/${match.id}`)}
            >
              <Avatar avatarUrl={match.other.avatar_url} name={name} size={50} />
              <div style={s.info}>
                <span style={{ ...s.name, ...(isUnread ? s.nameUnread : {}) }}>{name}</span>
                <span
                  style={{
                    ...s.preview,
                    ...(isUnread ? s.previewUnread : {}),
                    ...(!last ? s.previewEmpty : {}),
                  }}
                >
                  {preview}
                </span>
                {project && (
                  <span style={s.projectLabel}>
                    <span style={s.projectDot} />
                    {project}
                  </span>
                )}
              </div>
              {isUnread ? (
                <span style={s.unreadBadge} aria-label={`${match.unread} unread messages`}>
                  {match.unread > 99 ? '99+' : match.unread}
                </span>
              ) : (
                <span style={s.arrow}>›</span>
              )}
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
  cardUnread: { border: '1px solid rgba(139,92,246,0.5)', background: '#1c1240' },
  info: { flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 },
  name: { fontSize: 16, fontWeight: 500, color: '#cbd5e1' },
  nameUnread: { fontWeight: 800, color: '#f1f5f9' },
  preview: { fontSize: 13, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  previewUnread: { fontWeight: 700, color: '#e2e8f0' },
  previewEmpty: { fontStyle: 'italic' },
  projectLabel: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#a78bfa', fontWeight: 600 },
  projectDot: { width: 5, height: 5, borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 },
  arrow: { fontSize: 22, color: '#4a3a6e', flexShrink: 0 },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    padding: '0 7px',
    boxSizing: 'border-box',
    background: '#8b5cf6',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' },
  emptyText: { margin: 0, fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 1.6 },
};
