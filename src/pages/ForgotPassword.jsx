import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>ProjectMatch</h1>
        <p style={styles.tagline}>Reset your password</p>

        {sent ? (
          <div style={styles.successBox}>
            <p style={styles.successText}>
              We've sent a reset link to <strong>{email}</strong>. Check your inbox.
            </p>
            <Link to="/login" style={styles.backLink}>← Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>Email address</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />

            {error && <p style={styles.error}>{error}</p>}

            <button style={styles.button} type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>

            <Link to="/login" style={styles.backLink}>← Back to login</Link>
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
    gap: 20,
    alignItems: 'center',
  },
  successText: {
    margin: 0,
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 1.6,
    textAlign: 'center',
  },
  backLink: {
    fontSize: 14,
    color: '#64748b',
    textDecoration: 'none',
    textAlign: 'center',
    display: 'block',
    marginTop: 8,
  },
};
