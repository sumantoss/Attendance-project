const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const Blocker = require('../models/Blocker');
const PerformanceMetric = require('../models/PerformanceMetric');
const DailyWorkUpdate = require('../models/DailyWorkUpdate');

// Helper to get weekdays between two dates
function getWeekdaysBetweenDates(startDate, endDate) {
  let count = 0;
  let curDate = new Date(startDate);
  curDate.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // If start date is after end date, return 1 to avoid division by zero
  if (curDate > end) return 1;

  while (curDate <= end) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count || 1;
}

// Calculate and save cumulative performance metrics for an employee up to the specified month
async function calculatePerformance(employeeId, monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const employee = await Employee.findById(employeeId);
  if (!employee) return null;

  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  const today = new Date();
  
  // The cutoff date for cumulative calculation is either the end of the specified month, or today if we're in the current month
  const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
  const cutoffDate = isCurrentMonth ? today : endOfMonth;

  // 1. Attendance Metrics (Cumulative up to cutoffDate)
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
  const attendances = await Attendance.find({ 
    employee: employeeId, 
    date: { $lte: cutoffDateStr } 
  });
  
  const presentDays = attendances.length;
  
  // Weekdays from joining date to cutoffDate
  const startDate = employee.joiningDate ? new Date(employee.joiningDate) : new Date(year, month - 1, 1);
  const weekdays = getWeekdaysBetweenDates(startDate, cutoffDate);
  const attendancePercentage = Math.min(100, Math.round((presentDays / weekdays) * 100));

  const totalHours = attendances.reduce((sum, att) => sum + (att.totalHours || 0), 0);
  const averageWorkingHours = presentDays > 0 ? parseFloat((totalHours / presentDays).toFixed(2)) : 0;
  const lateArrivalCount = attendances.filter(att => att.status === 'Late').length;

  // 2. Task Metrics (Cumulative up to cutoffDate)
  const tasks = await Task.find({
    assignedTo: employeeId,
    createdAt: { $lte: endOfMonth } // Include all tasks created up to the end of the requested month
  });

  const tasksAssigned = tasks.length;
  const tasksCompleted = tasks.filter(t => t.status === 'Completed').length;
  const taskCompletionRate = tasksAssigned > 0 ? Math.round((tasksCompleted / tasksAssigned) * 100) : 0;
  
  const overdueTasks = tasks.filter(t => 
    t.status !== 'Completed' && 
    t.status !== 'Blocked' && // Blocked tasks are not considered overdue
    t.deadline && 
    new Date(t.deadline) < new Date()
  ).length;

  const blockedTasks = tasks.filter(t => t.status === 'Blocked').length;

  // 3. Work Update Compliance (Cumulative up to cutoffDate)
  const workUpdatesCount = await DailyWorkUpdate.countDocuments({
    employee: employeeId,
    date: { $lte: cutoffDateStr }
  });
  // Compare work updates against present days
  const workUpdateCompliance = presentDays > 0 ? Math.min(100, Math.round((workUpdatesCount / presentDays) * 100)) : 0;

  // 4. Score Calculation
  const attendanceRate = attendancePercentage;
  const completionRate = taskCompletionRate;
  const onTimeDeliveryRate = tasksAssigned > 0 ? Math.round(((tasksAssigned - overdueTasks) / tasksAssigned) * 100) : 100;

  const individualScore = Math.round(
    (completionRate * 0.45) + 
    (attendanceRate * 0.30) + 
    (onTimeDeliveryRate * 0.20) + 
    (workUpdateCompliance * 0.05)
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
      workUpdateCompliance,
      onTimeDeliveryRate,
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
