import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [visible, setVisible] = useState(!navigator.onLine);

  useEffect(() => {
    function handleOffline() {
      setOffline(true);
      setVisible(true);
    }

    function handleOnline() {
      setOffline(false);
      // Keep banner visible briefly to show "back online" state, then hide
      setTimeout(() => setVisible(false), 2000);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!visible) return null;

  return (
    <div style={{ ...s.banner, ...(offline ? s.offline : s.online) }}>
      {offline ? '⚠ No internet connection' : '✓ Back online'}
    </div>
  );
}

const s = {
  banner: {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 480,
    zIndex: 9999,
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  offline: {
    background: '#7f1d1d',
    color: '#fca5a5',
    borderBottom: '1px solid rgba(248,113,113,0.3)',
  },
  online: {
    background: '#14532d',
    color: '#86efac',
    borderBottom: '1px solid rgba(74,222,128,0.3)',
  },
};
