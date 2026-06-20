const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  officeLatitude: { type: Number, default: 0.0 },
  officeLongitude: { type: Number, default: 0.0 },
  allowedRadius: { type: Number, default: 150 }, // in meters
  bypassGPS: { type: Boolean, default: false } // Dev toggle to bypass GPS check
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
