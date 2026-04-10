import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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

    if (password !== confirm) {
      setError('Lösenorden matchar inte.');
      return;
    }
    if (password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
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
        <p style={styles.tagline}>Skapa ditt konto</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Namn</label>
          <input
            style={styles.input}
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Anna Svensson"
            required
            autoComplete="name"
          />

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
            placeholder="Minst 6 tecken"
            required
            autoComplete="new-password"
          />

          <label style={styles.label}>Bekräfta lösenord</label>
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
            {loading ? 'Skapar konto...' : 'Skapa konto'}
          </button>
        </form>

        <p style={styles.footer}>
          Har du redan ett konto?{' '}
          <Link to="/login" style={styles.link}>
            Logga in
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
