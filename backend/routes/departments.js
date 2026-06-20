const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');

// Get all departments
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create department
router.post('/', auth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });

  try {
    const existing = await Department.findOne({ name });
    if (existing) return res.status(400).json({ message: 'Department already exists' });

    const dept = await Department.create({ name });

    await AuditLog.create({
      action: 'DEPARTMENT_CREATE',
      user: 'HR Admin',
      description: `Created department: ${name}`
    });

    res.status(201).json(dept);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update department
router.put('/:id', auth, async (req, res) => {
  const { name, isActive } = req.body;
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    if (name !== undefined) dept.name = name;
    if (isActive !== undefined) dept.isActive = isActive;
    await dept.save();

    await AuditLog.create({
      action: 'DEPARTMENT_UPDATE',
      user: 'HR Admin',
      description: `Updated department ID ${dept._id}: Name=${dept.name}, Active=${dept.isActive}`
    });

    res.json(dept);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
