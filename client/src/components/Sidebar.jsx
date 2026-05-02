import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (name) =>
    name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <h1>Task<span>Flow</span></h1>
        <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 4 }}>
          Team Task Manager
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <div className="nav-label">Navigation</div>

        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="3" width="7" height="7" rx="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
          Dashboard
        </NavLink>

        <NavLink
          to="/projects"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M2 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V7z"/>
          </svg>
          Projects
        </NavLink>
      </nav>

      {/* Bottom: User Info + Auth Buttons */}
      <div className="sidebar-footer">

        {/* Logged-in User Card */}
        <div style={{
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="user-avatar">{initials(user?.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {user?.name}
              </div>
              <div style={{
                fontSize: '0.72rem', color: 'var(--text3)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {user?.email}
              </div>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: 'var(--red-bg)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--red)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--red)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--red-bg)';
            e.currentTarget.style.color = 'var(--red)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>

      </div>
    </aside>
  );
}

