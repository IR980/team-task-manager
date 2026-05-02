import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';

function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-page">
      <div className="spinner" />
      <span style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>Loading…</span>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/projects" element={<ProtectedLayout><Projects /></ProtectedLayout>} />
          <Route path="/projects/:id" element={<ProtectedLayout><ProjectDetail /></ProtectedLayout>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
