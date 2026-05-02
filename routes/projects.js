const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Helper: get user's role in project
function getUserRole(projectId, userId) {
  const m = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId);
  return m ? m.role : null;
}

// GET /api/projects — list projects for current user
router.get('/', auth, (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT p.*, pm.role, u.name as creator_name,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      JOIN users u ON u.id = p.created_by
      ORDER BY p.created_at DESC
    `).all(req.user.id);
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects — create project
router.post('/', auth, (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required' });

  try {
    const result = db.prepare('INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)').run(name.trim(), description || '', req.user.id);
    const projectId = result.lastInsertRowid;

    // Creator is admin
    db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(projectId, req.user.id, 'admin');

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    res.status(201).json({ ...project, role: 'admin' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/projects/:id
router.get('/:id', auth, (req, res) => {
  try {
    const role = getUserRole(req.params.id, req.user.id);
    if (!role) return res.status(403).json({ error: 'Not a member of this project' });

    const project = db.prepare(`
      SELECT p.*, u.name as creator_name
      FROM projects p JOIN users u ON u.id = p.created_by
      WHERE p.id = ?
    `).get(req.params.id);

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const members = db.prepare(`
      SELECT u.id, u.name, u.email, pm.role, pm.joined_at
      FROM project_members pm JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ?
      ORDER BY pm.role DESC, u.name ASC
    `).all(req.params.id);

    res.json({ ...project, role, members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/projects/:id — update project (admin only)
router.put('/:id', auth, (req, res) => {
  try {
    const role = getUserRole(req.params.id, req.user.id);
    if (role !== 'admin') return res.status(403).json({ error: 'Only admins can update the project' });

    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required' });

    db.prepare('UPDATE projects SET name = ?, description = ? WHERE id = ?').run(name.trim(), description || '', req.params.id);
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id (admin only)
router.delete('/:id', auth, (req, res) => {
  try {
    const role = getUserRole(req.params.id, req.user.id);
    if (role !== 'admin') return res.status(403).json({ error: 'Only admins can delete the project' });

    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/projects/:id/members
router.get('/:id/members', auth, (req, res) => {
  try {
    const role = getUserRole(req.params.id, req.user.id);
    if (!role) return res.status(403).json({ error: 'Not a member of this project' });

    const members = db.prepare(`
      SELECT u.id, u.name, u.email, pm.role, pm.joined_at
      FROM project_members pm JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ?
      ORDER BY pm.role DESC, u.name ASC
    `).all(req.params.id);

    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects/:id/members — add member by email (admin only)
router.post('/:id/members', auth, (req, res) => {
  try {
    const role = getUserRole(req.params.id, req.user.id);
    if (role !== 'admin') return res.status(403).json({ error: 'Only admins can add members' });

    const { email, memberRole } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const userToAdd = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!userToAdd) return res.status(404).json({ error: 'User with this email not found' });

    const existing = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.id, userToAdd.id);
    if (existing) return res.status(409).json({ error: 'User is already a member' });

    const assignedRole = memberRole === 'admin' ? 'admin' : 'member';
    db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(req.params.id, userToAdd.id, assignedRole);

    res.status(201).json({ ...userToAdd, role: assignedRole });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id/members/:userId (admin only)
router.delete('/:id/members/:userId', auth, (req, res) => {
  try {
    const role = getUserRole(req.params.id, req.user.id);
    if (role !== 'admin') return res.status(403).json({ error: 'Only admins can remove members' });

    if (parseInt(req.params.userId) === req.user.id)
      return res.status(400).json({ error: 'Cannot remove yourself from the project' });

    db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
