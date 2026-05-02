const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware');

const router = express.Router();
router.use(auth);

const STATUSES = ['Todo', 'In Progress', 'In Review', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

// Helper: check project membership
function getMembership(data, projectId, userId) {
  return data.projectMembers.find(m => m.projectId === projectId && m.userId === userId);
}

// GET /api/tasks?projectId=... - get tasks for a project
router.get('/', (req, res) => {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json({ error: 'projectId required' });

  const data = db.get();
  if (!getMembership(data, projectId, req.user.id)) return res.status(403).json({ error: 'Access denied' });

  const tasks = data.tasks.filter(t => t.projectId === projectId).map(t => {
    const assignee = data.users.find(u => u.id === t.assigneeId);
    const creator = data.users.find(u => u.id === t.createdBy);
    return { ...t, assigneeName: assignee?.name, creatorName: creator?.name };
  });
  res.json(tasks);
});

// GET /api/tasks/my - tasks assigned to me across all projects
router.get('/my', (req, res) => {
  const data = db.get();
  const myProjectIds = data.projectMembers.filter(m => m.userId === req.user.id).map(m => m.projectId);
  const tasks = data.tasks.filter(t => t.assigneeId === req.user.id && myProjectIds.includes(t.projectId)).map(t => {
    const project = data.projects.find(p => p.id === t.projectId);
    return { ...t, projectName: project?.name };
  });
  res.json(tasks);
});

// POST /api/tasks - create task (Admin or Member)
router.post('/', (req, res) => {
  const { projectId, title, description, assigneeId, priority, dueDate } = req.body;
  if (!projectId || !title) return res.status(400).json({ error: 'projectId and title required' });

  const data = db.get();
  const membership = getMembership(data, projectId, req.user.id);
  if (!membership) return res.status(403).json({ error: 'Access denied' });

  // Check assignee is project member
  if (assigneeId && !getMembership(data, projectId, assigneeId))
    return res.status(400).json({ error: 'Assignee must be a project member' });

  const task = {
    id: uuidv4(), projectId, title, description: description || '',
    assigneeId: assigneeId || null, status: 'Todo',
    priority: PRIORITIES.includes(priority) ? priority : 'Medium',
    dueDate: dueDate || null, createdBy: req.user.id,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  data.tasks.push(task);
  db.save();

  const assignee = data.users.find(u => u.id === task.assigneeId);
  const creator = data.users.find(u => u.id === task.createdBy);
  res.json({ ...task, assigneeName: assignee?.name, creatorName: creator?.name });
});

// PUT /api/tasks/:id - update task
router.put('/:id', (req, res) => {
  const data = db.get();
  const idx = data.tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });

  const task = data.tasks[idx];
  const membership = getMembership(data, task.projectId, req.user.id);
  if (!membership) return res.status(403).json({ error: 'Access denied' });

  const { title, description, assigneeId, status, priority, dueDate } = req.body;

  // Members can only update status of their own tasks
  if (membership.role === 'Member' && task.assigneeId !== req.user.id && task.createdBy !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own tasks' });
  }

  if (title) task.title = title;
  if (description !== undefined) task.description = description;
  if (status && STATUSES.includes(status)) task.status = status;
  if (priority && PRIORITIES.includes(priority)) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (assigneeId !== undefined) {
    if (assigneeId && !getMembership(data, task.projectId, assigneeId))
      return res.status(400).json({ error: 'Assignee must be a project member' });
    task.assigneeId = assigneeId;
  }
  task.updatedAt = new Date().toISOString();
  db.save();

  const assignee = data.users.find(u => u.id === task.assigneeId);
  const creator = data.users.find(u => u.id === task.createdBy);
  res.json({ ...task, assigneeName: assignee?.name, creatorName: creator?.name });
});

// DELETE /api/tasks/:id - Admin or task creator
router.delete('/:id', (req, res) => {
  const data = db.get();
  const task = data.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Not found' });

  const membership = getMembership(data, task.projectId, req.user.id);
  if (!membership) return res.status(403).json({ error: 'Access denied' });
  if (membership.role !== 'Admin' && task.createdBy !== req.user.id)
    return res.status(403).json({ error: 'Only admins or task creator can delete' });

  data.tasks = data.tasks.filter(t => t.id !== req.params.id);
  db.save();
  res.json({ success: true });
});

// GET /api/tasks/dashboard - dashboard stats for user
router.get('/dashboard', (req, res) => {
  const data = db.get();
  const myProjectIds = data.projectMembers.filter(m => m.userId === req.user.id).map(m => m.projectId);
  const allTasks = data.tasks.filter(t => myProjectIds.includes(t.projectId));
  const myTasks = allTasks.filter(t => t.assigneeId === req.user.id);
  const now = new Date();

  const overdue = myTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done');

  const byStatus = {};
  STATUSES.forEach(s => { byStatus[s] = myTasks.filter(t => t.status === s).length; });

  res.json({
    totalProjects: myProjectIds.length,
    totalTasks: myTasks.length,
    overdue: overdue.length,
    byStatus,
    recentTasks: myTasks
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5)
      .map(t => {
        const project = data.projects.find(p => p.id === t.projectId);
        return { ...t, projectName: project?.name };
      })
  });
});

module.exports = router;
