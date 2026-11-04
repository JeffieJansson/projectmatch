import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { clearNotificationStore } from '../lib/notificationStore';
import { MIN_PASSWORD_LENGTH } from '../lib/auth';
import ConfirmDialog from '../components/ConfirmDialog';

const DELETE_WORD = 'DELETE';
// Fallback extensions if listing the bucket isn't permitted
const AVATAR_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'avif'];

// Avatars are uploaded as `${userId}.${ext}` in the root of the 'avatars' bucket.
async function removeAvatarFiles(userId, avatarUrl) {
  const bucket = supabase.storage.from('avatars');
  const paths = new Set(AVATAR_EXTENSIONS.map((ext) => `${userId}.${ext}`));

  // Exact file names, if the user is allowed to list them
  const { data: listed, error: listError } = await bucket.list('', { search: userId });
  if (listError) {
    console.warn('Could not list avatar files, falling back to known extensions:', listError);
  } else {
    (listed || []).forEach((f) => { if (f.name.startsWith(userId)) paths.add(f.name); });
  }

  // The path from the stored public URL, if it points at this bucket
  const marker = '/storage/v1/object/public/avatars/';
  if (avatarUrl && avatarUrl.includes(marker)) {
    const path = decodeURIComponent(avatarUrl.split(marker)[1].split('?')[0]);
    if (path.startsWith(userId)) paths.add(path);
  }

  // Removing files that don't exist is not an error in Supabase Storage
  const { error } = await bucket.remove([...paths]);
  return error;
}

