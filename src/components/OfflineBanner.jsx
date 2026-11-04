// ─── Imports ───────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';

// ─── Component ─────────────────────────────────────────────
export default function OfflineBanner() {
  // ─── State ───────────────────────────────────────────────
  const [offline, setOffline] = useState(!navigator.onLine);
  const [visible, setVisible] = useState(!navigator.onLine);

  // Holds the timer that hides the banner after reconnecting
  const hideTimer = useRef(null);

  // ─── Connection listeners ────────────────────────────────
  useEffect(() => {
    function handleOffline() {
      // Cancel a pending hide so the new offline banner is not hidden early
      clearTimeout(hideTimer.current);
      setOffline(true);
      setVisible(true);
    }

    function handleOnline() {
      setOffline(false);
      // Show the "back online" state briefly, then hide the banner
      hideTimer.current = setTimeout(() => setVisible(false), 2000);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      clearTimeout(hideTimer.current);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // ─── Render ──────────────────────────────────────────────
  if (!visible) return null;

  return (
    <div style={{ ...s.banner, ...(offline ? s.offline : s.online) }}>
      {offline ? '⚠ No internet connection' : '✓ Back online'}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────
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