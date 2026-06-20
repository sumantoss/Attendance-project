const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Blocker = require('../models/Blocker');
const Task = require('../models/Task');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

// Get all blockers
router.get('/', auth, async (req, res) => {
  try {
    const blockers = await Blocker.find()
      .populate({ path: 'task', populate: { path: 'project' } })
      .populate('employee')
      .populate('assignedReviewer')
      .sort({ createdAt: -1 });
    res.json(blockers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create standalone blocker
router.post('/', auth, async (req, res) => {
  const { task, employee, description, type, priority, assignedReviewer } = req.body;
  if (!task || !employee || !description || !type || !assignedReviewer) {
    return res.status(400).json({ message: 'Missing required blocker fields' });
  }

  try {
    const blocker = await Blocker.create({
      task,
      employee,
      description,
      type,
      priority: priority || 'Medium',
      assignedReviewer,
      status: 'Open'
    });

    // Update task status to Blocked
    const taskObj = await Task.findByIdAndUpdate(task, { status: 'Blocked' }, { new: true });
    const empObj = await Employee.findById(employee);

    // Create a notification for the reviewer
    await Notification.create({
      type: 'Open Blocker',
      employee: assignedReviewer,
      message: `New Blocker raised by ${empObj ? empObj.name : 'Employee'} on task: ${taskObj ? taskObj.title : 'Task'}`
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('dashboard-update');
      io.emit('new-notification');
    }

    res.status(201).json(blocker);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update blocker status
router.put('/:id', auth, async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  try {
    const blocker = await Blocker.findById(req.params.id).populate('task').populate('employee');
    if (!blocker) {
      return res.status(404).json({ message: 'Blocker not found' });
    }

    blocker.status = status;
    await blocker.save();

    if (status === 'Resolved' || status === 'Closed') {
      if (blocker.task) {
        const activeBlockersCount = await Blocker.countDocuments({
          task: blocker.task._id,
          status: { $in: ['Open', 'In Review'] }
        });

        if (activeBlockersCount === 0) {
          const taskObj = await Task.findById(blocker.task._id);
          if (taskObj && taskObj.status === 'Blocked') {
            taskObj.status = 'In Progress';
            await taskObj.save();
          }
        }
      }

      // Create Notification for the employee that raised the blocker
      await Notification.create({
        type: 'Blocker Resolved',
        employee: blocker.employee._id,
        message: `Blocker on ${blocker.task ? 'task "' + blocker.task.title + '"' : 'a standalone blocker'} has been marked as ${status}.`
      });
    } else if (blocker.task) {
      const taskObj = await Task.findById(blocker.task._id);
      if (taskObj && taskObj.status !== 'Blocked') {
        taskObj.status = 'Blocked';
        await taskObj.save();
      }
    }

    await AuditLog.create({
      action: 'BLOCKER_STATUS_UPDATE',
      user: 'HR Admin',
      description: `Updated blocker status on ${blocker.task ? '"' + blocker.task.title + '"' : 'standalone blocker'} to ${status}`
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('dashboard-update');
      io.emit('new-notification');
    }

    res.json(blocker);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
