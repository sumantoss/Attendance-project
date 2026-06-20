const mongoose = require('mongoose');

const dailyWorkUpdateSchema = new mongoose.Schema({
  attendance: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  taskUpdates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TaskUpdate' }],
  totalHoursWorked: { type: Number, required: true, default: 0 },
  eodReport: { type: String }
}, { timestamps: true });

dailyWorkUpdateSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyWorkUpdate', dailyWorkUpdateSchema);
