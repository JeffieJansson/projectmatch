import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Explore from './pages/Explore';
import MyProjects from './pages/MyProjects';
import Matches from './pages/Matches';
import Chat from './pages/Chat';
import CreateProject from './pages/CreateProject';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import BottomNav from './components/BottomNav';

export default function App() {
  const [session, setSession] = useState(undefined);           // undefined = loading
  const [onboardingDone, setOnboardingDone] = useState(undefined); // undefined = unknown

  // ── Auth listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setOnboardingDone(undefined);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Fetch onboarding status whenever the logged-in user changes ───────────
  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setOnboardingDone(!!data?.onboarding_completed));
  }, [session?.user?.id]);

  // Still loading auth or profile
  if (session === undefined || (session && onboardingDone === undefined)) return null;

  return (
    <BrowserRouter>
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', height: '100dvh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={session ? <Navigate to={onboardingDone ? '/explore' : '/onboarding'} replace /> : <Login />}
          />
          <Route
            path="/register"
            element={session ? <Navigate to={onboardingDone ? '/explore' : '/onboarding'} replace /> : <Register />}
          />

          {/* Onboarding – protected, no BottomNav */}
          <Route
            path="/onboarding"
            element={
              !session ? <Navigate to="/login" replace /> :
              onboardingDone ? <Navigate to="/explore" replace /> :
              <Onboarding onComplete={() => setOnboardingDone(true)} />
            }
          />

          {/* Main app – protected, with BottomNav */}
          <Route
            path="/*"
            element={
              !session ? <Navigate to="/login" replace /> :
              !onboardingDone ? <Navigate to="/onboarding" replace /> :
              <>
                <main style={{ flex: 1, overflowY: 'auto', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/explore" replace />} />
                    <Route path="/explore" element={<Explore />} />
                    <Route path="/my-projects" element={<MyProjects />} />
                    <Route path="/matches" element={<Matches />} />
                    <Route path="/create" element={<CreateProject />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/:id" element={<PublicProfile />} />
                    <Route path="/chat/:matchId" element={<Chat />} />
                  </Routes>
                </main>
                <BottomNav />
              </>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
