const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new Admin({ fullName, email, password: hashedPassword });
    await admin.save();

    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET || 'swms_secret_key_12345', { expiresIn: '1d' });
    res.status(201).json({ token, user: { email, fullName } });
  } catch (err) {
    console.error('Registration error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    let admin = await Admin.findOne({ email });
    
    if (!admin) {
      // Legacy fallback
      const adminUser = process.env.ADMIN_USERNAME || 'admin';
      const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
      
      if (email === adminUser && password === adminPass) {
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'swms_secret_key_12345', { expiresIn: '1d' });
        return res.json({ token, user: { email, fullName: 'Admin' } });
      }
      return res.status(401).json({ message: 'Email or password is invalid' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email or password is invalid' });
    }

    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET || 'swms_secret_key_12345', { expiresIn: '1d' });
    return res.json({ token, user: { email: admin.email, fullName: admin.fullName } });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    if (req.user && req.user.id) {
      const admin = await Admin.findById(req.user.id).select('-password');
      if (admin) return res.json({ role: 'admin', user: { email: admin.email, fullName: admin.fullName } });
    }
    res.json({ role: 'admin', user: { email: process.env.ADMIN_USERNAME || 'admin', fullName: 'Admin' } });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/forgotpassword', async (req, res) => {
  try {
    const admin = await Admin.findOne({ email: req.body.email });
    if (!admin) {
      return res.status(404).json({ message: 'There is no user with that email' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Hash token and set to resetPasswordToken field
    admin.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    admin.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await admin.save();

    const resetUrl = `http://localhost:5173/admin/reset-password/${resetToken}`;
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: admin.email,
        subject: 'Password reset token',
        message
      });
      res.status(200).json({ message: 'Email sent' });
    } catch (err) {
      admin.resetPasswordToken = undefined;
      admin.resetPasswordExpire = undefined;
      await admin.save();
      console.log('Error sending email:', err);
      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/resetpassword/:resettoken', async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

    const admin = await Admin.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(req.body.password, salt);
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpire = undefined;
    await admin.save();

    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET || 'swms_secret_key_12345', { expiresIn: '1d' });
    res.status(200).json({ token, user: { email: admin.email, fullName: admin.fullName } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
