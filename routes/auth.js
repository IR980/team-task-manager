const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email, and password are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return res.status(400).json({ error: 'Invalid email address' });
  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name.trim(), email.toLowerCase().trim(), hash);
    const token = jwt.sign({ id: result.lastInsertRowid }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: result.lastInsertRowid, name: name.trim(), email: email.toLowerCase().trim(), photo: null } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, photo: user.photo || null } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, photo FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

// Update profile (name + photo)
router.put('/profile', auth, (req, res) => {
  const { name, photo } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ error: 'Name is required' });
  // photo is base64 data URL, limit ~2MB
  if (photo && photo.length > 2 * 1024 * 1024 * 1.4)
    return res.status(400).json({ error: 'Photo too large. Please use an image under 1MB.' });
  try {
    db.prepare('UPDATE users SET name = ?, photo = ? WHERE id = ?').run(name.trim(), photo || null, req.user.id);
    const updated = db.prepare('SELECT id, name, email, photo FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: updated });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
