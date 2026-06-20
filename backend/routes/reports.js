const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Employee = require('../models/Employee');

// 1. Attendance Report
router.get('/attendance', auth, async (req, res) => {
  const { startDate, endDate, employeeId } = req.query;
  const filter = {};

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = startDate;
    if (endDate) filter.date.$lte = endDate;
  }

  if (employeeId) {
    filter.employee = employeeId;
  }

  try {
    const records = await Attendance.find(filter)
      .populate('employee')
      .sort({ date: -1, checkIn: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Task Report
router.get('/tasks', auth, async (req, res) => {
  const { projectId, employeeId, status } = req.query;
  const filter = {};

  if (projectId) filter.project = projectId;
  if (employeeId) filter.assignedTo = employeeId;
  if (status) filter.status = status;

  try {
    const tasks = await Task.find(filter)
      .populate('project')
      .populate('assignedTo')
      .sort({ deadline: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Project Report
router.get('/projects', auth, async (req, res) => {
  try {
    const projects = await Project.find().populate('teamMembers');
    const projectReports = [];

    for (const project of projects) {
      const totalTasks = await Task.countDocuments({ project: project._id });
      const completedTasks = await Task.countDocuments({ project: project._id, status: 'Completed' });
      
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      projectReports.push({
        _id: project._id,
        name: project.name,
        description: project.description,
        status: project.status,
        teamCount: project.teamMembers.length,
        totalTasks,
        completedTasks,
        completionRate
      });
    }
    res.json(projectReports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Performance Report
router.get('/performance', auth, async (req, res) => {
  try {
    const employees = await Employee.find({ status: 'Active' }).populate('department');
    const performanceReport = [];

    // Calculate metrics for each employee
    for (const employee of employees) {
      const totalTasks = await Task.countDocuments({ assignedTo: employee._id });
      const completedTasks = await Task.countDocuments({ assignedTo: employee._id, status: 'Completed' });
      const overdueTasks = await Task.countDocuments({
        assignedTo: employee._id,
        status: { $ne: 'Completed' },
        deadline: { $lt: new Date() }
      });

      const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Attendance metrics
      const attendances = await Attendance.find({ employee: employee._id });
      const presentDays = attendances.length;
      
      // Calculate average working hours
      const totalHours = attendances.reduce((sum, att) => sum + (att.totalHours || 0), 0);
      const avgHours = presentDays > 0 ? parseFloat((totalHours / presentDays).toFixed(2)) : 0;

      // Late arrival count
      const lateArrivals = attendances.filter(att => att.status === 'Late').length;

      performanceReport.push({
        _id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId,
        department: employee.department ? employee.department.name : 'Unassigned',
        role: employee.role,
        presentDays,
        avgHours,
        lateArrivals,
        tasksAssigned: totalTasks,
        tasksCompleted: completedTasks,
        taskCompletionRate,
        overdueTasks
      });
    }

    res.json(performanceReport);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. Export Report (CSV format)
router.get('/export/:type', auth, async (req, res) => {
  const { type } = req.params;
  const { startDate, endDate, employeeId, projectId, status } = req.query;

  try {
    let csvContent = "";
    let fileName = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`;

    if (type === 'attendance') {
      const filter = {};
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = startDate;
        if (endDate) filter.date.$lte = endDate;
      }
      if (employeeId) filter.employee = employeeId;

      const records = await Attendance.find(filter).populate('employee');
      csvContent = "Date,Employee ID,Employee Name,Check In,Check Out,Total Hours,Status,Location Verified\n";
      records.forEach(r => {
        const cIn = r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '';
        const cOut = r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '';
        csvContent += `"${r.date}","${r.employee?.employeeId || ''}","${r.employee?.name || ''}","${cIn}","${cOut}","${r.totalHours || 0}","${r.status}","${r.locationVerified ? 'Yes' : 'No'}"\n`;
      });

    } else if (type === 'tasks') {
      const filter = {};
      if (projectId) filter.project = projectId;
      if (employeeId) filter.assignedTo = employeeId;
      if (status) filter.status = status;

      const tasks = await Task.find(filter).populate('project').populate('assignedTo');
      csvContent = "Project,Task Title,Assigned To,Priority,Deadline,Estimated Hours,Actual Hours,Status\n";
      tasks.forEach(t => {
        csvContent += `"${t.project?.name || ''}","${t.title}","${t.assignedTo?.name || ''}","${t.priority}","${t.deadline ? new Date(t.deadline).toLocaleDateString() : ''}","${t.estimatedHours || 0}","${t.actualHoursSpent || 0}","${t.status}"\n`;
      });

    } else if (type === 'projects') {
      const projects = await Project.find().populate('teamMembers');
      csvContent = "Project Name,Description,Start Date,End Date,Status,Progress %,Team Size\n";
      projects.forEach(p => {
        csvContent += `"${p.name}","${p.description || ''}","${p.startDate ? new Date(p.startDate).toLocaleDateString() : ''}","${p.endDate ? new Date(p.endDate).toLocaleDateString() : ''}","${p.status}","${p.progressPercent}%","${p.teamMembers?.length || 0}"\n`;
      });

    } else if (type === 'performance') {
      const employees = await Employee.find({ status: 'Active' }).populate('department');
      csvContent = "Employee ID,Name,Department,Role,Present Days,Avg Hours,Late Arrivals,Tasks Assigned,Tasks Completed,Completion Rate %,Score\n";
      
      for (const employee of employees) {
        const totalTasks = await Task.countDocuments({ assignedTo: employee._id });
        const completedTasks = await Task.countDocuments({ assignedTo: employee._id, status: 'Completed' });
        const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        const attendances = await Attendance.find({ employee: employee._id });
        const presentDays = attendances.length;
        const totalHours = attendances.reduce((sum, att) => sum + (att.totalHours || 0), 0);
        const avgHours = presentDays > 0 ? parseFloat((totalHours / presentDays).toFixed(2)) : 0;
        const lateArrivals = attendances.filter(att => att.status === 'Late').length;

        const weekdays = 22;
        const attendancePercentage = Math.min(100, Math.round((presentDays / weekdays) * 100));
        const avgHoursRate = Math.min(100, Math.round((avgHours / 8) * 100));
        const score = Math.round(attendancePercentage * 0.3 + taskCompletionRate * 0.4 + avgHoursRate * 0.1 + 80 * 0.2);

        csvContent += `"${employee.employeeId}","${employee.name}","${employee.department ? employee.department.name : 'Unassigned'}","${employee.role}","${presentDays}","${avgHours}","${lateArrivals}","${totalTasks}","${completedTasks}","${taskCompletionRate}%","${score}"\n`;
      }
    } else if (type === 'employee') {
      const employees = await Employee.find().populate('department').populate('reportingManager');
      csvContent = "Employee ID,Name,Email,Phone,Department,Role,Joining Date,Reporting Manager,Status\n";
      employees.forEach(e => {
        csvContent += `"${e.employeeId}","${e.name}","${e.email || ''}","${e.phone || ''}","${e.department ? e.department.name : ''}","${e.role}","${e.joiningDate ? new Date(e.joiningDate).toLocaleDateString() : ''}","${e.reportingManager?.name || 'None'}","${e.status}"\n`;
      });
    } else {
      return res.status(400).json({ message: "Invalid report type" });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    return res.status(200).send(csvContent);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