export default function Settings() {
  const navigate = useNavigate();

  // Change password
  const [pwOpen, setPwOpen]         = useState(false);
  const [password, setPassword]     = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwError, setPwError]       = useState('');
  const [pwSuccess, setPwSuccess]   = useState('');

  // Delete account
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [deleteText, setDeleteText]   = useState('');
  const [deleting, setDeleting]       = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  async function handleChangePassword(ev) {
    ev.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setPwError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPw) {
      setPwError('Passwords do not match.');
      return;
    }

    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPwSaving(false);

    if (error) {
      console.error('Failed to change password:', error);
      setPwError(error.message || 'Could not change your password.');
      return;
    }
    setPassword('');
    setConfirmPw('');
    setPwSuccess('Your password has been changed.');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  function openDelete() {
    setDeleteText('');
    setDeleteError(null);
    setDeleteOpen(true);
  }

  function closeDelete() {
    setDeleteOpen(false);
    setDeleteText('');
    setDeleteError(null);
  }

  async function handleDeleteAccount() {
    if (deleteText !== DELETE_WORD) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error('You are not signed in.');

      // a) Profile picture in Storage
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      const storageError = await removeAvatarFiles(user.id, profile?.avatar_url);
      if (storageError) throw storageError;

      // b) Delete the account and all its data on the server
      const { error: rpcError } = await supabase.rpc('delete_my_account');
      if (rpcError) throw rpcError;
    } catch (err) {
      // d) Keep everything local intact and show the error in the dialog
      console.error('Failed to delete account:', err);
      setDeleteError(err?.message || 'Could not delete your account. Please try again.');
      setDeleting(false);
      return;
    }

    // c) Success: sign out and clear local app state
    await supabase.auth.signOut();
    clearNotificationStore();
    navigate('/login', { replace: true });
  }

  return (
    <div style={s.page}>
      <button style={s.back} onClick={() => navigate('/profile')}>← Back</button>
      <h1 style={s.heading}>Settings</h1>

      {/* Legal */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Legal</h2>
        <div style={s.group}>
          <Link to="/privacy" style={s.row}>
            <span>Privacy Policy</span>
            <span style={s.chevron}>›</span>
          </Link>
          <Link to="/terms" style={{ ...s.row, ...s.rowLast }}>
            <span>Terms of Service</span>
            <span style={s.chevron}>›</span>
          </Link>
        </div>
      </section>

      {/* Account */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Account</h2>
        <div style={s.group}>
          <button
            type="button"
            style={s.row}
            onClick={() => { setPwOpen((o) => !o); setPwError(''); setPwSuccess(''); }}
            aria-expanded={pwOpen}
          >
            <span>Change password</span>
            <span style={{ ...s.chevron, transform: pwOpen ? 'rotate(90deg)' : 'none' }}>›</span>
          </button>

          {pwOpen && (
            <form onSubmit={handleChangePassword} style={s.pwForm}>
              <label style={s.label} htmlFor="new-password">New password</label>
              <input
                id="new-password"
                style={s.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                minLength={MIN_PASSWORD_LENGTH}
                required
                autoComplete="new-password"
              />
              <label style={s.label} htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                style={s.input}
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="••••••••"
                minLength={MIN_PASSWORD_LENGTH}
                required
                autoComplete="new-password"
              />

              {pwError && <p role="alert" style={s.error}>{pwError}</p>}
              {pwSuccess && <p role="status" style={s.success}>✓ {pwSuccess}</p>}

              <button style={{ ...s.primaryBtn, opacity: pwSaving ? 0.6 : 1 }} type="submit" disabled={pwSaving}>
                {pwSaving ? 'Saving...' : 'Save new password'}
              </button>
            </form>
          )}

          <button type="button" style={{ ...s.row, ...s.rowLast }} onClick={handleLogout}>
            <span>Log out</span>
            <span style={s.chevron}>›</span>
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section style={{ ...s.section, ...s.dangerSection }}>
        <h2 style={{ ...s.sectionTitle, ...s.dangerTitle }}>Danger zone</h2>
        <div style={s.dangerBox}>
          <p style={s.dangerText}>
            Permanently delete your account and all of your data.
          </p>
          <button type="button" style={s.dangerBtn} onClick={openDelete}>
            Delete account
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete your account?"
        message="This permanently deletes your profile, your projects, your requests, matches and messages. This cannot be undone."
        confirmLabel="Delete account"
        cancelLabel="Cancel"
        loadingLabel="Deleting..."
        danger
        loading={deleting}
        error={deleteError}
        confirmDisabled={deleteText !== DELETE_WORD}
        onConfirm={handleDeleteAccount}
        onCancel={closeDelete}
      >
        <label style={s.label} htmlFor="delete-confirm">
          Type <strong style={s.deleteWord}>{DELETE_WORD}</strong> to confirm
        </label>
        <input
          id="delete-confirm"
          style={s.input}
          type="text"
          value={deleteText}
          onChange={(e) => setDeleteText(e.target.value)}
          disabled={deleting}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
      </ConfirmDialog>
    </div>
  );
}

const s = {
  page: { padding: '24px 16px 48px', display: 'flex', flexDirection: 'column', gap: 20 },
  back: {
    alignSelf: 'flex-start', background: 'none', border: 'none', color: '#a78bfa',
    fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0,
  },
  heading: { margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' },
  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  sectionTitle: {
    margin: 0, fontSize: 13, fontWeight: 600, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  group: {
    background: '#160d2e',
    border: '1px solid rgba(139,92,246,0.15)',
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '14px 16px',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid rgba(139,92,246,0.12)',
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: 500,
    textAlign: 'left',
    textDecoration: 'none',
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'inherit',
  },
  rowLast: { borderBottom: 'none' },
  chevron: { fontSize: 20, color: '#4a3a6e', lineHeight: 1, transition: 'none' },
  pwForm: {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: '4px 16px 16px',
    borderBottom: '1px solid rgba(139,92,246,0.12)',
  },
  label: { fontSize: 13, fontWeight: 600, color: '#94a3b8' },
  input: {
    padding: '12px 14px', borderRadius: 10, border: '1.5px solid rgba(139,92,246,0.2)', fontSize: 15,
    outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', color: '#f1f5f9', background: '#1a1035',
  },
  error: { margin: 0, fontSize: 13, color: '#f87171', background: 'rgba(239,68,68,0.1)', padding: '10px 14px', borderRadius: 8 },
  success: { margin: 0, fontSize: 13, color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '10px 14px', borderRadius: 8 },
  primaryBtn: {
    marginTop: 4, padding: '12px', borderRadius: 12, border: 'none', background: '#8b5cf6',
    color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
  dangerSection: { marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(248,113,113,0.2)' },
  dangerTitle: { color: '#f87171' },
  dangerBox: {
    display: 'flex', flexDirection: 'column', gap: 12, padding: 16,
    background: '#160d2e', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 16,
  },
  dangerText: { margin: 0, fontSize: 14, color: '#94a3b8', lineHeight: 1.5 },
  dangerBtn: {
    alignSelf: 'flex-start', padding: '10px 18px', borderRadius: 10,
    border: '1.5px solid rgba(248,113,113,0.4)', background: '#1a1035',
    color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  deleteWord: { color: '#f1f5f9', letterSpacing: 0.5 },
};
