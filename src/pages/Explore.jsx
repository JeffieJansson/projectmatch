import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const SWIPE_THRESHOLD = 80; // px innan swipe räknas som beslut

export default function Explore() {
  const [projects, setProjects] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'like' | 'skip'

  // Drag-state
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);

  useEffect(() => {
    async function fetchProjects() {
      const { data: { user } } = await supabase.auth.getUser();

      // Hämta projekt som användaren inte redan har swipat på
      const { data: seen } = await supabase
        .from('interests')
        .select('project_id')
        .eq('user_id', user.id);

      const seenIds = (seen || []).map((r) => r.project_id);

      let query = supabase.from('projects').select('*').limit(50);
      if (seenIds.length > 0) {
        query = query.not('id', 'in', `(${seenIds.join(',')})`);
      }

      const { data } = await query;
      setProjects(data || []);
      setLoading(false);
    }

    fetchProjects();
  }, []);

  const current = projects[index];

  // ── Pointer events (fungerar för både mus och touch) ──────────────────────
  function onPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    setOffset({ x: 0, y: 0 });
  }

  function onPointerMove(e) {
    if (!dragging || !dragStart.current) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);

    if (offset.x > SWIPE_THRESHOLD) {
      commitSwipe('like');
    } else if (offset.x < -SWIPE_THRESHOLD) {
      commitSwipe('skip');
    } else {
      // Snap tillbaka
      setOffset({ x: 0, y: 0 });
    }
    dragStart.current = null;
  }

  async function commitSwipe(direction) {
    setFeedback(direction);

    if (direction === 'like' && current) {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('interests').insert({
        user_id: user.id,
        project_id: current.id,
      });
      setSaving(false);
    }

    // Animera kort ut
    setOffset({ x: direction === 'like' ? 600 : -600, y: 0 });

    setTimeout(() => {
      setIndex((i) => i + 1);
      setOffset({ x: 0, y: 0 });
      setFeedback(null);
    }, 300);
  }

  // ── Rotation och opacity baserat på drag ─────────────────────────────────
  const rotate = offset.x * 0.08;
  const likeOpacity = Math.min(Math.max(offset.x / SWIPE_THRESHOLD, 0), 1);
  const skipOpacity = Math.min(Math.max(-offset.x / SWIPE_THRESHOLD, 0), 1);

  const cardStyle = {
    transform: `translateX(${offset.x}px) translateY(${offset.y * 0.3}px) rotate(${rotate}deg)`,
    transition: dragging ? 'none' : 'transform 0.3s ease',
    cursor: dragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    touchAction: 'none',
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.center}>
        <span style={styles.loadingText}>Laddar projekt...</span>
      </div>
    );
  }

  if (!current) {
    return (
      <div style={styles.center}>
        <div style={styles.emptyIcon}>🎉</div>
        <h3 style={styles.emptyTitle}>Du har sett allt!</h3>
        <p style={styles.emptyText}>Kolla tillbaka snart för nya projekt.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Utforska</h1>
        <span style={styles.counter}>{index + 1} / {projects.length}</span>
      </div>

      {/* Kort-stack: nästa kort skymtar bakom */}
      <div style={styles.stack}>
        {projects[index + 1] && (
          <div style={styles.nextCard}>
            <ProjectCard project={projects[index + 1]} />
          </div>
        )}

        {/* Aktivt kort */}
        <div
          style={{ ...styles.activeCard, ...cardStyle }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Like-badge */}
          <div style={{ ...styles.badge, ...styles.likeBadge, opacity: likeOpacity }}>
            INTRESSERAD
          </div>
          {/* Skip-badge */}
          <div style={{ ...styles.badge, ...styles.skipBadge, opacity: skipOpacity }}>
            HOPPA
          </div>

          <ProjectCard project={current} />
        </div>
      </div>

      {/* Knappar */}
      <div style={styles.buttons}>
        <button
          style={{ ...styles.btn, ...styles.skipBtn }}
          onClick={() => commitSwipe('skip')}
          disabled={saving}
          aria-label="Hoppa"
        >
          ✕
        </button>
        <button
          style={{ ...styles.btn, ...styles.likeBtn }}
          onClick={() => commitSwipe('like')}
          disabled={saving}
          aria-label="Intresserad"
        >
          ♥
        </button>
      </div>
    </div>
  );
}

