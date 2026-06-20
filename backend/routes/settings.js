const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SystemSettings = require('../models/SystemSettings');
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Attendance = require('../models/Attendance');
const WorkUpdate = require('../models/WorkUpdate');
const AuditLog = require('../models/AuditLog');

// Get settings
router.get('/', async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({
        officeLatitude: 12.9716, // Bangalore default lat
        officeLongitude: 77.5946, // Bangalore default lng
        allowedRadius: 150,
        bypassGPS: true // Default bypass to true for easier local onboarding/testing
      });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update settings
router.put('/', auth, async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = new SystemSettings();
    }
    settings.officeLatitude = req.body.officeLatitude;
    settings.officeLongitude = req.body.officeLongitude;
    settings.allowedRadius = req.body.allowedRadius;
    settings.bypassGPS = req.body.bypassGPS;
    await settings.save();

    // Log action
    await AuditLog.create({
      action: 'SETTINGS_CHANGE',
      user: 'HR Admin',
      description: `Settings updated: Latitude=${settings.officeLatitude}, Longitude=${settings.officeLongitude}, Radius=${settings.allowedRadius}m, BypassGPS=${settings.bypassGPS}`
    });

    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Seed Database (for local test convenience)
router.post('/seed', async (req, res) => {
  try {
    // Clear collections
    await Department.deleteMany({});
    await Employee.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Attendance.deleteMany({});
    await WorkUpdate.deleteMany({});
    await AuditLog.deleteMany({});
    await SystemSettings.deleteMany({});

    // Create settings
    const settings = await SystemSettings.create({
      officeLatitude: 12.9716,
      officeLongitude: 77.5946,
      allowedRadius: 150,
      bypassGPS: true
    });

    // Create Departments
    const hrDept = await Department.create({ name: 'HR Department' });
    const engDept = await Department.create({ name: 'Engineering' });
    const desDept = await Department.create({ name: 'Design' });

    // Create Employees
    const emp1 = await Employee.create({
      employeeId: 'EMP001',
      name: 'Rahul Sharma',
      department: engDept._id,
      role: 'Frontend Developer',
      joiningDate: new Date('2025-01-15'),
      pin: '1234',
      status: 'Active'
    });

    const emp2 = await Employee.create({
      employeeId: 'EMP002',
      name: 'Aditi Patel',
      department: desDept._id,
      role: 'UI Designer',
      joiningDate: new Date('2025-03-10'),
      pin: '2345',
      status: 'Active'
    });

    const emp3 = await Employee.create({
      employeeId: 'EMP003',
      name: 'Vikram Singh',
      department: hrDept._id,
      role: 'HR Executive',
      joiningDate: new Date('2024-06-01'),
      pin: '3456',
      status: 'Active'
    });

    // Create Projects
    const proj1 = await Project.create({
      name: 'Workforce Management System',
      description: 'Central platform for employee attendance and updates',
      status: 'Active',
      teamMembers: [emp1._id, emp2._id]
    });

    const proj2 = await Project.create({
      name: 'Client Portal Integration',
      description: 'Web dashboard for external client interactions',
      status: 'Planning',
      teamMembers: [emp1._id]
    });

    // Create Tasks
    await Task.create({
      project: proj1._id,
      assignedTo: emp1._id,
      title: 'Develop QR code scan screen',
      description: 'Build mobile responsive pin pad and GPS checker page',
      priority: 'High',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'In Progress'
    });

    await Task.create({
      project: proj1._id,
      assignedTo: emp2._id,
      title: 'Design Dashboard layout',
      description: 'Create high fidelity mockups for metrics grid and tables',
      priority: 'High',
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'Completed'
    });

    await Task.create({
      project: proj1._id,
      assignedTo: emp1._id,
      title: 'Integrate Recharts component',
      description: 'Develop charts for daily updates',
      priority: 'Medium',
      deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      status: 'Pending'
    });

    // Seed mock attendance for the past 7 days
    const today = new Date();
    for (let i = 7; i >= 1; i--) {
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - i);
      const dateStr = pastDate.toISOString().split('T')[0];

      // Rahul (EMP001)
      const rCheckIn = new Date(pastDate);
      rCheckIn.setHours(9, 15, 0);
      const rCheckOut = new Date(pastDate);
      rCheckOut.setHours(18, 0, 0);
      
      const rAttendance = await Attendance.create({
        employee: emp1._id,
        date: dateStr,
        checkIn: rCheckIn,
        checkOut: rCheckOut,
        totalHours: 8.75,
        latitude: 12.9716,
        longitude: 77.5946,
        locationVerified: true,
        status: 'Present'
      });

      // Rahul WorkUpdate
      await WorkUpdate.create({
        attendance: rAttendance._id,
        employee: emp1._id,
        project: proj1._id,
        taskWorkedOn: 'Develop QR code scan screen',
        summary: `Successfully completed QR Scanner routing, tested PIN validation for date ${dateStr}`,
        challenges: 'Faced small GPS accuracy warnings but resolved using configurable office coordinates.'
      });

      // Aditi (EMP002)
      const aCheckIn = new Date(pastDate);
      aCheckIn.setHours(9, 45, 0);
      const aCheckOut = new Date(pastDate);
      aCheckOut.setHours(17, 30, 0);
      
      const aAttendance = await Attendance.create({
        employee: emp2._id,
        date: dateStr,
        checkIn: aCheckIn,
        checkOut: aCheckOut,
        totalHours: 7.75,
        latitude: 12.9716,
        longitude: 77.5946,
        locationVerified: true,
        status: 'Late'
      });

      await WorkUpdate.create({
        attendance: aAttendance._id,
        employee: emp2._id,
        project: proj1._id,
        taskWorkedOn: 'Design Dashboard layout',
        summary: `Created component wireframes for detailed metrics log and navigation panel.`,
        challenges: 'None'
      });
    }

    await AuditLog.create({
      action: 'SYSTEM_SEED',
      user: 'System',
      description: 'Database initialized with 3 departments, 3 employees, 2 projects, 3 tasks, and 7 days of attendance history.'
    });

    res.json({ message: 'Database successfully reset and seeded!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
