import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MIN_PASSWORD_LENGTH } from '../lib/auth';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Covers remount case: if recovery session already exists when component mounts
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // Covers initial mount case: PASSWORD_RECOVERY fires before session is stored
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < MIN_PASSWORD_LENGTH)  { setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => navigate('/explore'), 2000);
    }
  }

  if (!ready) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.logo}>ProjectMatch</h1>
          <p style={styles.tagline}>Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>ProjectMatch</h1>
        <p style={styles.tagline}>Set a new password</p>

        {done ? (
          <div style={styles.successBox}>
            <p style={styles.successText}>Password updated! Redirecting...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>New password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              required
              autoComplete="new-password"
            />

            <label style={styles.label}>Confirm password</label>
            <input
              style={styles.input}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />

            {error && <p style={styles.error}>{error}</p>}

            <button style={styles.button} type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    background: '#0d0920',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: '#160d2e',
    borderRadius: 20,
    padding: '40px 32px',
    border: '1px solid rgba(139,92,246,0.2)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
  },
  logo: {
    margin: '0 0 4px',
    fontSize: 28,
    fontWeight: 800,
    color: '#a78bfa',
    textAlign: 'center',
  },
  tagline: {
    margin: '0 0 32px',
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#94a3b8',
    marginTop: 8,
  },
  input: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1.5px solid rgba(139,92,246,0.2)',
    fontSize: 15,
    outline: 'none',
    background: '#1a1035',
    color: '#f1f5f9',
    fontFamily: 'inherit',
  },
  error: {
    margin: '4px 0',
    fontSize: 13,
    color: '#f87171',
    background: 'rgba(239,68,68,0.1)',
    padding: '8px 12px',
    borderRadius: 8,
  },
  button: {
    marginTop: 16,
    padding: '13px',
    borderRadius: 10,
    border: 'none',
    background: '#8b5cf6',
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(139,92,246,0.4)',
  },
  successBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  successText: {
    margin: 0,
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 1.6,
    textAlign: 'center',
  },
};
