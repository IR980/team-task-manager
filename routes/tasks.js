const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

function getUserRole(projectId, userId) {
  const m = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId);
  return m ? m.role : null;
}

function getTaskAssignees(taskId) {
  return db.prepare(`
    SELECT u.id, u.name, u.email, u.photo FROM task_assignees ta
    JOIN users u ON u.id = ta.user_id WHERE ta.task_id = ?
  `).all(taskId);
}

function setTaskAssignees(taskId, assigneeIds) {
  db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(taskId);
  for (const uid of assigneeIds) {
    try { db.prepare('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)').run(taskId, uid); } catch(e) {}
  }
}

// GET /api/projects/:projectId/tasks
router.get('/', auth, (req, res) => {
  try {
    const role = getUserRole(req.params.projectId, req.user.id);
    if (!role) return res.status(403).json({ error: 'Not a member of this project' });

    const tasks = db.prepare(`
      SELECT t.*, uc.name as created_by_name
      FROM tasks t
      LEFT JOIN users uc ON uc.id = t.created_by
      WHERE t.project_id = ?
      ORDER BY
        CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        t.due_date ASC NULLS LAST, t.created_at DESC
    `).all(req.params.projectId);

    // attach assignees to each task
    const result = tasks.map(t => ({ ...t, assignees: getTaskAssignees(t.id) }));
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/projects/:projectId/tasks
router.post('/', auth, (req, res) => {
  try {
    const role = getUserRole(req.params.projectId, req.user.id);
    if (!role) return res.status(403).json({ error: 'Not a member of this project' });
    if (role !== 'admin') return res.status(403).json({ error: 'Only admins can create tasks' });

    const { title, description, due_date, priority, assignee_ids } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

    const validPriorities = ['low', 'medium', 'high'];
    const taskPriority = validPriorities.includes(priority) ? priority : 'medium';

    // Validate all assignees are project members
    const ids = Array.isArray(assignee_ids) ? assignee_ids : [];
    for (const uid of ids) {
      const isMember = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, uid);
      if (!isMember) return res.status(400).json({ error: `User ${uid} is not a project member` });
    }

    const result = db.prepare(`
      INSERT INTO tasks (project_id, title, description, due_date, priority, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.projectId, title.trim(), description || '', due_date || null, taskPriority, req.user.id);

    setTaskAssignees(result.lastInsertRowid, ids);

    const task = db.prepare(`
      SELECT t.*, uc.name as created_by_name FROM tasks t
      LEFT JOIN users uc ON uc.id = t.created_by WHERE t.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ ...task, assignees: getTaskAssignees(task.id) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/tasks/:taskId
router.put('/:taskId', auth, (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const role = getUserRole(task.project_id, req.user.id);
    if (!role) return res.status(403).json({ error: 'Not a member of this project' });

    const isAdmin = role === 'admin';
    const assignees = getTaskAssignees(task.id);
    const isAssigned = assignees.some(a => a.id === req.user.id);

    if (!isAdmin && !isAssigned)
      return res.status(403).json({ error: 'You can only update tasks assigned to you' });

    const validStatuses = ['todo', 'in_progress', 'done'];
    const validPriorities = ['low', 'medium', 'high'];
    let { title, description, due_date, priority, status, assignee_ids } = req.body;

    if (isAdmin) {
      title = title?.trim() || task.title;
      description = description !== undefined ? description : task.description;
      due_date = due_date !== undefined ? due_date : task.due_date;
      priority = validPriorities.includes(priority) ? priority : task.priority;
      status = validStatuses.includes(status) ? status : task.status;

      const ids = Array.isArray(assignee_ids) ? assignee_ids : [];
      for (const uid of ids) {
        const isMember = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, uid);
        if (!isMember) return res.status(400).json({ error: `User ${uid} is not a project member` });
      }
      setTaskAssignees(task.id, ids);
    } else {
      title = task.title; description = task.description;
      due_date = task.due_date; priority = task.priority;
      status = validStatuses.includes(status) ? status : task.status;
    }

    db.prepare(`
      UPDATE tasks SET title=?, description=?, due_date=?, priority=?, status=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(title, description, due_date, priority, status, req.params.taskId);

    const updated = db.prepare(`
      SELECT t.*, uc.name as created_by_name FROM tasks t
      LEFT JOIN users uc ON uc.id = t.created_by WHERE t.id = ?
    `).get(req.params.taskId);

    res.json({ ...updated, assignees: getTaskAssignees(updated.id) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/tasks/:taskId
router.delete('/:taskId', auth, (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const role = getUserRole(task.project_id, req.user.id);
    if (role !== 'admin') return res.status(403).json({ error: 'Only admins can delete tasks' });
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
    res.json({ message: 'Task deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
