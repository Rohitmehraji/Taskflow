const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware');

const router = express.Router();
router.use(auth);

// GET /api/projects - list projects user belongs to
router.get('/', (req, res) => {
  const data = db.get();
  const myMemberships = data.projectMembers.filter(m => m.userId === req.user.id);
  const myProjectIds = myMemberships.map(m => m.projectId);
  const projects = data.projects
    .filter(p => myProjectIds.includes(p.id))
    .map(p => {
      const members = data.projectMembers.filter(m => m.projectId === p.id).map(m => {
        const user = data.users.find(u => u.id === m.userId);
        return { id: m.userId, name: user?.name, email: user?.email, role: m.role };
      });
      const tasks = data.tasks.filter(t => t.projectId === p.id);
      const myRole = myMemberships.find(m => m.projectId === p.id)?.role;
      return { ...p, members, taskCount: tasks.length, myRole };
    });
  res.json(projects);
});

// POST /api/projects - create project (any user)
router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });

  const data = db.get();
  const project = {
    id: uuidv4(), name, description: description || '',
    createdBy: req.user.id, createdAt: new Date().toISOString()
  };
  data.projects.push(project);
  // Creator becomes Admin
  data.projectMembers.push({ id: uuidv4(), projectId: project.id, userId: req.user.id, role: 'Admin', joinedAt: new Date().toISOString() });
  db.save();
  res.json({ ...project, myRole: 'Admin', members: [{ id: req.user.id, name: req.user.name, email: req.user.email, role: 'Admin' }], taskCount: 0 });
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  const data = db.get();
  const project = data.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const membership = data.projectMembers.find(m => m.projectId === project.id && m.userId === req.user.id);
  if (!membership) return res.status(403).json({ error: 'Access denied' });

  const members = data.projectMembers.filter(m => m.projectId === project.id).map(m => {
    const user = data.users.find(u => u.id === m.userId);
    return { id: m.userId, name: user?.name, email: user?.email, role: m.role };
  });
  const tasks = data.tasks.filter(t => t.projectId === project.id).map(t => {
    const assignee = data.users.find(u => u.id === t.assigneeId);
    return { ...t, assigneeName: assignee?.name };
  });
  res.json({ ...project, members, tasks, myRole: membership.role });
});

// PUT /api/projects/:id - update (Admin only)
router.put('/:id', (req, res) => {
  const data = db.get();
  const idx = data.projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const membership = data.projectMembers.find(m => m.projectId === req.params.id && m.userId === req.user.id);
  if (!membership || membership.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });

  const { name, description } = req.body;
  if (name) data.projects[idx].name = name;
  if (description !== undefined) data.projects[idx].description = description;
  db.save();
  res.json(data.projects[idx]);
});

// DELETE /api/projects/:id - Admin only
router.delete('/:id', (req, res) => {
  const data = db.get();
  const membership = data.projectMembers.find(m => m.projectId === req.params.id && m.userId === req.user.id);
  if (!membership || membership.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });

  data.projects = data.projects.filter(p => p.id !== req.params.id);
  data.projectMembers = data.projectMembers.filter(m => m.projectId !== req.params.id);
  data.tasks = data.tasks.filter(t => t.projectId !== req.params.id);
  db.save();
  res.json({ success: true });
});

// POST /api/projects/:id/members - invite by email (Admin only)
router.post('/:id/members', (req, res) => {
  const data = db.get();
  const membership = data.projectMembers.find(m => m.projectId === req.params.id && m.userId === req.user.id);
  if (!membership || membership.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });

  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const invitedRole = ['Admin', 'Member'].includes(role) ? role : 'Member';
  const user = data.users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'User not found. They must sign up first.' });
  if (data.projectMembers.find(m => m.projectId === req.params.id && m.userId === user.id))
    return res.status(400).json({ error: 'User already in project' });

  data.projectMembers.push({ id: uuidv4(), projectId: req.params.id, userId: user.id, role: invitedRole, joinedAt: new Date().toISOString() });
  db.save();
  res.json({ id: user.id, name: user.name, email: user.email, role: invitedRole });
});

// DELETE /api/projects/:id/members/:userId - remove member (Admin only)
router.delete('/:id/members/:userId', (req, res) => {
  const data = db.get();
  const membership = data.projectMembers.find(m => m.projectId === req.params.id && m.userId === req.user.id);
  if (!membership || membership.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  if (req.params.userId === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself' });

  data.projectMembers = data.projectMembers.filter(
    m => !(m.projectId === req.params.id && m.userId === req.params.userId)
  );
  db.save();
  res.json({ success: true });
});

// PATCH /api/projects/:id/members/:userId/role - change role (Admin only)
router.patch('/:id/members/:userId/role', (req, res) => {
  const data = db.get();
  const myMembership = data.projectMembers.find(m => m.projectId === req.params.id && m.userId === req.user.id);
  if (!myMembership || myMembership.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });

  const { role } = req.body;
  if (!['Admin', 'Member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const target = data.projectMembers.find(m => m.projectId === req.params.id && m.userId === req.params.userId);
  if (!target) return res.status(404).json({ error: 'Member not found' });
  target.role = role;
  db.save();
  res.json({ success: true, role });
});

module.exports = router;
