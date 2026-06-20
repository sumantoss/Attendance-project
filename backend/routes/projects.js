const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const AuditLog = require('../models/AuditLog');

// Get all projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().populate('teamMembers').sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create project
router.post('/', auth, async (req, res) => {
  const { name, description, status, teamMembers } = req.body;
  if (!name) return res.status(400).json({ message: 'Project name is required' });

  try {
    const project = await Project.create({
      name,
      description,
      status: status || 'Active',
      teamMembers: teamMembers || []
    });

    await AuditLog.create({
      action: 'PROJECT_CREATE',
      user: 'HR Admin',
      description: `Created project: ${name}`
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('dashboard-update');
    }

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (req.body.name !== undefined) project.name = req.body.name;
    if (req.body.description !== undefined) project.description = req.body.description;
    if (req.body.status !== undefined) project.status = req.body.status;
    if (req.body.teamMembers !== undefined) project.teamMembers = req.body.teamMembers;

    await project.save();

    await AuditLog.create({
      action: 'PROJECT_UPDATE',
      user: 'HR Admin',
      description: `Updated project ID ${project._id}: ${project.name}`
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('dashboard-update');
    }

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
