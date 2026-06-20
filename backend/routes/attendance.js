const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const WorkUpdate = require('../models/WorkUpdate');
const Task = require('../models/Task');
const Project = require('../models/Project');
const TaskUpdate = require('../models/TaskUpdate');
const DailyWorkUpdate = require('../models/DailyWorkUpdate');
const Blocker = require('../models/Blocker');
const SystemSettings = require('../models/SystemSettings');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { getDistanceInMeters } = require('../utils/geo');
const auth = require('../middleware/auth');

// Helper function to validate PIN and Geolocation
async function validateEmployeeRequest(employeeId, pin, lat, lng) {
  const employee = await Employee.findOne({ employeeId, status: 'Active' });
  if (!employee) {
    return { valid: false, message: 'Active employee not found', status: 404 };
  }

  // Validate PIN
  if (employee.pin !== pin) {
    return { valid: false, message: 'Invalid PIN entered', status: 401 };
  }

  // Validate GPS
  const settings = await SystemSettings.findOne() || { officeLatitude: 0, officeLongitude: 0, allowedRadius: 150, bypassGPS: false };
  if (!settings.bypassGPS) {
    if (lat === undefined || lng === undefined) {
      return { valid: false, message: 'Location coordinates are required', status: 400 };
    }
    const distance = getDistanceInMeters(lat, lng, settings.officeLatitude, settings.officeLongitude);
    if (distance > settings.allowedRadius) {
      return { valid: false, message: `Location verification failed. You are ${Math.round(distance)}m away from the office (limit: ${settings.allowedRadius}m).`, status: 403 };
    }
  }

  return { valid: true, employee };
}

