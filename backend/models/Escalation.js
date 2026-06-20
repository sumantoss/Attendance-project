const mongoose = require('mongoose');

const escalationSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  blocker: { type: mongoose.Schema.Types.ObjectId, ref: 'Blocker', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  reason: { type: String, required: true },
  dateRaised: { type: Date, default: Date.now },
  escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'High' },
  status: { type: String, enum: ['Open', 'In Review', 'Resolved', 'Closed'], default: 'Open' }
}, { timestamps: true });

module.exports = mongoose.model('Escalation', escalationSchema);
