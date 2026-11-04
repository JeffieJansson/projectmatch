import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';

const SWIPE_THRESHOLD = 80; // px before swipe counts as a decision

export default function Explore() {
  const [projects, setProjects] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Drag-state
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        const { data: profile } = await supabase
          .from('profiles')
          .select('roles')
          .eq('id', user.id)
          .single();
        const userRoles = new Set(
          (Array.isArray(profile?.roles) ? profile.roles : []).map((r) => r.toLowerCase())
        );

        // Every project the user has swiped on (right or left) is hidden
        const { data: seen, error: seenError } = await supabase
          .from('swipes')
          .select('project_id')
          .eq('user_id', user.id);
        if (seenError) throw seenError;

        const seenIds = (seen || []).map((r) => r.project_id);

        let query = supabase
          .from('projects')
          .select('*, profiles!creator_id(full_name, avatar_url, tagline)')
          .neq('creator_id', user.id)
          .limit(50);
        if (seenIds.length > 0) {
          query = query.not('id', 'in', `(${seenIds.join(',')})`);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        const fetched = data || [];

        if (userRoles.size > 0) {
          fetched.sort((a, b) => {
            const rolesA = Array.isArray(a.roles_needed) ? a.roles_needed : (a.roles_needed || '').split(',').map((r) => r.trim()).filter(Boolean);
            const rolesB = Array.isArray(b.roles_needed) ? b.roles_needed : (b.roles_needed || '').split(',').map((r) => r.trim()).filter(Boolean);
            const matchA = rolesA.some((r) => userRoles.has(r.toLowerCase())) ? 0 : 1;
            const matchB = rolesB.some((r) => userRoles.has(r.toLowerCase())) ? 0 : 1;
            return matchA - matchB;
          });
        }

        setProjects(fetched);
      } catch {
        setError('Could not load projects. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  const current = projects[index];

  // ── Pointer events (works with mouse and touch) ──────────────────────
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
      // Snap back
      setOffset({ x: 0, y: 0 });
    }
    dragStart.current = null;
  }

  async function commitSwipe(direction) {
    if (!current || saving) return;

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Record the swipe (both directions) so the project never reappears in the feed
    const { error: swipeError } = await supabase
      .from('swipes')
      .upsert(
        { user_id: user.id, project_id: current.id },
        { onConflict: 'user_id,project_id', ignoreDuplicates: true }
      );
    if (swipeError) console.error('Failed to save swipe:', swipeError);

    // A right swipe also sends an interest request to the project owner
    if (direction === 'like') {
      const { error: interestError } = await supabase.from('interests').insert({
        user_id: user.id,
        project_id: current.id,
      });
      if (interestError) console.error('Failed to save interest:', interestError);
    }
    setSaving(false);

    // Animate card out
    setOffset({ x: direction === 'like' ? 600 : -600, y: 0 });

    setTimeout(() => {
      setIndex((i) => i + 1);
      setOffset({ x: 0, y: 0 });
    }, 300);
  }

  // ── Rotation and opacity based on drag ───────────────────────────────────
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
        <span style={styles.loadingText}>Loading projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.center}>
        <p style={styles.errorText}>{error}</p>
      </div>
    );
  }

  if (!current) {
    return (
      <div style={styles.center}>
        <div style={styles.emptyIcon}>🎉</div>
        <h3 style={styles.emptyTitle}>You've seen everything!</h3>
        <p style={styles.emptyText}>Check back soon for new projects.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Explore</h1>
        <span style={styles.counter}>{index + 1} / {projects.length}</span>
      </div>

      {/* card-stack*/}
      <div style={styles.stack}>
        {projects[index + 1] && (
          <div style={styles.nextCard}>
            <ProjectCard project={projects[index + 1]} />
          </div>
        )}

        {/* Active card */}
        <div
          style={{ ...styles.activeCard, ...cardStyle }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Like-badge */}
          <div style={{ ...styles.badge, ...styles.likeBadge, opacity: likeOpacity }}>
            INTERESTED
          </div>
          {/* Skip-badge */}
          <div style={{ ...styles.badge, ...styles.skipBadge, opacity: skipOpacity }}>
            SKIP
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
          aria-label="Skip"
        >
          ✕
        </button>
        <button
          style={{ ...styles.btn, ...styles.likeBtn }}
          onClick={() => commitSwipe('like')}
          disabled={saving}
          aria-label="Interested"
        >
          ♥
        </button>
      </div>
    </div>
  );
}