// Get current attendance status for public QR screen
router.post('/status', async (req, res) => {
  const { employeeId, pin, latitude, longitude } = req.body;
  if (!employeeId || !pin) {
    return res.status(400).json({ message: 'Employee ID and PIN are required' });
  }

  try {
    const validation = await validateEmployeeRequest(employeeId, pin, latitude, longitude);
    if (!validation.valid) {
      return res.status(validation.status).json({ message: validation.message });
    }

    const employee = validation.employee;
    const todayStr = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({ employee: employee._id, date: todayStr });
    
    let checkedIn = false;
    let checkedOut = false;

    if (attendance) {
      checkedIn = true;
      if (attendance.checkOut) {
        checkedOut = true;
      }
    }

    res.json({
      checkedIn,
      checkedOut,
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        role: employee.role
      },
      attendance
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Check-In
router.post('/check-in', async (req, res) => {
  const { employeeId, pin, latitude, longitude } = req.body;
  if (!employeeId || !pin) {
    return res.status(400).json({ message: 'Employee ID and PIN are required' });
  }

  try {
    const validation = await validateEmployeeRequest(employeeId, pin, latitude, longitude);
    if (!validation.valid) {
      return res.status(validation.status).json({ message: validation.message });
    }

    const employee = validation.employee;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Check if already checked in today
    let attendance = await Attendance.findOne({ employee: employee._id, date: todayStr });
    if (attendance) {
      return res.status(400).json({ message: 'Already checked in for today' });
    }

    // Determine status (Late if after 10:00 AM)
    const checkInLimit = new Date(now);
    checkInLimit.setHours(10, 0, 0, 0);
    const status = now > checkInLimit ? 'Late' : 'Present';

    attendance = await Attendance.create({
      employee: employee._id,
      date: todayStr,
      checkIn: now,
      latitude,
      longitude,
      locationVerified: true,
      status
    });

    await AuditLog.create({
      action: 'ATTENDANCE_CHECKIN',
      user: employee.name,
      description: `Checked in at ${now.toLocaleTimeString()} (${status}). GPS: ${latitude}, ${longitude}`
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('dashboard-update');
      io.emit('attendance-update', attendance);
    }

    res.status(201).json({ message: 'Check-in successful', attendance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// Check-Out
router.post('/check-out', async (req, res) => {
  const { employeeId, pin, latitude, longitude, workedTasks } = req.body;
  if (!workedTasks || !Array.isArray(workedTasks) || workedTasks.length === 0) {
    return res.status(400).json({ message: 'At least one task update is required for checkout' });
  }

  try {
    const validation = await validateEmployeeRequest(employeeId, pin, latitude, longitude);
    if (!validation.valid) {
      return res.status(validation.status).json({ message: validation.message });
    }

    const employee = validation.employee;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const attendance = await Attendance.findOne({ employee: employee._id, date: todayStr });
    if (!attendance) {
      return res.status(400).json({ message: 'You have not checked in today' });
    }
    if (attendance.checkOut) {
      return res.status(400).json({ message: 'You have already checked out today' });
    }



    // Compute total hours worked from individual task logs
    const totalHoursTracked = workedTasks.reduce((sum, t) => sum + parseFloat(t.hoursWorked || 0), 0);

    const checkOutLimit = new Date(now);
    checkOutLimit.setHours(18, 30, 0, 0);
    
    if (now < checkOutLimit && attendance.status === 'Present') {
      attendance.status = 'Early Leave';
    }

    attendance.checkOut = now;
    attendance.totalHours = parseFloat(totalHoursTracked.toFixed(2));
    await attendance.save();

    // Create Daily Work Update container first
    const dailyUpdate = await DailyWorkUpdate.create({
      attendance: attendance._id,
      employee: employee._id,
      date: todayStr,
      taskUpdates: [],
      totalHoursWorked: attendance.totalHours,
      eodReport: ''
    });

    const taskUpdateIds = [];
    const summaries = [];

    // Loop through each task worked on
    for (const item of workedTasks) {
      const taskObj = await Task.findById(item.task);
      if (!taskObj) continue;

      // Handle optional blocker creation
      let blockerId = null;
      if (item.blocker && item.blocker.description && item.blocker.type) {
        const blockerRecord = await Blocker.create({
          task: taskObj._id,
          employee: employee._id,
          description: item.blocker.description,
          type: item.blocker.type,
          priority: item.blocker.priority || 'Medium',
          assignedReviewer: item.blocker.assignedReviewer || employee.reportingManager || employee._id,
          status: 'Open'
        });
        blockerId = blockerRecord._id;

        // Auto-create a notification for the reviewer
        await Notification.create({
          type: 'Open Blocker',
          employee: blockerRecord.assignedReviewer,
          message: `New Blocker raised by ${employee.name} on task: ${taskObj.title}`
        });
      }

      // Create task update record
      const taskUpdateRecord = await TaskUpdate.create({
        task: taskObj._id,
        employee: employee._id,
        dailyWorkUpdate: dailyUpdate._id,
        hoursWorked: parseFloat(item.hoursWorked),
        progressPercent: parseInt(item.progressPercent),
        status: blockerId ? 'Blocked' : item.status,
        workSummary: item.workSummary,
        subtarget: item.subtarget,
        blocker: blockerId
      });

      taskUpdateIds.push(taskUpdateRecord._id);
      summaries.push(`- [${taskObj.title}]: ${item.workSummary} (Subtarget: ${item.subtarget || 'N/A'}, ${item.hoursWorked}h, Progress: ${item.progressPercent}%, Status: ${blockerId ? 'Blocked' : item.status})`);

      // Update the main Task record
      taskObj.actualHoursSpent = (taskObj.actualHoursSpent || 0) + parseFloat(item.hoursWorked);
      taskObj.progressPercent = parseInt(item.progressPercent);
      taskObj.status = blockerId ? 'Blocked' : item.status;
      await taskObj.save();

      // Recalculate Project progress percent
      const projectTasks = await Task.find({ project: taskObj.project });
      if (projectTasks.length > 0) {
        const totalProgress = projectTasks.reduce((sum, t) => sum + (t.progressPercent || 0), 0);
        const avgProgress = Math.round(totalProgress / projectTasks.length);
        
        await Project.findByIdAndUpdate(taskObj.project, {
          progressPercent: avgProgress
        });
      }
    }

    // Save taskUpdate references and EOD summary in DailyWorkUpdate
    dailyUpdate.taskUpdates = taskUpdateIds;
    dailyUpdate.eodReport = summaries.join('\n');
    await dailyUpdate.save();

    await AuditLog.create({
      action: 'ATTENDANCE_CHECKOUT',
      user: employee.name,
      description: `Checked out. Logged EOD work updates across ${workedTasks.length} tasks. Total: ${attendance.totalHours} hours.`
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('dashboard-update');
      const hasBlocker = workedTasks.some(t => t.blocker);
      if (hasBlocker) {
        io.emit('new-notification');
      }
    }

    res.json({ 
      message: 'Check-out and daily work updates submitted successfully', 
      attendance, 
      dailyUpdate 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin-facing manual corrections
router.put('/correction/:id', auth, async (req, res) => {
  const { checkIn, checkOut, date, status, reason } = req.body;
  if (!reason) {
    return res.status(400).json({ message: 'Reason for modification is required' });
  }

  try {
    const attendance = await Attendance.findById(req.params.id).populate('employee');
    if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });

    if (checkIn) attendance.checkIn = new Date(checkIn);
    if (checkOut) attendance.checkOut = new Date(checkOut);
    if (date) attendance.date = date;
    if (status) attendance.status = status;

    if (attendance.checkIn && attendance.checkOut) {
      attendance.totalHours = parseFloat(((attendance.checkOut - attendance.checkIn) / (1000 * 60 * 60)).toFixed(2));
    }

    await attendance.save();

    await AuditLog.create({
      action: 'ATTENDANCE_CORRECTION',
      user: 'HR Admin',
      description: `Modified attendance for ${attendance.employee.name} on ${attendance.date}. Reason: ${reason}`
    });

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
