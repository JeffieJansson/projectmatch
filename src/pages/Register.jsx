import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MIN_PASSWORD_LENGTH } from '../lib/auth';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < MIN_PASSWORD_LENGTH)  { setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`); return; }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    navigate('/explore');
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>ProjectMatch</h1>
        <p style={styles.tagline}>Create your account</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Name</label>
          <input style={styles.input} type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" required autoComplete="name" />

          <label style={styles.label}>Email</label>
          <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required autoComplete="email" />

          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} required autoComplete="new-password" />

          <label style={styles.label}>Confirm password</label>
          <input style={styles.input} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required autoComplete="new-password" />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={styles.legal}>
          By registering you agree to our{' '}
          <Link to="/terms" style={styles.link}>Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" style={styles.link}>Privacy Policy</Link>.
        </p>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Log in</Link>
        </p>
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
  legal: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
    lineHeight: 1.6,
  },
  footer: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    color: '#64748b',
  },
  link: {
    color: '#a78bfa',
    fontWeight: 600,
    textDecoration: 'none',
  },
};