// ── Projektkortet ─────────────────────────────────────────────────────────
function ProjectCard({ project }) {
  const roles = Array.isArray(project.roles_needed)
    ? project.roles_needed
    : typeof project.roles_needed === 'string'
    ? project.roles_needed.split(',').map((r) => r.trim()).filter(Boolean)
    : [];

  return (
    <div style={card.root}>
      {/* Färgad toppbanner */}
      <div style={{ ...card.banner, background: stageColor(project.stage) }}>
        <span style={card.stage}>{stageLabel(project.stage)}</span>
      </div>

      <div style={card.body}>
        <h2 style={card.title}>{project.title}</h2>
        <p style={card.description}>{project.description}</p>

        <div style={card.meta}>
          <MetaChip icon="⏱" label={`${project.hours_per_week ?? '?'} h/vecka`} />
        </div>

        {roles.length > 0 && (
          <div style={card.section}>
            <p style={card.sectionLabel}>Söker</p>
            <div style={card.tags}>
              {roles.map((role) => (
                <span key={role} style={card.tag}>{role}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetaChip({ icon, label }) {
  return (
    <span style={card.chip}>
      {icon} {label}
    </span>
  );
}

// ── Hjälpfunktioner ───────────────────────────────────────────────────────
function stageLabel(stage) {
  const map = {
    idea: 'Idé',
    mvp: 'MVP',
    growth: 'Tillväxt',
    scaling: 'Skalning',
  };
  return map[stage] ?? stage ?? 'Okänt';
}

function stageColor(stage) {
  const map = {
    idea: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    mvp: 'linear-gradient(135deg, #60a5fa, #2563eb)',
    growth: 'linear-gradient(135deg, #34d399, #059669)',
    scaling: 'linear-gradient(135deg, #fbbf24, #d97706)',
  };
  return map[stage] ?? 'linear-gradient(135deg, #9ca3af, #6b7280)';
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '16px 16px 8px',
    boxSizing: 'border-box',
    gap: 12,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#111',
  },
  counter: {
    fontSize: 13,
    color: '#9ca3af',
  },
  stack: {
    flex: 1,
    position: 'relative',
  },
  nextCard: {
    position: 'absolute',
    inset: 0,
    transform: 'scale(0.96) translateY(12px)',
    opacity: 0.7,
    pointerEvents: 'none',
  },
  activeCard: {
    position: 'absolute',
    inset: 0,
  },
  badge: {
    position: 'absolute',
    top: 24,
    zIndex: 10,
    padding: '6px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 1,
    border: '2.5px solid',
    pointerEvents: 'none',
  },
  likeBadge: {
    left: 16,
    color: '#16a34a',
    borderColor: '#16a34a',
    background: 'rgba(240,253,244,0.9)',
    transform: 'rotate(-8deg)',
  },
  skipBadge: {
    right: 16,
    color: '#dc2626',
    borderColor: '#dc2626',
    background: 'rgba(254,242,242,0.9)',
    transform: 'rotate(8deg)',
  },
  buttons: {
    display: 'flex',
    justifyContent: 'center',
    gap: 32,
    paddingBottom: 8,
  },
  btn: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    border: 'none',
    fontSize: 22,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    transition: 'transform 0.15s',
  },
  skipBtn: {
    background: '#fff',
    color: '#ef4444',
  },
  likeBtn: {
    background: '#7c3aed',
    color: '#fff',
  },
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 15,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { margin: 0, fontSize: 20, fontWeight: 700, color: '#111' },
  emptyText: { margin: 0, color: '#9ca3af', fontSize: 14, textAlign: 'center' },
};

const card = {
  root: {
    height: '100%',
    borderRadius: 20,
    background: '#fff',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  banner: {
    height: 120,
    display: 'flex',
    alignItems: 'flex-end',
    padding: '12px 20px',
  },
  stage: {
    background: 'rgba(255,255,255,0.25)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 20,
    letterSpacing: 0.5,
    backdropFilter: 'blur(4px)',
  },
  body: {
    flex: 1,
    padding: '20px 20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    overflowY: 'auto',
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#111',
    lineHeight: 1.2,
  },
  description: {
    margin: 0,
    fontSize: 14,
    color: '#555',
    lineHeight: 1.55,
  },
  meta: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    fontSize: 13,
    color: '#6b7280',
    background: '#f3f4f6',
    padding: '4px 10px',
    borderRadius: 20,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  sectionLabel: {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    fontSize: 13,
    background: '#ede9fe',
    color: '#6d28d9',
    padding: '4px 12px',
    borderRadius: 20,
    fontWeight: 500,
  },
};
