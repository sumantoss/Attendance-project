// Deprecated: Break model is no longer used in SWMS.
const mongoose = require('mongoose');
const breakSchema = new mongoose.Schema({
  attendance: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }
}, { timestamps: true });
module.exports = mongoose.model('Break', breakSchema);
