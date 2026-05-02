import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function CreateProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const project = await api.createProject(form);
      onCreate(project);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>New Project</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-msg" style={{ margin: '0 24px' }}>{error}</div>}
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input className="form-input" name="name" value={form.name} onChange={handle} placeholder="e.g. Website Redesign" required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" name="description" value={form.description} onChange={handle} placeholder="What is this project about?" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.getProjects().then(setProjects).catch(console.error).finally(() => setLoading(false));
  }, []);

  const initials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  if (loading) return (
    <div className="loading-page" style={{ minHeight: '60vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h2>Projects</h2>
            <p>{projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <span>+</span> New Project
          </button>
        </div>
      </div>

      <div className="page-body">
        {projects.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 80 }}>
            <div className="empty-state-icon">📁</div>
            <h3>No projects yet</h3>
            <p>Create your first project to start managing tasks with your team.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Project</button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(p => (
              <div className="project-card" key={p.id} onClick={() => navigate(`/projects/${p.id}`)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div className="project-card-name">{p.name}</div>
                  <span className={`badge badge-${p.role}`} style={{ flexShrink: 0, marginTop: 2 }}>{p.role}</span>
                </div>
                {p.description && <div className="project-card-desc">{p.description}</div>}
                <div className="project-card-meta">
                  <div className="project-card-stat">
                    <span>👥</span> {p.member_count} member{p.member_count !== 1 ? 's' : ''}
                  </div>
                  <div className="project-card-stat">
                    <span>📋</span> {p.task_count} task{p.task_count !== 1 ? 's' : ''}
                  </div>
                  <div className="project-card-stat" style={{ marginLeft: 'auto' }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreate={(p) => setProjects(prev => [p, ...prev])}
        />
      )}
    </>
  );
}