// ── Project Card ─────────────────────────────────────────────────────────
function ProjectCard({ project }) {
  const roles = Array.isArray(project.roles_needed)
    ? project.roles_needed
    : typeof project.roles_needed === 'string'
    ? project.roles_needed.split(',').map((r) => r.trim()).filter(Boolean)
    : [];

  const owner = project.profiles;

  return (
    <div style={card.root}>
      {/* Colored top banner */}
      <div style={{ ...card.banner, background: stageColor(project.stage) }}>
        <span style={card.stage}>{stageLabel(project.stage)}</span>
      </div>

      <div style={card.body}>
        <h2 style={card.title}>{project.title}</h2>
        <p style={card.description}>{project.description}</p>

        <div style={card.meta}>
          <MetaChip icon="⏱" label={`${project.hours_per_week ?? '?'} h/week`} />
        </div>

        {roles.length > 0 && (
          <div style={card.section}>
            <p style={card.sectionLabel}>Looking for</p>
            <div style={card.tags}>
              {roles.map((role) => (
                <span key={role} style={card.tag}>{role}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Owner row */}
      {owner && (
        <div style={card.ownerRow}>
          <Avatar avatarUrl={owner.avatar_url} name={owner.full_name} size={30} />
          <div style={card.ownerInfo}>
            <span style={card.ownerName}>{owner.full_name || 'Unknown'}</span>
            {owner.tagline && <span style={card.ownerTagline}>{owner.tagline}</span>}
          </div>
        </div>
      )}
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

// ── Helper functions ───────────────────────────────────────────────────────
function stageLabel(stage) {
  const map = {
    idea: 'Idea',
    mvp: 'MVP',
    growth: 'Growth',
    scaling: 'Scaling',
  };
  return map[stage] ?? stage ?? 'Unknown';
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
    color: '#f1f5f9',
  },
  counter: {
    fontSize: 13,
    color: '#64748b',
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
    color: '#4ade80',
    borderColor: '#4ade80',
    background: 'rgba(74,222,128,0.1)',
    transform: 'rotate(-8deg)',
  },
  skipBadge: {
    right: 16,
    color: '#f87171',
    borderColor: '#f87171',
    background: 'rgba(248,113,113,0.1)',
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
    background: '#1a1035',
    color: '#f87171',
    border: '1.5px solid rgba(248,113,113,0.3)',
  },
  likeBtn: {
    background: '#8b5cf6',
    color: '#fff',
    boxShadow: '0 4px 14px rgba(139,92,246,0.4)',
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
    color: '#64748b',
    fontSize: 15,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 1.6,
    margin: 0,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9' },
  emptyText: { margin: 0, color: '#64748b', fontSize: 14, textAlign: 'center' },
};

const card = {
  root: {
    height: '100%',
    borderRadius: 20,
    background: '#160d2e',
    border: '1px solid rgba(139,92,246,0.15)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
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
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#f1f5f9',
    lineHeight: 1.2,
    textAlign: 'center',
  },
  description: {
    margin: 0,
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1.55,
    textAlign: 'center',
  },
  meta: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chip: {
    fontSize: 13,
    color: '#94a3b8',
    background: '#1a1035',
    padding: '4px 10px',
    borderRadius: 20,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    alignItems: 'center',
    width: '100%',
  },
  sectionLabel: {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  tag: {
    fontSize: 13,
    background: '#2d1b69',
    color: '#c4b5fd',
    padding: '4px 12px',
    borderRadius: 20,
    fontWeight: 500,
  },
  ownerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 20px 14px',
    borderTop: '1px solid rgba(139,92,246,0.12)',
    flexShrink: 0,
  },
  ownerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: 0,
  },
  ownerName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#c4b5fd',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  ownerTagline: {
    fontSize: 11,
    color: '#64748b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
