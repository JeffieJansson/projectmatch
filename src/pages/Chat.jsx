import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';

function formatTime(isoString) {
  const date  = new Date(isoString.endsWith('Z') ? isoString : isoString + 'Z');
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth()    === today.getMonth()    &&
    date.getDate()     === today.getDate();

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;

  const dateStr = date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  return `${dateStr} ${time}`;
}

export default function Chat() {
  const { matchId } = useParams();
  const navigate    = useNavigate();

  const [userId,   setUserId]   = useState(null);
  const [other,    setOther]    = useState(null);
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [sendError, setSendError] = useState('');

  const bottomRef  = useRef(null);
  const channelRef = useRef(null);

  // ── Load match + messages ────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user.id);

      // Fetch match to find the other person
      const { data: match } = await supabase
        .from('matches')
        .select('owner_id, requester_id, projects(title)')
        .eq('id', matchId)
        .single();

      if (!match) {
        navigate('/matches');
        return;
      }

      const otherId = match.owner_id === user.id ? match.requester_id : match.owner_id;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, tagline, avatar_url')
        .eq('id', otherId)
        .single();

      setOther({ ...profile, projectTitle: match.projects?.title });

      // Fetch existing messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      setMessages(msgs || []);
      setLoading(false);
    }

    load();
  }, [matchId, navigate]);

  // ── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    channelRef.current = supabase
      .channel(`chat:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicates if sender already added optimistically
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelRef.current);
    };
  }, [matchId]);

  // ── Scroll to bottom when messages change ────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────────────────
  async function handleSend(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSendError('');
    setText('');
    setSending(true);

    const optimisticId = `tmp-${Date.now()}`;
    const optimistic = {
      id:         optimisticId,
      match_id:   matchId,
      sender_id:  userId,
      content:    trimmed,
      created_at: new Date().toISOString(),
      _pending:   true,
    };
    setMessages((prev) => [...prev, optimistic]);

    console.log('[Chat] Sending message:', { match_id: matchId, sender_id: userId, content: trimmed });

    const { data, error } = await supabase
      .from('messages')
      .insert({ match_id: matchId, sender_id: userId, content: trimmed })
      .select()
      .single();

    if (error) {
      console.error('[Chat] Supabase insert error:', error);
      setSendError(`Failed to send: ${error.message}`);
      // Restore text and remove optimistic row
      setText(trimmed);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } else {
      console.log('[Chat] Message saved:', data);
      // Replace optimistic row with real one (realtime may have already added it)
      setMessages((prev) => {
        const exists = prev.find((m) => m.id === data.id);
        if (exists) return prev.filter((m) => m.id !== optimisticId);
        return prev.map((m) => (m.id === optimisticId ? data : m));
      });
    }

    setSending(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={s.center}>
        <span style={s.muted}>Loading chat...</span>
      </div>
    );
  }

  const name = other?.full_name || 'Unknown';

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/matches')}>←</button>
        <Avatar avatarUrl={other?.avatar_url} name={name} size={38} />
        <div style={s.headerInfo}>
          <span style={s.headerName}>{name}</span>
          {other?.projectTitle && (
            <span style={s.headerSub}>{other.projectTitle}</span>
          )}
        </div>
      </div>

      {/* Message list */}
      <div style={s.messageList}>
        {messages.length === 0 && (
          <p style={s.emptyChat}>Start the conversation! 👋</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === userId;
          return (
            <div
              key={msg.id}
              style={{ ...s.msgRow, justifyContent: isMine ? 'flex-end' : 'flex-start' }}
            >
              <div
                style={{
                  ...s.bubble,
                  ...(isMine ? s.bubbleMine : s.bubbleTheirs),
                  opacity: msg._pending ? 0.6 : 1,
                }}
              >
                <span style={s.bubbleText}>{msg.content}</span>
                <span style={s.bubbleTime}>{formatTime(msg.created_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Error message */}
      {sendError && (
        <div style={s.sendErrorBar}>
          {sendError}
        </div>
      )}

      {/* Input */}
      <form style={s.inputBar} onSubmit={handleSend}>
        <input
          style={s.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message..."
          autoComplete="off"
        />
        <button
          style={{ ...s.sendBtn, opacity: text.trim() ? 1 : 0.4 }}
          type="submit"
          disabled={!text.trim() || sending}
        >
          ↑
        </button>
      </form>
    </div>
  );
}

const s = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#f7f7f9',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  muted: { color: '#9ca3af', fontSize: 15 },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    background: '#fff',
    borderBottom: '1px solid #f0f0f0',
    boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
    flexShrink: 0,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    fontSize: 22,
    color: '#7c3aed',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
    flexShrink: 0,
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: 15,
    fontWeight: 700,
    color: '#111',
  },
  headerSub: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // Messages
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  emptyChat: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    margin: 'auto',
  },
  msgRow: {
    display: 'flex',
  },
  bubble: {
    maxWidth: '72%',
    padding: '9px 13px',
    borderRadius: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  bubbleMine: {
    background: '#7c3aed',
    borderBottomRightRadius: 4,
    color: '#fff',
  },
  bubbleTheirs: {
    background: '#fff',
    borderBottomLeftRadius: 4,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    color: '#111',
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 1.45,
    wordBreak: 'break-word',
  },
  bubbleTime: {
    fontSize: 10,
    opacity: 0.6,
    alignSelf: 'flex-end',
  },

  // Input
  inputBar: {
    display: 'flex',
    gap: 8,
    padding: '10px 12px',
    background: '#fff',
    borderTop: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: '11px 16px',
    borderRadius: 24,
    border: '1.5px solid #e5e7eb',
    fontSize: 15,
    outline: 'none',
    background: '#f9f9fb',
    fontFamily: 'inherit',
    color: '#111',
  },
  sendErrorBar: {
    background: '#fef2f2',
    color: '#dc2626',
    fontSize: 13,
    padding: '8px 16px',
    borderTop: '1px solid #fecaca',
    flexShrink: 0,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: 'none',
    background: '#7c3aed',
    color: '#fff',
    fontSize: 20,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'opacity 0.15s',
  },
};
