import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Chat() {
  const { matchId } = useParams();
  const navigate    = useNavigate();

  const [userId,   setUserId]   = useState(null);
  const [other,    setOther]    = useState(null);
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);

  const bottomRef  = useRef(null);
  const channelRef = useRef(null);

  // ── Load match + meddelanden ─────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user.id);

      // Hämta match för att hitta den andra personen
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
        .select('id, full_name, tagline')
        .eq('id', otherId)
        .single();

      setOther({ ...profile, projectTitle: match.projects?.title });

      // Hämta befintliga meddelanden
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

  // ── Realtime-prenumeration ───────────────────────────────────────────────
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
            // Undvik dubbletter om avsändaren redan lade till optimistiskt
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

  // ── Scrolla till botten när meddelanden ändras ───────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Skicka meddelande ────────────────────────────────────────────────────
  async function handleSend(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setText('');
    setSending(true);

    const optimistic = {
      id:         `tmp-${Date.now()}`,
      match_id:   matchId,
      sender_id:  userId,
      content:    trimmed,
      created_at: new Date().toISOString(),
      _pending:   true,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data, error } = await supabase
      .from('messages')
      .insert({ match_id: matchId, sender_id: userId, content: trimmed })
      .select()
      .single();

    if (!error && data) {
      // Ersätt optimistisk rad med riktig
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? data : m))
      );
    } else {
      // Ta bort felaktig optimistisk rad
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }

    setSending(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={s.center}>
        <span style={s.muted}>Laddar chatt...</span>
      </div>
    );
  }

  const name     = other?.full_name || 'Okänd';
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/matches')}>←</button>
        <div style={s.headerAvatar}>{initials}</div>
        <div style={s.headerInfo}>
          <span style={s.headerName}>{name}</span>
          {other?.projectTitle && (
            <span style={s.headerSub}>{other.projectTitle}</span>
          )}
        </div>
      </div>

      {/* Meddelandelista */}
      <div style={s.messageList}>
        {messages.length === 0 && (
          <p style={s.emptyChat}>Starta konversationen! 👋</p>
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
                <span style={s.bubbleTime}>
                  {new Date(msg.created_at).toLocaleTimeString('sv-SE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form style={s.inputBar} onSubmit={handleSend}>
        <input
          style={s.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Skriv ett meddelande..."
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
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  bubbleTheirs: {
    background: '#fff',
    borderBottomLeftRadius: 4,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 1.45,
    color: 'inherit',
    wordBreak: 'break-word',
  },
  bubbleTime: {
    fontSize: 10,
    opacity: 0.55,
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
