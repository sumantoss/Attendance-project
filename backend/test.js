const mongoose = require('mongoose');
const Escalation = require('./models/Escalation');
const Task = require('./models/Task');
const Employee = require('./models/Employee');
const Blocker = require('./models/Blocker');
const Notification = require('./models/Notification');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/cropnow_attendance');
  
  // Try to replicate the POST /escalations logic
  const task = null; // simulate missing task
  const blocker = '6673eb6cb392a40015b6d5c5'; // fake ID
  const employee = null; // fake ID
  const reason = 'test';
  const escalatedTo = '6673eb6cb392a40015b6d5c7';
  const priority = 'High';

  try {
    const escalation = await Escalation.create({
      task: task || null,
      blocker,
      employee,
      reason,
      escalatedTo,
      priority: priority || 'High',
      status: 'Open'
    });

    await Blocker.findByIdAndUpdate(blocker, { status: 'In Review' });

    const taskObj = task ? await Task.findById(task) : null;
    const empObj = await Employee.findById(employee);

    await Notification.create({
      type: 'New Escalation',
      employee: escalatedTo,
      message: `Escalation raised by ${empObj ? empObj.name : 'Employee'} on task: ${taskObj ? taskObj.title : 'Standalone Blocker'}`
    });

    console.log("Success");
  } catch (err) {
    console.error("Error:", err.message);
  }
  process.exit(0);
}

run();
