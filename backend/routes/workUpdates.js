const express = require('express');
const router = express.Router();
const DailyWorkUpdate = require('../models/DailyWorkUpdate');

// Get all daily work updates
router.get('/', async (req, res) => {
  try {
    const updates = await DailyWorkUpdate.find()
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
