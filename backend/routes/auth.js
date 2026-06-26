const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { adminOnly } = require('../middleware/auth');
const crypto = require('crypto');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');

// Register - Admin can create both admin and teamlead accounts
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, role, department } = req.body;
    const userRole = role === 'teamlead' ? 'teamlead' : 'admin';

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    if (userRole === 'teamlead') {
      // Secure check: Only logged-in Admins can create Team Leads
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'Only Admins can create Team Lead accounts' });
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'swms_secret_key_12345');
        if (decoded.role !== 'admin') {
          return res.status(403).json({ message: 'Access denied' });
        }
      } catch (e) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      if (!department) {
        return res.status(400).json({ message: 'Department is required for Team Leads' });
      }
    }

    const existingAdmin = await Admin.findOne({ email, role: userRole });
    if (existingAdmin) {
      return res.status(400).json({ message: 'An account with this email and role already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const adminData = { fullName, email, password: hashedPassword, role: userRole };
    if (userRole === 'teamlead') {
      adminData.department = department;
    }

    const admin = new Admin(adminData);
    await admin.save();

    const tokenPayload = { id: admin._id, role: userRole };
    if (userRole === 'teamlead') tokenPayload.department = department;

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'swms_secret_key_12345', { expiresIn: '1d' });
    res.status(201).json({ token, user: { email, fullName, role: userRole, department: admin.department } });
  } catch (err) {
    console.error('Registration error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login - accepts role to distinguish admin vs teamlead
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const userRole = role === 'teamlead' ? 'teamlead' : 'admin';

    let admin = await Admin.findOne({ email, role: userRole });
    
    if (!admin) {
      // Legacy fallback for admin only
      if (userRole === 'admin') {
        const adminUser = process.env.ADMIN_USERNAME || 'admin';
        const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
        
        if (email === adminUser && password === adminPass) {
          const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'swms_secret_key_12345', { expiresIn: '1d' });
          return res.json({ token, user: { email, fullName: 'Admin', role: 'admin' } });
        }
      }
      return res.status(401).json({ message: 'Email or password is invalid' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email or password is invalid' });
    }

    const tokenPayload = { id: admin._id, role: userRole };
    if (userRole === 'teamlead' && admin.department) tokenPayload.department = admin.department;

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'swms_secret_key_12345', { expiresIn: '1d' });
    return res.json({ token, user: { email: admin.email, fullName: admin.fullName, role: userRole, department: admin.department } });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user info
router.get('/me', auth, async (req, res) => {
  try {
    if (req.user && req.user.id) {
      const admin = await Admin.findById(req.user.id).select('-password');
      if (admin) return res.json({ role: admin.role, user: { email: admin.email, fullName: admin.fullName, role: admin.role, department: admin.department } });
    }
    // Legacy fallback
    res.json({ role: req.user?.role || 'admin', user: { email: process.env.ADMIN_USERNAME || 'admin', fullName: 'Admin', role: req.user?.role || 'admin' } });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Forgot password
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

// Reset password
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

    const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET || 'swms_secret_key_12345', { expiresIn: '1d' });
    res.status(200).json({ token, user: { email: admin.email, fullName: admin.fullName, role: admin.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
