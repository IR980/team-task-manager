const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const projectIds = db.prepare('SELECT project_id FROM project_members WHERE user_id = ?').all(userId).map(r => r.project_id);

    if (projectIds.length === 0) {
      return res.json({
        totalTasks: 0, tasksByStatus: { todo: 0, in_progress: 0, done: 0 },
        tasksByPriority: { low: 0, medium: 0, high: 0 }, overdueTasks: 0,
        totalProjects: 0, myAssignedTasks: 0, tasksPerUser: [], recentTasks: [], projectStats: []
      });
    }

    const ph = projectIds.map(() => '?').join(',');

    const totalTasks = db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE project_id IN (${ph})`).get(...projectIds).c;

    const statusRows = db.prepare(`SELECT status, COUNT(*) as c FROM tasks WHERE project_id IN (${ph}) GROUP BY status`).all(...projectIds);
    const tasksByStatus = { todo: 0, in_progress: 0, done: 0 };
    statusRows.forEach(r => { tasksByStatus[r.status] = r.c; });

    const priorityRows = db.prepare(`SELECT priority, COUNT(*) as c FROM tasks WHERE project_id IN (${ph}) GROUP BY priority`).all(...projectIds);
    const tasksByPriority = { low: 0, medium: 0, high: 0 };
    priorityRows.forEach(r => { tasksByPriority[r.priority] = r.c; });

    const overdueTasks = db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE project_id IN (${ph}) AND due_date < ? AND status != 'done'`).get(...projectIds, today).c;

    const myAssignedTasks = db.prepare(`SELECT COUNT(DISTINCT ta.task_id) as c FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id WHERE t.project_id IN (${ph}) AND ta.user_id = ?`).get(...projectIds, userId).c;

    const tasksPerUser = db.prepare(`
      SELECT u.id, u.name, u.photo, COUNT(DISTINCT ta.task_id) as task_count,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_count
      FROM task_assignees ta
      JOIN tasks t ON t.id = ta.task_id
      JOIN users u ON u.id = ta.user_id
      WHERE t.project_id IN (${ph})
      GROUP BY u.id, u.name ORDER BY task_count DESC LIMIT 10
    `).all(...projectIds);

    const recentTasks = db.prepare(`
      SELECT t.*, p.name as project_name FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.project_id IN (${ph})
      ORDER BY t.created_at DESC LIMIT 5
    `).all(...projectIds);

    // attach assignees to recent tasks
    const recentWithAssignees = recentTasks.map(t => ({
      ...t,
      assignees: db.prepare(`SELECT u.id, u.name, u.photo FROM task_assignees ta JOIN users u ON u.id = ta.user_id WHERE ta.task_id = ?`).all(t.id)
    }));

    const projectStats = db.prepare(`
      SELECT p.id, p.name, pm.role,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_tasks,
        SUM(CASE WHEN t.due_date < ? AND t.status != 'done' THEN 1 ELSE 0 END) as overdue
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      LEFT JOIN tasks t ON t.project_id = p.id
      GROUP BY p.id, p.name, pm.role ORDER BY p.created_at DESC
    `).all(today, userId);

    res.json({ totalTasks, tasksByStatus, tasksByPriority, overdueTasks, totalProjects: projectIds.length, myAssignedTasks, tasksPerUser, recentTasks: recentWithAssignees, projectStats });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;

