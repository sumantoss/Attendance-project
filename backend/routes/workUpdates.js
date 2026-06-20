const express = require('express');
const router = express.Router();
const DailyWorkUpdate = require('../models/DailyWorkUpdate');

// Get all daily work updates (optional ?date=YYYY-MM-DD filter)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) {
      filter.date = req.query.date;
    }
    const updates = await DailyWorkUpdate.find(filter)
      .populate('employee')
      .populate({
        path: 'taskUpdates',
        populate: { path: 'task' }
      })
      .sort({ createdAt: -1 });
    res.json(updates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
