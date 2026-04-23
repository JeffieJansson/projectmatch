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
  return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${time}`;
}

export default function Chat() {
  const { matchId } = useParams();
  const navigate    = useNavigate();

  const [userId,    setUserId]    = useState(null);
  const [other,     setOther]     = useState(null);
  const [messages,  setMessages]  = useState([]);
  const [text,      setText]      = useState('');
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [sendError, setSendError] = useState('');

  const bottomRef  = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user.id);

      const { data: match } = await supabase
        .from('matches')
        .select('owner_id, requester_id, projects(title)')
        .eq('id', matchId)
        .single();

      if (!match) { navigate('/matches'); return; }

      const otherId = match.owner_id === user.id ? match.requester_id : match.owner_id;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, tagline, avatar_url')
        .eq('id', otherId)
        .single();

      setOther({ ...profile, projectTitle: match.projects?.title });

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      setMessages(msgs || []);
      setLoading(false);

      localStorage.setItem(`chat_last_read_${matchId}`, new Date().toISOString());
    }
    load();
  }, [matchId, navigate]);

  useEffect(() => {
    channelRef.current = supabase
      .channel(`chat:${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          localStorage.setItem(`chat_last_read_${matchId}`, new Date().toISOString());
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channelRef.current); };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSendError('');
    setText('');
    setSending(true);

    const optimisticId = `tmp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: optimisticId, match_id: matchId, sender_id: userId, content: trimmed, created_at: new Date().toISOString(), _pending: true }]);

    const { data, error } = await supabase
      .from('messages')
      .insert({ match_id: matchId, sender_id: userId, content: trimmed })
      .select()
      .single();

    if (error) {
      setSendError(`Failed to send: ${error.message}`);
      setText(trimmed);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } else {
      setMessages((prev) => {
        const exists = prev.find((m) => m.id === data.id);
        if (exists) return prev.filter((m) => m.id !== optimisticId);
        return prev.map((m) => (m.id === optimisticId ? data : m));
      });
    }

    setSending(false);
  }

  if (loading) {
    return <div style={s.center}><span style={s.muted}>Loading chat...</span></div>;
  }

  const name = other?.full_name || 'Unknown';

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/matches')}>←</button>
        <Avatar avatarUrl={other?.avatar_url} name={name} size={38} />
        <div style={s.headerInfo}>
          <span style={s.headerName}>{name}</span>
          {other?.projectTitle && <span style={s.headerSub}>{other.projectTitle}</span>}
        </div>
      </div>

      <div style={s.messageList}>
        {messages.length === 0 && <p style={s.emptyChat}>Start the conversation! 👋</p>}
        {messages.map((msg) => {
          const isMine = msg.sender_id === userId;
          return (
            <div key={msg.id} style={{ ...s.msgRow, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{ ...s.bubble, ...(isMine ? s.bubbleMine : s.bubbleTheirs), opacity: msg._pending ? 0.6 : 1 }}>
                <span style={s.bubbleText}>{msg.content}</span>
                <span style={s.bubbleTime}>{formatTime(msg.created_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {sendError && <div style={s.sendErrorBar}>{sendError}</div>}

      <form style={s.inputBar} onSubmit={handleSend}>
        <input
          style={s.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message..."
          autoComplete="off"
        />
        <button style={{ ...s.sendBtn, opacity: text.trim() ? 1 : 0.4 }} type="submit" disabled={!text.trim() || sending}>
          ↑
        </button>
      </form>
    </div>
  );
}

const s = {
  page: { display: 'flex', flexDirection: 'column', height: '100%', background: '#0d0920' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' },
  muted: { color: '#64748b', fontSize: 15 },
  header: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
    background: '#160d2e', borderBottom: '1px solid rgba(139,92,246,0.15)',
    boxShadow: '0 1px 8px rgba(0,0,0,0.3)', flexShrink: 0,
  },
  backBtn: { background: 'none', border: 'none', fontSize: 22, color: '#8b5cf6', cursor: 'pointer', padding: '0 4px', lineHeight: 1, flexShrink: 0 },
  headerInfo: { display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 },
  headerName: { fontSize: 15, fontWeight: 700, color: '#f1f5f9' },
  headerSub: { fontSize: 12, color: '#a78bfa', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  messageList: { flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 6 },
  emptyChat: { textAlign: 'center', color: '#64748b', fontSize: 14, margin: 'auto' },
  msgRow: { display: 'flex' },
  bubble: { maxWidth: '72%', padding: '9px 13px', borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 3 },
  bubbleMine: { background: '#8b5cf6', borderBottomRightRadius: 4, color: '#fff' },
  bubbleTheirs: { background: '#160d2e', borderBottomLeftRadius: 4, border: '1px solid rgba(139,92,246,0.2)', color: '#f1f5f9' },
  bubbleText: { fontSize: 15, lineHeight: 1.45, wordBreak: 'break-word' },
  bubbleTime: { fontSize: 10, opacity: 0.6, alignSelf: 'flex-end' },
  inputBar: { display: 'flex', gap: 8, padding: '10px 12px', background: '#160d2e', borderTop: '1px solid rgba(139,92,246,0.15)', flexShrink: 0 },
  input: { flex: 1, padding: '11px 16px', borderRadius: 24, border: '1.5px solid rgba(139,92,246,0.2)', fontSize: 15, outline: 'none', background: '#1a1035', fontFamily: 'inherit', color: '#f1f5f9' },
  sendErrorBar: { background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 13, padding: '8px 16px', borderTop: '1px solid rgba(239,68,68,0.2)', flexShrink: 0 },
  sendBtn: { width: 44, height: 44, borderRadius: '50%', border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'opacity 0.15s' },
};
