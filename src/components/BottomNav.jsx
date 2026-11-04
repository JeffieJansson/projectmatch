import { NavLink } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

const tabs = [
  {
    to: '/explore',
    label: 'Explore',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    to: '/matches',
    label: 'Matches',
    badgeKey: 'matches',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    to: '/my-projects',
    label: 'Projects',
    badgeKey: 'requests',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
  {
    to: '/messages',
    label: 'Messages',
    badgeKey: 'unread',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const { requestCount, newMatchCount, unreadCount } = useNotifications();

  const badgeCounts = {
    matches: newMatchCount,
    requests: requestCount,
    unread: unreadCount,
  };

  return (
    <nav style={styles.nav}>
      {tabs.map((tab) => {
        const count = tab.badgeKey ? (badgeCounts[tab.badgeKey] || 0) : 0;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            style={({ isActive }) => ({
              ...styles.tab,
              color: isActive ? '#a78bfa' : '#4a3a6e',
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{ display: 'flex', position: 'relative' }}>
                  {isActive && <span style={styles.activeDot} />}
                  {tab.icon}
                  {count > 0 && (
                    <span style={styles.badge}>
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </span>
                <span style={{ ...styles.label, fontWeight: isActive ? 600 : 400 }}>
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    borderTop: '1px solid rgba(139,92,246,0.15)',
    background: '#160d2e',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: '10px 0 8px',
    textDecoration: 'none',
    fontSize: 11,
    transition: 'color 0.15s',
  },
  label: {
    lineHeight: 1,
  },
  activeDot: {
    position: 'absolute',
    top: -4,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: '#8b5cf6',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    background: '#8b5cf6',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    lineHeight: 1,
    pointerEvents: 'none',
    boxSizing: 'border-box',
  },
};
