const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  role: { type: String, required: true },
  joiningDate: { type: Date, required: true },
  reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  pin: { type: String, required: true }, // 4-digit verification PIN
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
