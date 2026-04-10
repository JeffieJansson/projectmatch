import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/explore');
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>ProjectMatch</h1>
        <p style={styles.tagline}>Hitta ditt drömteam</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>E-post</label>
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="din@email.com"
            required
            autoComplete="email"
          />

          <label style={styles.label}>Lösenord</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>

        <p style={styles.footer}>
          Inget konto?{' '}
          <Link to="/register" style={styles.link}>
            Registrera dig
          </Link>
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
    background: '#f9f9fb',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: '#fff',
    borderRadius: 16,
    padding: '40px 32px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  logo: {
    margin: '0 0 4px',
    fontSize: 28,
    fontWeight: 700,
    color: '#7c3aed',
    textAlign: 'center',
  },
  tagline: {
    margin: '0 0 32px',
    fontSize: 14,
    color: '#888',
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
    color: '#444',
    marginTop: 8,
  },
  input: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1.5px solid #e5e7eb',
    fontSize: 15,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    margin: '4px 0',
    fontSize: 13,
    color: '#ef4444',
    background: '#fef2f2',
    padding: '8px 12px',
    borderRadius: 8,
  },
  button: {
    marginTop: 16,
    padding: '13px',
    borderRadius: 10,
    border: 'none',
    background: '#7c3aed',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 14,
    color: '#888',
  },
  link: {
    color: '#7c3aed',
    fontWeight: 600,
    textDecoration: 'none',
  },
};
