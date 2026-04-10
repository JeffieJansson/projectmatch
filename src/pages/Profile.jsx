import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Profile() {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Profil</h2>

      <button style={styles.logoutButton} onClick={handleLogout}>
        Logga ut
      </button>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  heading: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#111',
  },
  logoutButton: {
    padding: '13px',
    borderRadius: 10,
    border: '1.5px solid #e5e7eb',
    background: '#fff',
    color: '#ef4444',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    alignSelf: 'stretch',
  },
};
