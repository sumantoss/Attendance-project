const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  checkIn: { type: Date, required: true },
  checkOut: { type: Date },
  totalHours: { type: Number, default: 0 }, // in decimal hours
  latitude: { type: Number },
  longitude: { type: Number },
  locationVerified: { type: Boolean, default: false },
  status: { type: String, enum: ['Present', 'Absent', 'Late', 'Early Leave'], default: 'Present' }
}, { timestamps: true });

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
