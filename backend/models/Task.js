const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  title: { type: String, required: true },
  description: { type: String },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  deadline: { type: Date },
  estimatedHours: { type: Number, default: 0 },
  actualHoursSpent: { type: Number, default: 0 },
  progressPercent: { type: Number, default: 0 },
  status: { type: String, enum: ['Not Started', 'In Progress', 'Blocked', 'Completed'], default: 'Not Started' }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
