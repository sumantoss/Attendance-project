const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'Missing Checkout',
      'Pending Work Update',
      'Overdue Task',
      'Flexible Time Exceeded',
      'Project Deadline Approaching',
      'Open Blocker',
      'Blocker Resolved',
      'New Escalation',
      'Escalation Resolved'
    ],
    required: true
  },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
