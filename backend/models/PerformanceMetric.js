const mongoose = require('mongoose');

const performanceMetricSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: String, required: true }, // Format: YYYY-MM
  attendancePercentage: { type: Number, default: 0 },
  averageWorkingHours: { type: Number, default: 0 },
  lateArrivalCount: { type: Number, default: 0 },
  tasksAssigned: { type: Number, default: 0 },
  tasksCompleted: { type: Number, default: 0 },
  taskCompletionRate: { type: Number, default: 0 },
  overdueTasks: { type: Number, default: 0 },
  blockedTasks: { type: Number, default: 0 },
  individualScore: { type: Number, default: 0 }
}, { timestamps: true });

performanceMetricSchema.index({ employee: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('PerformanceMetric', performanceMetricSchema);
