const mongoose = require('mongoose');

const taskUpdateSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  dailyWorkUpdate: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyWorkUpdate', required: true },
  hoursWorked: { type: Number, required: true },
  progressPercent: { type: Number, required: true },
  status: { type: String, enum: ['Not Started', 'In Progress', 'Blocked', 'Completed'], required: true },
  workSummary: { type: String, required: true },
  subtarget: { type: String },
  blocker: { type: mongoose.Schema.Types.ObjectId, ref: 'Blocker' }
}, { timestamps: true });

module.exports = mongoose.model('TaskUpdate', taskUpdateSchema);
