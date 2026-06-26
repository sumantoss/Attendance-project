const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const AuditLog = require('../models/AuditLog');

// Get all projects
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user && req.user.role === 'teamlead') {
      filter.department = req.user.department;
    }
    const projects = await Project.find(filter).populate('teamMembers').populate('department').sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create project
router.post('/', auth, async (req, res) => {
  const { name, description, status, teamMembers, department } = req.body;
  if (!name) return res.status(400).json({ message: 'Project name is required' });

  try {
    // If teamlead, force the project's department to their own department
    const projectDepartment = (req.user && req.user.role === 'teamlead') 
      ? req.user.department 
      : department;

    const project = await Project.create({
      name,
      description,
      status: status || 'Active',
      teamMembers: teamMembers || [],
      department: projectDepartment || undefined
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

    // Team leads can only update their own projects
    if (req.user && req.user.role === 'teamlead' && project.department?.toString() !== req.user.department?.toString()) {
      return res.status(403).json({ message: 'Access denied. You can only update projects in your department.' });
    }

    if (req.body.name !== undefined) project.name = req.body.name;
    if (req.body.description !== undefined) project.description = req.body.description;
    if (req.body.status !== undefined) project.status = req.body.status;
    if (req.body.teamMembers !== undefined) project.teamMembers = req.body.teamMembers;
    
    // Only admins can change a project's department
    if (req.body.department !== undefined && req.user.role === 'admin') {
      project.department = req.body.department;
    }

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
