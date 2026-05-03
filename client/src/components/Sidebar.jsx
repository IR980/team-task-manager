import { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';

function ProfileModal({ user, onClose, onUpdate }) {
  const [name, setName] = useState(user.name);
  const [photo, setPhoto] = useState(user.photo || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/'))
      return setError('Please select an image file (JPG, PNG, etc.)');
    if (file.size > 1.5 * 1024 * 1024)
      return setError('Image must be under 1.5MB. Please resize it first.');
    const reader = new FileReader();
    reader.onload = (ev) => { setPhoto(ev.target.result); setError(''); };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => { setPhoto(null); if (fileRef.current) fileRef.current.value = ''; };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required');
    setLoading(true); setError('');
    try {
      const data = await api.updateProfile({ name: name.trim(), photo });
      onUpdate(data.user);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const initials = (n) => n?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || '?';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 16, width: '100%', maxWidth: 420,
        boxShadow: 'var(--shadow)'
      }}>
        <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>Edit Profile</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-msg" style={{ margin: '0 24px 12px' }}>{error}</div>}

        <form onSubmit={submit}>
          <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Photo Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 90, height: 90, borderRadius: '50%',
                background: photo ? 'transparent' : 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', fontWeight: 700, color: 'white',
                overflow: 'hidden', border: '3px solid var(--border)',
                flexShrink: 0
              }}>
                {photo
                  ? <img src={photo} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials(name)
                }
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm"
                  onClick={() => fileRef.current?.click()}>
                  📷 {photo ? 'Change Photo' : 'Upload Photo'}
                </button>
                {photo && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={removePhoto}>
                    Remove
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>JPG, PNG — max 1.5MB</span>
            </div>

            {/* Name */}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required />
            </div>

            {/* Email (read-only) */}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user.email} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            </div>
          </div>

          <div style={{ padding: '20px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  const initials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || '?';

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleProfileUpdate = (updatedUser) => {
    // update stored token user data
    const token = localStorage.getItem('token');
    login(token, updatedUser);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Task<span>Flow</span></h1>
        <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 4 }}>Team Task Manager</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-label">Navigation</div>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="3" width="7" height="7" rx="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
          Dashboard
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M2 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V7z"/>
          </svg>
          Projects
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        {/* User card — click to edit profile */}
        <div
          onClick={() => setShowProfile(true)}
          style={{
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '10px 12px',
            marginBottom: 10, cursor: 'pointer', transition: 'border-color 0.15s',
            display: 'flex', alignItems: 'center', gap: 10
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          title="Click to edit profile"
        >
          {/* Avatar */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: user?.photo ? 'transparent' : 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', fontWeight: 700, color: 'white',
            overflow: 'hidden', flexShrink: 0, border: '2px solid var(--border2)'
          }}>
            {user?.photo
              ? <img src={user.photo} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials(user?.name)
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text3)', flexShrink: 0 }}>✏️</span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '10px 14px', background: 'var(--red-bg)',
            border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-sm)',
            color: 'var(--red)', fontSize: '0.875rem', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </div>

      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onUpdate={handleProfileUpdate}
        />
      )}
    </aside>
  );
}
