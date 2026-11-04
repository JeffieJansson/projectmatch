import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmDialog from '../components/ConfirmDialog';

// Returns the first Supabase error (or null) so the caller can show it
async function deleteProject(id) {
  const { error: interestsError } = await supabase.from('interests').delete().eq('project_id', id);
  const { data: deletedProjects, error: projectError } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .select('id');
  if (!projectError && (!deletedProjects || deletedProjects.length === 0)) {
    // No error but nothing deleted – typically blocked by an RLS policy
    return new Error('Could not delete the project. You may not have permission.');
  }
  return projectError || interestsError || null;
}

const STAGE_LABEL = { idea: 'Idea', mvp: 'MVP', beta: 'Beta', growth: 'Growth', scaling: 'Scaling' };
const STAGE_COLOR = {
  idea:    { bg: '#2d1b69', color: '#c4b5fd' },
  mvp:     { bg: '#0c2a4a', color: '#60a5fa' },
  beta:    { bg: '#052e16', color: '#4ade80' },
  growth:  { bg: '#2d1a00', color: '#fbbf24' },
  scaling: { bg: '#2d0a0a', color: '#f87171' },
};

export default function MyProjects() {
  const [tab, setTab]           = useState('projects'); // 'projects' | 'requests'
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [userId, setUserId]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [reqCount, setReqCount] = useState(0);
  const [error, setError]       = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user.id);
        await Promise.all([loadProjects(user.id), loadRequests(user.id)]);
      } catch {
        setError('Could not load projects. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function loadProjects(uid) {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('creator_id', uid)
      .order('created_at', { ascending: false });
    setProjects(data || []);
  }

  async function loadRequests(uid) {
    // Fetch all projects belonging to the user
    const { data: myProjects } = await supabase
      .from('projects')
      .select('id, title')
      .eq('creator_id', uid);

    if (!myProjects || myProjects.length === 0) {
      setRequests([]);
      setReqCount(0);
      return;
    }

    const projectIds = myProjects.map((p) => p.id);
    const projectMap = Object.fromEntries(myProjects.map((p) => [p.id, p.title]));

    // Fetch interests + join with profiles (safe fields only)
    const [{ data: interests }, { data: existingMatches }] = await Promise.all([
      supabase
        .from('interests')
        .select('id, user_id, project_id, created_at, profiles(full_name, tagline, roles)')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('matches')
        .select('project_id, requester_id')
        .in('project_id', projectIds),
    ]);

    // Exclude interests that already resulted in a match (same project + same user)
    const matched = new Set(
      (existingMatches || []).map((m) => `${m.project_id}:${m.requester_id}`)
    );
    const pending = (interests || []).filter(
      (i) => !matched.has(`${i.project_id}:${i.user_id}`)
    );

    const enriched = pending.map((r) => ({
      ...r,
      projectTitle: projectMap[r.project_id] || 'Unknown project',
    }));

    setRequests(enriched);
    setReqCount(enriched.length);
  }

  async function handleMatch(interest) {
    // Create row in matches
    const { error: insertError } = await supabase.from('matches').insert({
      project_id:    interest.project_id,
      requester_id:  interest.user_id,
      owner_id:      userId,
    });
    if (insertError) {
      console.error('Failed to create match:', insertError);
      return; // keep the request in the list so the user can retry
    }

    // Remove from interests. .select() returns the deleted rows, so a delete
    // silently blocked by RLS (no error, 0 rows) can be detected too.
    const { data: deleted, error: deleteError } = await supabase
      .from('interests')
      .delete()
      .eq('id', interest.id)
      .select('id');
    if (deleteError) {
      console.error('Match created, but failed to delete interest row:', deleteError);
    } else if (!deleted || deleted.length === 0) {
      console.error(
        `Match created, but interest row ${interest.id} was not deleted (0 rows affected – likely blocked by RLS delete policy on interests).`
      );
    }

    // The match exists, so the request is no longer pending either way
    setRequests((prev) => prev.filter((r) => r.id !== interest.id));
    setReqCount((c) => c - 1);
  }

  async function handleDismiss(interestId) {
    await supabase.from('interests').delete().eq('id', interestId);
    setRequests((prev) => prev.filter((r) => r.id !== interestId));
    setReqCount((c) => c - 1);
  }

  if (loading) {
    return <div style={s.center}><span style={s.muted}>Loading...</span></div>;
  }

  if (error) {
    return <div style={s.center}><span style={{ color: '#f87171', fontSize: 14, textAlign: 'center' }}>{error}</span></div>;
  }

  return (
    <div style={s.page}>
      <div style={s.headerRow}>
        <h1 style={s.heading}>Projects</h1>
        <button style={s.createBtn} onClick={() => navigate('/create')}>+ New project</button>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        <button
          style={{ ...s.tab, ...(tab === 'projects' ? s.tabActive : {}) }}
          onClick={() => setTab('projects')}
        >
          My Projects
          <span style={{ ...s.badge, ...(tab === 'projects' ? s.badgeActive : {}) }}>
            {projects.length}
          </span>
        </button>
        <button
          style={{ ...s.tab, ...(tab === 'requests' ? s.tabActive : {}) }}
          onClick={() => setTab('requests')}
        >
          Requests
          {reqCount > 0 && (
            <span style={{ ...s.badge, ...s.badgePing }}>
              {reqCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {tab === 'projects' ? (
        <ProjectsList
          projects={projects}
          onDeleted={(id) => setProjects((prev) => prev.filter((p) => p.id !== id))}
        />
      ) : (
        <RequestsList
          requests={requests}
          onMatch={handleMatch}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}

// ─── My Projects ──────────────────────────────────────────────────────────
function ProjectsList({ projects, onDeleted }) {
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null); // project awaiting confirmation
  const [deleteError, setDeleteError] = useState(null);

  if (projects.length === 0) {
    return (
      <div style={s.empty}>
        <span style={s.emptyIcon}>📁</span>
        <p style={s.emptyTitle}>No projects yet</p>
        <p style={s.emptyText}>Tap “+ New project” to publish your first project.</p>
      </div>
    );
  }

  function handleDelete(p) {
    setDeleteError(null);
    setPendingDelete(p);
  }

  function closeDeleteDialog() {
    setPendingDelete(null);
    setDeleteError(null);
  }

  async function confirmDelete() {
    const p = pendingDelete;
    if (!p) return;
    setDeleteError(null);
    setDeletingId(p.id);
    const error = await deleteProject(p.id);
    setDeletingId(null);

    if (error) {
      console.error(`Failed to delete project ${p.id}:`, error);
      setDeleteError(error.message || 'Could not delete the project.');
      return; // keep the dialog open so the user sees what went wrong
    }

    closeDeleteDialog();
    onDeleted(p.id);
  }

  return (
    <div style={s.list}>
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete project?"
        message={`This will permanently delete “${pendingDelete?.title ?? ''}” together with its requests and matches. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loadingLabel="Deleting..."
        danger
        loading={!!pendingDelete && deletingId === pendingDelete.id}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={closeDeleteDialog}
      />

      {projects.map((p) => {
        const sc = STAGE_COLOR[p.stage] || { bg: '#f3f4f6', color: '#6b7280' };
        const roles = Array.isArray(p.roles_needed)
          ? p.roles_needed
          : (p.roles_needed || '').split(',').map((r) => r.trim()).filter(Boolean);
        const isDeleting = deletingId === p.id;

        return (
          <div key={p.id} style={s.card}>
            <div style={s.cardTop}>
              <h2 style={s.cardTitle}>{p.title}</h2>
              <span style={{ ...s.stageChip, background: sc.bg, color: sc.color }}>
                {STAGE_LABEL[p.stage] ?? p.stage}
              </span>
            </div>

            {p.description && (
              <p style={s.cardDesc}>{p.description}</p>
            )}

            <div style={s.cardMeta}>
              {p.hours_per_week && (
                <span style={s.metaChip}>⏱ {p.hours_per_week}h/wk</span>
              )}
            </div>

            {roles.length > 0 && (
              <div style={s.roles}>
                {roles.map((r) => (
                  <span key={r} style={s.roleChip}>{r}</span>
                ))}
              </div>
            )}

            <div style={s.cardActions}>
              <button
                style={s.editBtn}
                onClick={() => navigate(`/edit-project/${p.id}`)}
                disabled={isDeleting}
              >
                Edit
              </button>
              <button
                style={{ ...s.deleteBtn, opacity: isDeleting ? 0.5 : 1 }}
                onClick={() => handleDelete(p)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Requests ─────────────────────────────────────────────────────────────
function RequestsList({ requests, onMatch, onDismiss }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null); // id of ongoing action

  if (requests.length === 0) {
    return (
      <div style={s.empty}>
        <span style={s.emptyIcon}>💌</span>
        <p style={s.emptyTitle}>No requests</p>
        <p style={s.emptyText}>When someone swipes right on your projects they'll appear here.</p>
      </div>
    );
  }

  async function act(fn, id) {
    setBusy(id);
    await fn();
    setBusy(null);
  }

  return (
    <div style={s.list}>
      {requests.map((req) => {
        const profile  = req.profiles || {};
        const name     = profile.full_name || 'Unknown user';
        const tagline  = profile.tagline   || null;
        const roles    = Array.isArray(profile.roles) ? profile.roles : [];
        const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
        const isBusy   = busy === req.id;

        return (
          <div key={req.id} style={s.reqCard}>
            {/* Project label */}
            <div style={s.reqProject}>
              <span style={s.reqProjectDot} />
              {req.projectTitle}
            </div>

            {/* Person */}
            <div style={s.reqPerson}>
              <div style={s.avatar} onClick={() => navigate(`/profile/${req.user_id}`)} role="button">
                {initials}
              </div>
              <div style={s.reqInfo}>
                <span style={s.reqName} onClick={() => navigate(`/profile/${req.user_id}`)} role="button">
                  {name}
                </span>
                {tagline && <span style={s.reqTagline}>{tagline}</span>}
                {roles.length > 0 && (
                  <div style={s.reqRoles}>
                    {roles.slice(0, 3).map((r) => (
                      <span key={r} style={s.reqRoleChip}>{r}</span>
                    ))}
                    {roles.length > 3 && (
                      <span style={s.reqRoleChip}>+{roles.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={s.reqActions}>
              <button
                style={{ ...s.dismissBtn, opacity: isBusy ? 0.5 : 1 }}
                onClick={() => act(() => onDismiss(req.id), req.id)}
                disabled={isBusy}
              >
                Decline
              </button>
              <button
                style={{ ...s.matchBtn, opacity: isBusy ? 0.5 : 1 }}
                onClick={() => act(() => onMatch(req), req.id)}
                disabled={isBusy}
              >
                ♥ Match
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
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
  muted: { color: '#64748b', fontSize: 15 },
  heading: { margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  createBtn: {
    background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 20,
    padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },

  // Tabs
  tabs: { display: 'flex', borderBottom: '2px solid rgba(139,92,246,0.15)', gap: 0 },
  tab: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 7, padding: '10px 8px', background: 'none', border: 'none',
    borderBottom: '2px solid transparent', marginBottom: -2,
    fontSize: 14, fontWeight: 600, color: '#4a3a6e', cursor: 'pointer',
  },
  tabActive: { color: '#a78bfa', borderBottom: '2px solid #8b5cf6' },
  badge: { padding: '2px 7px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#1a1035', color: '#64748b' },
  badgeActive: { background: '#2d1b69', color: '#a78bfa' },
  badgePing: { background: '#8b5cf6', color: '#fff' },

  // List
  list: { display: 'flex', flexDirection: 'column', gap: 12 },

  // Project card
  card: {
    background: '#160d2e', borderRadius: 16, padding: '16px',
    border: '1px solid rgba(139,92,246,0.15)',
    boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { margin: 0, fontSize: 17, fontWeight: 700, color: '#f1f5f9', flex: 1 },
  stageChip: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, flexShrink: 0 },
  cardDesc: {
    margin: 0, fontSize: 14, color: '#94a3b8', lineHeight: 1.5,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  cardMeta: { display: 'flex', gap: 8 },
  metaChip: { fontSize: 12, color: '#64748b', background: '#1a1035', padding: '4px 10px', borderRadius: 20 },
  roles: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  roleChip: { fontSize: 12, background: '#2d1b69', color: '#c4b5fd', padding: '3px 10px', borderRadius: 20, fontWeight: 500 },

  // Request card
  reqCard: {
    background: '#160d2e', borderRadius: 16, padding: '16px',
    border: '1px solid rgba(139,92,246,0.15)',
    boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  reqProject: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#a78bfa' },
  reqProjectDot: { width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 },
  reqPerson: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  avatar: {
    width: 46, height: 46, borderRadius: '50%',
    background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    color: '#fff', fontSize: 16, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, cursor: 'pointer',
  },
  reqInfo: { display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 },
  reqName: { fontSize: 16, fontWeight: 700, color: '#f1f5f9', cursor: 'pointer' },
  reqTagline: { fontSize: 13, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  reqRoles: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  reqRoleChip: { fontSize: 11, background: '#1a1035', color: '#64748b', padding: '2px 8px', borderRadius: 20, fontWeight: 500 },
  reqActions: { display: 'flex', gap: 8 },
  dismissBtn: {
    flex: 1, padding: '10px', borderRadius: 10,
    border: '1.5px solid rgba(139,92,246,0.2)', background: '#1a1035',
    color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  matchBtn: {
    flex: 2, padding: '10px', borderRadius: 10, border: 'none',
    background: '#8b5cf6', color: '#fff', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', boxShadow: '0 4px 12px rgba(139,92,246,0.4)',
  },

  // Empty state
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { margin: 0, fontSize: 17, fontWeight: 700, color: '#f1f5f9' },
  emptyText: { margin: 0, fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 1.5 },

  // Card actions
  cardActions: { display: 'flex', gap: 8, marginTop: 4, justifyContent: 'flex-end' },
  editBtn: {
    padding: '6px 14px', borderRadius: 8,
    border: '1.5px solid rgba(139,92,246,0.2)', background: '#1a1035',
    color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  deleteBtn: {
    padding: '6px 14px', borderRadius: 8,
    border: '1.5px solid rgba(248,113,113,0.3)', background: '#1a1035',
    color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
};
