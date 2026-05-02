const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard — aggregated stats for the current user
router.get('/', auth, (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // All projects user belongs to
    const projectIds = db.prepare(`
      SELECT project_id FROM project_members WHERE user_id = ?
    `).all(userId).map(r => r.project_id);

    if (projectIds.length === 0) {
      return res.json({
        totalTasks: 0,
        tasksByStatus: { todo: 0, in_progress: 0, done: 0 },
        tasksByPriority: { low: 0, medium: 0, high: 0 },
        overdueTasks: 0,
        totalProjects: 0,
        myAssignedTasks: 0,
        tasksPerUser: [],
        recentTasks: [],
        projectStats: []
      });
    }

    const placeholders = projectIds.map(() => '?').join(',');

    // Total tasks across all user's projects
    const totalTasks = db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE project_id IN (${placeholders})`).get(...projectIds).c;

    // Tasks by status
    const statusRows = db.prepare(`
      SELECT status, COUNT(*) as c FROM tasks WHERE project_id IN (${placeholders}) GROUP BY status
    `).all(...projectIds);
    const tasksByStatus = { todo: 0, in_progress: 0, done: 0 };
    statusRows.forEach(r => { tasksByStatus[r.status] = r.c; });

    // Tasks by priority
    const priorityRows = db.prepare(`
      SELECT priority, COUNT(*) as c FROM tasks WHERE project_id IN (${placeholders}) GROUP BY priority
    `).all(...projectIds);
    const tasksByPriority = { low: 0, medium: 0, high: 0 };
    priorityRows.forEach(r => { tasksByPriority[r.priority] = r.c; });

    // Overdue tasks (due_date < today, not done)
    const overdueTasks = db.prepare(`
      SELECT COUNT(*) as c FROM tasks
      WHERE project_id IN (${placeholders}) AND due_date < ? AND status != 'done'
    `).get(...projectIds, today).c;

    // My assigned tasks
    const myAssignedTasks = db.prepare(`
      SELECT COUNT(*) as c FROM tasks WHERE project_id IN (${placeholders}) AND assigned_to = ?
    `).get(...projectIds, userId).c;

    // Tasks per user
    const tasksPerUser = db.prepare(`
      SELECT u.id, u.name, COUNT(t.id) as task_count,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_count
      FROM tasks t
      JOIN users u ON u.id = t.assigned_to
      WHERE t.project_id IN (${placeholders}) AND t.assigned_to IS NOT NULL
      GROUP BY u.id, u.name
      ORDER BY task_count DESC
      LIMIT 10
    `).all(...projectIds);

    // Recent tasks
    const recentTasks = db.prepare(`
      SELECT t.*, p.name as project_name, ua.name as assigned_to_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users ua ON ua.id = t.assigned_to
      WHERE t.project_id IN (${placeholders})
      ORDER BY t.created_at DESC
      LIMIT 5
    `).all(...projectIds);

    // Per-project stats
    const projectStats = db.prepare(`
      SELECT p.id, p.name, pm.role,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_tasks,
        SUM(CASE WHEN t.due_date < ? AND t.status != 'done' THEN 1 ELSE 0 END) as overdue
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      LEFT JOIN tasks t ON t.project_id = p.id
      GROUP BY p.id, p.name, pm.role
      ORDER BY p.created_at DESC
    `).all(today, userId);

    res.json({
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      overdueTasks,
      totalProjects: projectIds.length,
      myAssignedTasks,
      tasksPerUser,
      recentTasks,
      projectStats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
