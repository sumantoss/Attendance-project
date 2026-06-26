const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date },
  progressPercent: { type: Number, default: 0 },
  status: { type: String, enum: ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'], default: 'Planning' },
  teamMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
