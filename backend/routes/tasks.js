const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const AuditLog = require('../models/AuditLog');

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.assignedTo) {
      filter.assignedTo = req.query.assignedTo;
    }
    const tasks = await Task.find(filter).populate('project').populate('assignedTo').sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create task
router.post('/', auth, async (req, res) => {
  const { project, assignedTo, title, description, priority, deadline, status } = req.body;
  if (!project || !assignedTo || !title) {
    return res.status(400).json({ message: 'Project, assigned employee, and title are required' });
  }

  try {
    const task = await Task.create({
      project,
      assignedTo,
      title,
      description,
      priority: priority || 'Medium',
      deadline,
      status: status || 'Pending'
    });

    await AuditLog.create({
      action: 'TASK_CREATE',
      user: 'HR Admin',
      description: `Assigned task "${title}" to employee ID ${assignedTo}`
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('dashboard-update');
    }

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const fields = ['project', 'assignedTo', 'title', 'description', 'priority', 'deadline', 'status'];
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    await task.save();

    await AuditLog.create({
      action: 'TASK_UPDATE',
      user: 'HR Admin',
      description: `Updated task ID ${task._id}: Status=${task.status}`
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('dashboard-update');
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
