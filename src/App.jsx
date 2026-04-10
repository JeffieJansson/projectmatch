import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Explore from './pages/Explore';
import MyProjects from './pages/MyProjects';
import Matches from './pages/Matches';
import CreateProject from './pages/CreateProject';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import BottomNav from './components/BottomNav';

function ProtectedRoute({ session, children }) {
  if (session === undefined) return null; // väntar på auth-check
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <div style={{ maxWidth: 480, margin: '0 auto', height: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          {/* Publika routes */}
          <Route path="/login" element={session ? <Navigate to="/explore" replace /> : <Login />} />
          <Route path="/register" element={session ? <Navigate to="/explore" replace /> : <Register />} />

          {/* Skyddade routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute session={session}>
                <main style={{ flex: 1, overflowY: 'auto' }}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/explore" replace />} />
                    <Route path="/explore" element={<Explore />} />
                    <Route path="/my-projects" element={<MyProjects />} />
                    <Route path="/matches" element={<Matches />} />
                    <Route path="/create" element={<CreateProject />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/:id" element={<PublicProfile />} />
                  </Routes>
                </main>
                <BottomNav />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
