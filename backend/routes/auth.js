const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

  if (username === adminUser && password === adminPass) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'swms_secret_key_12345', { expiresIn: '1d' });
    return res.json({ token, username });
  }

  return res.status(401).json({ message: 'Invalid credentials' });
});

router.get('/me', auth, (req, res) => {
  res.json({ role: 'admin', username: process.env.ADMIN_USERNAME || 'admin' });
});

module.exports = router;
