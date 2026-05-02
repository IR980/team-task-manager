import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

function DonutChart({ data, total }) {
  const size = 120;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const segments = data.filter(d => d.value > 0);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div className="donut-chart">
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg3)" strokeWidth={stroke} />
          {segments.map((seg, i) => {
            const dash = (seg.value / total) * circ;
            const gap = circ - dash;
            const el = (
              <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
                stroke={seg.color} strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="donut-center">
          <div className="donut-val">{total}</div>
          <div className="donut-sub">total</div>
        </div>
      </div>
      <div className="legend">
        {data.map(d => (
          <div className="legend-item" key={d.label}>
            <div className="legend-dot" style={{ background: d.color }} />
            <span style={{color:'var(--text2)'}}>{d.label}</span>
            <span style={{marginLeft:'auto',color:'var(--text)',fontWeight:600}}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data, max }) {
  return (
    <div className="bar-chart">
      {data.map((row, i) => (
        <div className="bar-row" key={i}>
          <div className="bar-label" title={row.label}>{row.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{
              width: max > 0 ? `${(row.value / max) * 100}%` : '0%',
              background: row.color || 'var(--accent)'
            }} />
          </div>
          <div className="bar-count">{row.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-page" style={{minHeight:'60vh'}}>
      <div className="spinner" />
      <span style={{color:'var(--text3)',fontSize:'0.875rem'}}>Loading dashboard…</span>
    </div>
  );

  const today = new Date().toISOString().split('T')[0];
  const statusTotal = stats ? (stats.tasksByStatus.todo + stats.tasksByStatus.in_progress + stats.tasksByStatus.done) : 0;

  const statusData = [
    { label: 'To Do', value: stats?.tasksByStatus.todo || 0, color: 'var(--text3)' },
    { label: 'In Progress', value: stats?.tasksByStatus.in_progress || 0, color: 'var(--blue)' },
    { label: 'Done', value: stats?.tasksByStatus.done || 0, color: 'var(--green)' },
  ];

  const priorityData = [
    { label: 'High', value: stats?.tasksByPriority.high || 0, color: 'var(--red)' },
    { label: 'Medium', value: stats?.tasksByPriority.medium || 0, color: 'var(--yellow)' },
    { label: 'Low', value: stats?.tasksByPriority.low || 0, color: 'var(--text3)' },
  ];

  const usersMax = stats?.tasksPerUser.length > 0 ? Math.max(...stats.tasksPerUser.map(u => u.task_count)) : 1;

  return (
    <>
      <div className="page-header">
        <h2>Good morning, {user?.name?.split(' ')[0]} 👋</h2>
        <p>Here's what's happening across your projects.</p>
      </div>

      <div className="page-body">
        {/* Stat cards */}
        <div className="stats-grid">
          {[
            { icon: '📁', label: 'Projects', value: stats?.totalProjects || 0, bg: 'var(--accent-glow)', color: 'var(--accent2)' },
            { icon: '✅', label: 'Total Tasks', value: stats?.totalTasks || 0, bg: 'var(--blue-bg)', color: 'var(--blue)' },
            { icon: '🎯', label: 'Assigned to Me', value: stats?.myAssignedTasks || 0, bg: 'var(--green-bg)', color: 'var(--green)' },
            { icon: '⚠️', label: 'Overdue', value: stats?.overdueTasks || 0, bg: 'var(--red-bg)', color: 'var(--red)' },
            { icon: '🏁', label: 'Completed', value: stats?.tasksByStatus.done || 0, bg: 'var(--green-bg)', color: 'var(--green)' },
            { icon: '🔄', label: 'In Progress', value: stats?.tasksByStatus.in_progress || 0, bg: 'var(--blue-bg)', color: 'var(--blue)' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon" style={{ background: s.bg }}>
                <span>{s.icon}</span>
              </div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="charts-row">
          <div className="card">
            <div className="card-title" style={{ marginBottom: 20 }}>Tasks by Status</div>
            <DonutChart data={statusData} total={statusTotal} />
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 20 }}>Tasks by Priority</div>
            <DonutChart data={priorityData} total={stats?.totalTasks || 0} />
          </div>
        </div>

        <div className="charts-row">
          {/* Tasks per user */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Tasks per Team Member</div>
            {stats?.tasksPerUser.length > 0 ? (
              <BarChart
                data={stats.tasksPerUser.map(u => ({ label: u.name, value: u.task_count }))}
                max={usersMax}
              />
            ) : (
              <div style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>No tasks assigned yet.</div>
            )}
          </div>

          {/* Project stats */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Projects Overview</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats?.projectStats.length > 0 ? stats.projectStats.map(p => {
                const pct = p.total_tasks > 0 ? Math.round((p.done_tasks / p.total_tasks) * 100) : 0;
                return (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{p.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--green)', borderRadius: 3, transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text3)', display: 'flex', gap: 8 }}>
                      <span>{p.total_tasks} tasks</span>
                      {p.overdue > 0 && <span style={{ color: 'var(--red)' }}>· {p.overdue} overdue</span>}
                    </div>
                  </div>
                );
              }) : (
                <div style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>No projects yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Recent tasks */}
        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
            <div className="card-title">Recent Tasks</div>
            <Link to="/projects" className="btn btn-ghost btn-sm">View Projects →</Link>
          </div>
          {stats?.recentTasks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {stats.recentTasks.map((task, i) => {
                const isOverdue = task.due_date && task.due_date < today && task.status !== 'done';
                return (
                  <div key={task.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 0',
                    borderBottom: i < stats.recentTasks.length - 1 ? '1px solid var(--border)' : 'none'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>{task.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}>{task.project_name}</div>
                    </div>
                    <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
                    <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                    {task.due_date && (
                      <span style={{ fontSize: '0.72rem', color: isOverdue ? 'var(--red)' : 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {isOverdue ? '⚠️' : '📅'} {task.due_date}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '30px 20px' }}>
              <div className="empty-state-icon">📋</div>
              <p>No tasks yet. Create a project and add tasks to get started.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
