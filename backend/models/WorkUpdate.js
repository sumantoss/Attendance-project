const mongoose = require('mongoose');

const workUpdateSchema = new mongoose.Schema({
  attendance: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  taskWorkedOn: { type: String, required: true },
  summary: { type: String, required: true },
  challenges: { type: String },
  remarks: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('WorkUpdate', workUpdateSchema);
