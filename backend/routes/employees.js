const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { adminOnly } = require('../middleware/auth');
const Employee = require('../models/Employee');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const AuditLog = require('../models/AuditLog');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const DailyWorkUpdate = require('../models/DailyWorkUpdate');
const Blocker = require('../models/Blocker');
const PerformanceMetric = require('../models/PerformanceMetric');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Get all employees
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.user && req.user.role === 'teamlead') {
      if (!req.user.department) return res.json([]);
      filter.department = req.user.department;
    }
    const employees = await Employee.find(filter).populate('department').sort({ name: 1 });
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

// Get full employee profile with analytics
router.get('/profile/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('department')
      .populate('reportingManager', 'name employeeId');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // --- Date ranges ---
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7); // YYYY-MM

    // Last 30 days
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    // --- Attendance (last 30 days) ---
    const attendance = await Attendance.find({
      employee: employee._id,
      date: { $gte: thirtyDaysAgoStr, $lte: today }
    }).sort({ date: -1 });

    // Attendance summary for current month
    const monthAttendance = attendance.filter(a => a.date.startsWith(currentMonth));
    const totalPresent = monthAttendance.length;
    const totalLate = monthAttendance.filter(a => a.status === 'Late').length;
    const totalEarlyLeave = monthAttendance.filter(a => a.status === 'Early Leave').length;
    const totalHours = monthAttendance.reduce((sum, a) => sum + (a.totalHours || 0), 0);
    const avgHours = totalPresent > 0 ? parseFloat((totalHours / totalPresent).toFixed(2)) : 0;

    // Working days in current month (weekdays up to today)
    const [yr, mn] = currentMonth.split('-').map(Number);
    let weekdays = 0;
    const lastDay = now.getMonth() + 1 === mn && now.getFullYear() === yr
      ? now.getDate()
      : new Date(yr, mn, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const dow = new Date(yr, mn - 1, d).getDay();
      if (dow !== 0 && dow !== 6) weekdays++;
    }
    const attendanceRate = weekdays > 0 ? Math.min(100, Math.round((totalPresent / weekdays) * 100)) : 0;

    // --- Tasks ---
    const tasks = await Task.find({ assignedTo: employee._id })
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    const tasksCompleted = tasks.filter(t => t.status === 'Completed').length;
    const tasksInProgress = tasks.filter(t => t.status === 'In Progress').length;
    const tasksBlocked = tasks.filter(t => t.status === 'Blocked').length;
    const tasksOverdue = tasks.filter(t =>
      t.status !== 'Completed' && t.status !== 'Blocked' && t.deadline && new Date(t.deadline) < now
    ).length;

    // --- Recent work updates (last 10) ---
    const recentUpdates = await DailyWorkUpdate.find({ employee: employee._id })
      .populate({
        path: 'taskUpdates',
        populate: { path: 'task', select: 'title' }
      })
      .sort({ date: -1 })
      .limit(10);

    // --- Blockers ---
    const blockers = await Blocker.find({ employee: employee._id })
      .populate('task', 'title')
      .sort({ dateRaised: -1 })
      .limit(10);

    // --- Performance metric (current month) ---
    let performance = await PerformanceMetric.findOne({
      employee: employee._id,
      month: currentMonth
    });

    res.json({
      employee,
      attendance: {
        records: attendance,
        summary: {
          totalPresent,
          totalLate,
          totalEarlyLeave,
          totalHours: parseFloat(totalHours.toFixed(2)),
          avgHours,
          attendanceRate,
          weekdays
        }
      },
      tasks: {
        list: tasks,
        summary: {
          total: tasks.length,
          completed: tasksCompleted,
          inProgress: tasksInProgress,
          blocked: tasksBlocked,
          overdue: tasksOverdue
        }
      },
      recentUpdates,
      blockers,
      performance
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create employee
router.post('/', auth, adminOnly, async (req, res) => {
  const { employeeId, name, department, role, joiningDate, pin, status, email, phone, reportingManager, portalPassword } = req.body;
  if (!employeeId || !name || !department || !role || !joiningDate || !pin) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // If role is a Lead role and they provided a password, require email
  const isLead = role.toLowerCase().includes('lead');
  if (isLead && portalPassword && !email) {
    return res.status(400).json({ message: 'Email is required to create a Team Lead portal account' });
  }

  try {
    const existing = await Employee.findOne({ employeeId });
    if (existing) return res.status(400).json({ message: 'Employee ID already exists' });

    // Optionally check if Admin email already exists
    if (isLead && portalPassword) {
      const existingAdmin = await Admin.findOne({ email, role: 'teamlead' });
      if (existingAdmin) return res.status(400).json({ message: 'A Team Lead portal account with this email already exists' });
    }

    const employee = await Employee.create({
      employeeId,
      name,
      department,
      role,
      joiningDate,
      pin,
      status: status || 'Active',
      email: email || undefined,
      phone: phone || undefined,
      reportingManager: reportingManager || undefined
    });

    // Create the Team Lead portal account if specified
    if (isLead && portalPassword) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(portalPassword, salt);
      await Admin.create({
        fullName: name,
        email: email,
        password: hashedPassword,
        role: 'teamlead',
        department: department
      });
    }

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
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const fields = [
      'name',
      'department',
      'role',
      'joiningDate',
      'pin',
      'status',
      'email',
      'phone',
      'reportingManager'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        employee[field] = req.body[field] === '' ? null : req.body[field];
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

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/photos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (only allow images)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Upload employee photo
router.post('/:id/photo', auth, adminOnly, (req, res) => {
  upload.single('photo')(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Please upload a photo file' });
      }

      const employee = await Employee.findById(req.params.id);
      if (!employee) {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ message: 'Employee not found' });
      }

      // Delete old photo if exists
      if (employee.photo) {
        const oldPath = path.join(__dirname, '..', employee.photo);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (unlinkErr) {
            console.error('Failed to delete old photo file:', unlinkErr);
          }
        }
      }

      employee.photo = `/uploads/photos/${req.file.filename}`;
      await employee.save();

      await AuditLog.create({
        action: 'EMPLOYEE_UPDATE',
        user: 'HR Admin',
        description: `Uploaded photo for employee: ${employee.name} (${employee.employeeId})`
      });

      res.json({ 
        message: 'Photo uploaded successfully', 
        photo: employee.photo 
      });
    } catch (err) {
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {}
      }
      res.status(500).json({ message: err.message });
    }
  });
});

module.exports = router;
