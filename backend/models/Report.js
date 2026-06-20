const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['Attendance', 'Employee', 'Task', 'Project', 'Performance'], required: true },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  format: { type: String, enum: ['Excel', 'CSV'], default: 'Excel' },
  filters: { type: Object },
  filePath: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
