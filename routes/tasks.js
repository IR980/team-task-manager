const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

function getUserRole(projectId, userId) {
  const m = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId);
  return m ? m.role : null;
}

// GET /api/projects/:projectId/tasks
router.get('/', auth, (req, res) => {
  try {
    const role = getUserRole(req.params.projectId, req.user.id);
    if (!role) return res.status(403).json({ error: 'Not a member of this project' });

    const tasks = db.prepare(`
      SELECT t.*,
        ua.name as assigned_to_name, ua.email as assigned_to_email,
        uc.name as created_by_name
      FROM tasks t
      LEFT JOIN users ua ON ua.id = t.assigned_to
      LEFT JOIN users uc ON uc.id = t.created_by
      WHERE t.project_id = ?
      ORDER BY
        CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        t.due_date ASC NULLS LAST,
        t.created_at DESC
    `).all(req.params.projectId);

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects/:projectId/tasks (admin only)
router.post('/', auth, (req, res) => {
  try {
    const role = getUserRole(req.params.projectId, req.user.id);
    if (!role) return res.status(403).json({ error: 'Not a member of this project' });
    if (role !== 'admin') return res.status(403).json({ error: 'Only admins can create tasks' });

    const { title, description, due_date, priority, assigned_to } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

    const validPriorities = ['low', 'medium', 'high'];
    const taskPriority = validPriorities.includes(priority) ? priority : 'medium';

    // Validate assigned_to is a project member
    if (assigned_to) {
      const isMember = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, assigned_to);
      if (!isMember) return res.status(400).json({ error: 'Assigned user is not a member of this project' });
    }

    const result = db.prepare(`
      INSERT INTO tasks (project_id, title, description, due_date, priority, assigned_to, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.projectId, title.trim(), description || '', due_date || null, taskPriority, assigned_to || null, req.user.id);

    const task = db.prepare(`
      SELECT t.*, ua.name as assigned_to_name, ua.email as assigned_to_email, uc.name as created_by_name
      FROM tasks t
      LEFT JOIN users ua ON ua.id = t.assigned_to
      LEFT JOIN users uc ON uc.id = t.created_by
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tasks/:id — update task
// Admin can update anything; member can only update status of their assigned tasks
router.put('/:taskId', auth, (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const role = getUserRole(task.project_id, req.user.id);
    if (!role) return res.status(403).json({ error: 'Not a member of this project' });

    const isAdmin = role === 'admin';
    const isAssigned = task.assigned_to === req.user.id;

    if (!isAdmin && !isAssigned)
      return res.status(403).json({ error: 'You can only update tasks assigned to you' });

    let { title, description, due_date, priority, status, assigned_to } = req.body;

    const validStatuses = ['todo', 'in_progress', 'done'];
    const validPriorities = ['low', 'medium', 'high'];

    if (isAdmin) {
      // Admin can update everything
      title = title?.trim() || task.title;
      description = description !== undefined ? description : task.description;
      due_date = due_date !== undefined ? due_date : task.due_date;
      priority = validPriorities.includes(priority) ? priority : task.priority;
      status = validStatuses.includes(status) ? status : task.status;

      if (assigned_to !== undefined && assigned_to !== null) {
        const isMember = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, assigned_to);
        if (!isMember) return res.status(400).json({ error: 'Assigned user is not a project member' });
      }
      assigned_to = assigned_to !== undefined ? assigned_to : task.assigned_to;
    } else {
      // Member can only update status
      title = task.title;
      description = task.description;
      due_date = task.due_date;
      priority = task.priority;
      status = validStatuses.includes(status) ? status : task.status;
      assigned_to = task.assigned_to;
    }

    db.prepare(`
      UPDATE tasks SET title=?, description=?, due_date=?, priority=?, status=?, assigned_to=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(title, description, due_date, priority, status, assigned_to, req.params.taskId);

    const updated = db.prepare(`
      SELECT t.*, ua.name as assigned_to_name, ua.email as assigned_to_email, uc.name as created_by_name
      FROM tasks t
      LEFT JOIN users ua ON ua.id = t.assigned_to
      LEFT JOIN users uc ON uc.id = t.created_by
      WHERE t.id = ?
    `).get(req.params.taskId);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id (admin only)
router.delete('/:taskId', auth, (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const role = getUserRole(task.project_id, req.user.id);
    if (role !== 'admin') return res.status(403).json({ error: 'Only admins can delete tasks' });

    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
