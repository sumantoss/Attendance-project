const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Escalation = require('../models/Escalation');
const Blocker = require('../models/Blocker');
const Task = require('../models/Task');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

// Get all escalations
router.get('/', auth, async (req, res) => {
  try {
    const escalations = await Escalation.find()
      .populate('task')
      .populate('blocker')
      .populate('employee')
      .populate('escalatedTo')
      .sort({ createdAt: -1 });
    res.json(escalations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Raise escalation
router.post('/', auth, async (req, res) => {
  const { task, blocker, employee, reason, escalatedTo, priority } = req.body;
  if (!blocker || !employee || !reason || !escalatedTo) {
    return res.status(400).json({ message: 'Missing required escalation fields' });
  }

  try {
    const escalation = await Escalation.create({
      task,
      blocker,
      employee,
      reason,
      escalatedTo,
      priority: priority || 'High',
      status: 'Open'
    });

    // Also update blocker status to In Review if not already
    await Blocker.findByIdAndUpdate(blocker, { status: 'In Review' });

    const taskObj = task ? await Task.findById(task) : null;
    const empObj = await Employee.findById(employee);

    // Create Notification
    await Notification.create({
      type: 'New Escalation',
      employee: escalatedTo,
      message: `Escalation raised by ${empObj ? empObj.name : 'Employee'} on task: ${taskObj ? taskObj.title : 'Standalone Blocker'}`
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('dashboard-update');
      io.emit('new-notification');
    }

    res.status(201).json(escalation);
  } catch (err) {
    console.error('ERROR IN POST /escalations:', err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
});

// Update escalation status
router.put('/:id', auth, async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  try {
    const escalation = await Escalation.findById(req.params.id).populate('task').populate('blocker').populate('employee');
    if (!escalation) {
      return res.status(404).json({ message: 'Escalation not found' });
    }

    escalation.status = status;
    await escalation.save();

    // If escalation resolved/closed, also close or resolve the underlying blocker and update task status
    if (status === 'Resolved' || status === 'Closed') {
      if (escalation.blocker) {
        await Blocker.findByIdAndUpdate(escalation.blocker._id, { status: 'Resolved' });
        
        // Check if other blockers exist on the same task. Revert task if none.
        if (escalation.task) {
          const activeBlockersCount = await Blocker.countDocuments({
            task: escalation.task._id,
            status: { $in: ['Open', 'In Review'] }
          });
          if (activeBlockersCount === 0) {
            await Task.findByIdAndUpdate(escalation.task._id, { status: 'In Progress' });
          }
        }
      }

      // Create Notification for the employee who raised the escalation
      await Notification.create({
        type: 'Escalation Resolved',
        employee: escalation.employee._id,
        message: `Your escalation on ${escalation.task ? 'task "' + escalation.task.title + '"' : 'a standalone blocker'} has been marked as ${status}.`
      });
    }

    await AuditLog.create({
      action: 'ESCALATION_STATUS_UPDATE',
      user: 'HR Admin',
      description: `Updated escalation status on ${escalation.task ? '"' + escalation.task.title + '"' : 'standalone blocker'} to ${status}`
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('dashboard-update');
      io.emit('new-notification');
    }

    res.json(escalation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
