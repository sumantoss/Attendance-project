const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const Blocker = require('../models/Blocker');
const PerformanceMetric = require('../models/PerformanceMetric');

// Helpers for weekdays calculation
function getWeekdaysInMonth(year, month) {
  let count = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  return count || 22;
}

function getWeekdaysUpToToday(year, month) {
  const today = new Date();
  if (today.getFullYear() === year && (today.getMonth() + 1) === month) {
    let count = 0;
    const currentDay = today.getDate();
    for (let day = 1; day <= currentDay; day++) {
      const d = new Date(year, month - 1, day);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
    }
    return count || 1;
  }
  return getWeekdaysInMonth(year, month);
}

// Calculate and save monthly performance metrics for an employee
async function calculatePerformance(employeeId, monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const employee = await Employee.findById(employeeId);
  if (!employee) return null;

  // 1. Attendance Metrics
  const dateRegex = new RegExp(`^${monthStr}`);
  const attendances = await Attendance.find({ employee: employeeId, date: { $regex: dateRegex } });
  
  const presentDays = attendances.length;
  const weekdays = getWeekdaysUpToToday(year, month);
  const attendancePercentage = Math.min(100, Math.round((presentDays / weekdays) * 100));

  const totalHours = attendances.reduce((sum, att) => sum + (att.totalHours || 0), 0);
  const averageWorkingHours = presentDays > 0 ? parseFloat((totalHours / presentDays).toFixed(2)) : 0;
  const lateArrivalCount = attendances.filter(att => att.status === 'Late').length;

  // 2. Task Metrics
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const tasks = await Task.find({
    assignedTo: employeeId,
    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
  });

  const tasksAssigned = tasks.length;
  const tasksCompleted = tasks.filter(t => t.status === 'Completed').length;
  const taskCompletionRate = tasksAssigned > 0 ? Math.round((tasksCompleted / tasksAssigned) * 100) : 0;
  
  const overdueTasks = tasks.filter(t => 
    t.status !== 'Completed' && t.deadline && new Date(t.deadline) < new Date()
  ).length;

  const blockedTasks = tasks.filter(t => t.status === 'Blocked').length;

  // 3. Score Calculation
  const attendanceRate = attendancePercentage; // weight: 30%
  const avgHoursRate = Math.min(100, Math.round((averageWorkingHours / 8) * 100)); // weight: 10%
  const completionRate = taskCompletionRate; // weight: 40%
  const deliveryRate = tasksAssigned > 0 ? Math.round(((tasksAssigned - overdueTasks) / tasksAssigned) * 100) : 100; // weight: 20%

  const individualScore = Math.round(
    attendanceRate * 0.3 + 
    completionRate * 0.4 + 
    deliveryRate * 0.2 + 
    avgHoursRate * 0.1
  );

  // Save/Update PerformanceMetric
  const metric = await PerformanceMetric.findOneAndUpdate(
    { employee: employeeId, month: monthStr },
    {
      attendancePercentage,
      averageWorkingHours,
      lateArrivalCount,
      tasksAssigned,
      tasksCompleted,
      taskCompletionRate,
      overdueTasks,
      blockedTasks,
      individualScore
    },
    { new: true, upsert: true }
  ).populate('employee');

  return metric;
}

// GET all performance metrics for a specific month
router.get('/month/:month', auth, async (req, res) => {
  const { month } = req.params; // Format YYYY-MM
  try {
    const employees = await Employee.find({ status: 'Active' });
    const metrics = [];

    for (const emp of employees) {
      const metric = await calculatePerformance(emp._id, month);
      if (metric) {
        metrics.push(metric);
      }
    }
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET performance for single employee
router.get('/employee/:employeeId', auth, async (req, res) => {
  const { employeeId } = req.params;
  const monthStr = req.query.month || new Date().toISOString().slice(0, 7);
  try {
    const metric = await calculatePerformance(employeeId, monthStr);
    if (!metric) {
      return res.status(404).json({ message: 'Employee or metric not found' });
    }
    res.json(metric);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET team/department metrics
router.get('/department/:departmentId', auth, async (req, res) => {
  const { departmentId } = req.params;
  const monthStr = req.query.month || new Date().toISOString().slice(0, 7);
  try {
    const employees = await Employee.find({ department: departmentId, status: 'Active' });
    if (employees.length === 0) {
      return res.json({ teamProductivity: 0, completionRate: 0, count: 0 });
    }

    let totalScore = 0;
    let totalCompletion = 0;

    for (const emp of employees) {
      const m = await calculatePerformance(emp._id, monthStr);
      if (m) {
        totalScore += m.individualScore;
        totalCompletion += m.taskCompletionRate;
      }
    }

    res.json({
      teamProductivity: Math.round(totalScore / employees.length),
      completionRate: Math.round(totalCompletion / employees.length),
      count: employees.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
