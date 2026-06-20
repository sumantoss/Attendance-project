const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Department = require('../models/Department');
const Blocker = require('../models/Blocker');
const DailyWorkUpdate = require('../models/DailyWorkUpdate');

// Get summary metrics
router.get('/summary', auth, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const totalEmployees = await Employee.countDocuments({ status: 'Active' });
    const presentToday = await Attendance.countDocuments({ date: todayStr });
    const absentToday = Math.max(0, totalEmployees - presentToday);
    const lateToday = await Attendance.countDocuments({ date: todayStr, status: 'Late' });
    const activeProjects = await Project.countDocuments({ status: 'Active' });
    const pendingTasks = await Task.countDocuments({ status: { $in: ['Not Started', 'In Progress', 'Blocked'] } });
    const openBlockers = await Blocker.countDocuments({ status: 'Open' });
    const pendingDailyUpdates = await Attendance.countDocuments({ date: todayStr, checkOut: null });

    res.json({
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      activeProjects,
      pendingTasks,
      openBlockers,
      pendingDailyUpdates
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get charts data
router.get('/charts', auth, async (req, res) => {
  try {
    const today = new Date();
    const last7Days = [];
    
    // Generate dates for last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]);
    }

    // 1. Attendance trend
    const attendanceTrend = [];
    for (const dateStr of last7Days) {
      const presentCount = await Attendance.countDocuments({ date: dateStr });
      const lateCount = await Attendance.countDocuments({ date: dateStr, status: 'Late' });
      const dayName = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
      
      attendanceTrend.push({
        date: dateStr,
        day: dayName,
        Present: presentCount,
        Late: lateCount
      });
    }

    // 2. Department distribution
    const departments = await Department.find();
    const departmentData = [];
    for (const dept of departments) {
      const count = await Employee.countDocuments({ department: dept._id, status: 'Active' });
      departmentData.push({
        name: dept.name,
        value: count
      });
    }

    // 3. Task distribution
    const notStarted = await Task.countDocuments({ status: 'Not Started' });
    const inProgress = await Task.countDocuments({ status: 'In Progress' });
    const blocked = await Task.countDocuments({ status: 'Blocked' });
    const completed = await Task.countDocuments({ status: 'Completed' });
    const taskData = [
      { name: 'Not Started', value: notStarted },
      { name: 'In Progress', value: inProgress },
      { name: 'Blocked', value: blocked },
      { name: 'Completed', value: completed }
    ];



    res.json({
      attendanceTrend,
      departmentData,
      taskData
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
