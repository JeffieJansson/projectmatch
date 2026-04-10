import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Explore from './pages/Explore';
import MyProjects from './pages/MyProjects';
import Matches from './pages/Matches';
import CreateProject from './pages/CreateProject';
import Profile from './pages/Profile';
import BottomNav from './components/BottomNav';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ maxWidth: 480, margin: '0 auto', height: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/explore" replace />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/my-projects" element={<MyProjects />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/create" element={<CreateProject />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
};
