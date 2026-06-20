const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');

// Get all employees
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find().populate('department').sort({ name: 1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get active employees by department (for public QR page dropdown)
router.get('/dept/:deptId', async (req, res) => {
  try {
    const employees = await Employee.find({
      department: req.params.deptId,
      status: 'Active'
    }).select('name employeeId').sort({ name: 1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create employee
router.post('/', auth, async (req, res) => {
  const { employeeId, name, department, role, joiningDate, pin, status } = req.body;
  if (!employeeId || !name || !department || !role || !joiningDate || !pin) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const existing = await Employee.findOne({ employeeId });
    if (existing) return res.status(400).json({ message: 'Employee ID already exists' });

    const employee = await Employee.create({
      employeeId,
      name,
      department,
      role,
      joiningDate,
      pin,
      status: status || 'Active'
    });

    await AuditLog.create({
      action: 'EMPLOYEE_CREATE',
      user: 'HR Admin',
      description: `Created employee: ${name} (${employeeId})`
    });

    res.status(201).json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update employee
router.put('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const fields = [
      'name',
      'department',
      'role',
      'joiningDate',
      'pin',
      'status'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        employee[field] = req.body[field];
      }
    });

    await employee.save();

    await AuditLog.create({
      action: 'EMPLOYEE_UPDATE',
      user: 'HR Admin',
      description: `Updated employee ID ${employee.employeeId}: ${employee.name}`
    });

    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
