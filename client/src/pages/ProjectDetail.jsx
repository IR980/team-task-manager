import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_COLS = [
  { key: 'todo', label: 'To Do', color: 'var(--text3)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--blue)' },
  { key: 'done', label: 'Done', color: 'var(--green)' },
];

const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['todo', 'in_progress', 'done'];

// ─── Task Modal ──────────────────────────────────────────────────────────────
function TaskModal({ task, members, isAdmin, onClose, onSave, onDelete, projectId }) {
  const [form, setForm] = useState(task ? {
    title: task.title, description: task.description || '',
    due_date: task.due_date || '', priority: task.priority,
    status: task.status, assigned_to: task.assigned_to || ''
  } : { title: '', description: '', due_date: '', priority: 'medium', status: 'todo', assigned_to: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const body = { ...form, assigned_to: form.assigned_to || null };
    try {
      let saved;
      if (task) {
        saved = await api.updateTask(task.id, body);
      } else {
        saved = await api.createTask(projectId, body);
      }
      onSave(saved, !task);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    try { await api.deleteTask(task.id); onDelete(task.id); onClose(); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{task ? 'Edit Task' : 'New Task'}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-msg" style={{ margin: '0 24px 8px' }}>{error}</div>}
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" name="title" value={form.title} onChange={handle} placeholder="Task title" required disabled={!isAdmin && !!task} />
            </div>
            {(isAdmin || !task) && (
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" name="description" value={form.description} onChange={handle} placeholder="Describe the task…" />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" name="status" value={form.status} onChange={handle}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              {isAdmin && (
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-input" name="priority" value={form.priority} onChange={handle}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}
            </div>
            {isAdmin && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" name="due_date" value={form.due_date} onChange={handle} />
                </div>
                <div className="form-group">
                  <label className="form-label">Assign To</label>
                  <select className="form-input" name="assigned_to" value={form.assigned_to} onChange={handle}>
                    <option value="">Unassigned</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            {task && isAdmin && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
            )}
            <button type="button" className="btn btn-ghost" style={{ marginLeft: task && isAdmin ? 0 : 'auto' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : (task ? 'Update' : 'Create Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────
function AddMemberModal({ projectId, onClose, onAdd }) {
  const [email, setEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const member = await api.addMember(projectId, { email, memberRole });
      onAdd(member);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Add Member</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-msg" style={{ margin: '0 24px 8px' }}>{error}</div>}
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">User Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@example.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input" value={memberRole} onChange={e => setMemberRole(e.target.value)}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Adding…' : 'Add Member'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board');
  const [taskModal, setTaskModal] = useState(null); // null | 'new' | task object
  const [memberModal, setMemberModal] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    Promise.all([api.getProject(id), api.getTasks(id)])
      .then(([proj, tsk]) => { setProject(proj); setTasks(tsk); })
      .catch(() => navigate('/projects'))
      .finally(() => setLoading(false));
  }, [id]);

  const isAdmin = project?.role === 'admin';
  const members = project?.members || [];

  const handleTaskSave = (saved, isNew) => {
    if (isNew) setTasks(t => [saved, ...t]);
    else setTasks(t => t.map(tk => tk.id === saved.id ? saved : tk));
  };

  const handleTaskDelete = (taskId) => setTasks(t => t.filter(tk => tk.id !== taskId));

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.removeMember(id, memberId);
      setProject(p => ({ ...p, members: p.members.filter(m => m.id !== memberId) }));
    } catch (err) { alert(err.message); }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Delete this entire project? This cannot be undone.')) return;
    try { await api.deleteProject(id); navigate('/projects'); }
    catch (err) { alert(err.message); }
  };

  const initials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || '?';

  if (loading) return <div className="loading-page" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

  const tasksByStatus = STATUS_COLS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb">
          <Link to="/projects">Projects</Link>
          <span>›</span>
          <span style={{ color: 'var(--text2)' }}>{project?.name}</span>
        </div>
        <div className="flex justify-between items-center" style={{ marginTop: 8 }}>
          <div>
            <h2>{project?.name}</h2>
            {project?.description && <p>{project.description}</p>}
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <button className="btn btn-primary btn-sm" onClick={() => setTaskModal('new')}>
                  + New Task
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>Delete</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="tabs">
          <button className={`tab-btn ${tab === 'board' ? 'active' : ''}`} onClick={() => setTab('board')}>
            📋 Board
          </button>
          <button className={`tab-btn ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>
            📄 List
          </button>
          <button className={`tab-btn ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>
            👥 Members ({members.length})
          </button>
        </div>

        {/* ── Kanban Board ── */}
        {tab === 'board' && (
          <div className="kanban-board">
            {STATUS_COLS.map(col => (
              <div className="kanban-col" key={col.key}>
                <div className="kanban-col-header">
                  <div className="kanban-col-title" style={{ color: col.color }}>{col.label}</div>
                  <div className="kanban-col-count">{tasksByStatus[col.key].length}</div>
                </div>
                {tasksByStatus[col.key].length === 0 && (
                  <div style={{ color: 'var(--text3)', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>
                    No tasks
                  </div>
                )}
                {tasksByStatus[col.key].map(task => {
                  const isOverdue = task.due_date && task.due_date < today && task.status !== 'done';
                  const canEdit = isAdmin || task.assigned_to === user?.id;
                  return (
                    <div className="task-card" key={task.id} onClick={() => canEdit && setTaskModal(task)}>
                      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                      </div>
                      <div className="task-card-title">{task.title}</div>
                      {task.description && <div className="task-card-desc">{task.description}</div>}
                      <div className="task-card-footer">
                        {task.assigned_to ? (
                          <div className="assignee-chip">
                            <div className="assignee-avatar">{initials(task.assigned_to_name)}</div>
                            <span>{task.assigned_to_name?.split(' ')[0]}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Unassigned</span>
                        )}
                        {task.due_date && (
                          <div className={`task-due ${isOverdue ? 'overdue' : ''}`}>
                            {isOverdue ? '⚠️' : '📅'} {task.due_date}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* ── List View ── */}
        {tab === 'list' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {tasks.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No tasks yet</h3>{isAdmin && <p>Create tasks to get started.</p>}</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Title', 'Status', 'Priority', 'Assigned To', 'Due Date', ''].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, i) => {
                    const isOverdue = task.due_date && task.due_date < today && task.status !== 'done';
                    const canEdit = isAdmin || task.assigned_to === user?.id;
                    return (
                      <tr key={task.id} style={{ borderBottom: i < tasks.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 500 }}>{task.title}</td>
                        <td style={{ padding: '12px 16px' }}><span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span></td>
                        <td style={{ padding: '12px 16px' }}><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                        <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text2)' }}>
                          {task.assigned_to_name || <span style={{ color: 'var(--text3)' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: isOverdue ? 'var(--red)' : 'var(--text3)' }}>
                          {task.due_date ? (isOverdue ? '⚠️ ' : '') + task.due_date : '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {canEdit && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setTaskModal(task)}>Edit</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Members ── */}
        {tab === 'members' && (
          <div>
            {isAdmin && (
              <div style={{ marginBottom: 16 }}>
                <button className="btn btn-primary" onClick={() => setMemberModal(true)}>+ Add Member</button>
              </div>
            )}
            <div className="members-list">
              {members.map(m => (
                <div className="member-row" key={m.id}>
                  <div className="member-avatar">{initials(m.name)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{m.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{m.email}</div>
                  </div>
                  <span className={`badge badge-${m.role}`}>{m.role}</span>
                  {isAdmin && m.id !== user?.id && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.id)}>Remove</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Task Modal */}
      {taskModal && (
        <TaskModal
          task={taskModal === 'new' ? null : taskModal}
          members={members}
          isAdmin={isAdmin}
          projectId={id}
          onClose={() => setTaskModal(null)}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
        />
      )}

      {/* Add Member Modal */}
      {memberModal && (
        <AddMemberModal
          projectId={id}
          onClose={() => setMemberModal(false)}
          onAdd={(m) => setProject(p => ({ ...p, members: [...p.members, m] }))}
        />
      )}
    </>
  );
}
