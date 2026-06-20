const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g. 'ATTENDANCE_MODIFIED', 'EMPLOYEE_UPDATE', 'SETTINGS_CHANGE'
  user: { type: String, required: true }, // Admin
  description: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
