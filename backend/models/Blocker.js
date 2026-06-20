const mongoose = require('mongoose');

const blockerSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  description: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Technical Issue', 'Requirement Missing', 'Dependency Pending', 'Waiting For Approval', 'External Dependency', 'Other'], 
    required: true 
  },
  dateRaised: { type: Date, default: Date.now },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  assignedReviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  status: { type: String, enum: ['Open', 'In Review', 'Resolved', 'Closed'], default: 'Open' }
}, { timestamps: true });

module.exports = mongoose.model('Blocker', blockerSchema);
