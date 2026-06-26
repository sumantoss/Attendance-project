const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('Socket client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Socket client disconnected:', socket.id);
  });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Auth middleware
const auth = require('./middleware/auth');
const { adminOnly } = require('./middleware/auth');

// Register API Routes
app.use('/api/auth', require('./routes/auth'));

// Shared routes — accessible by both admin and teamlead
app.use('/api/projects', auth, require('./routes/projects'));
app.use('/api/tasks', auth, require('./routes/tasks'));
app.use('/api/blockers', auth, require('./routes/blockers'));
app.use('/api/notifications', auth, require('./routes/notifications'));
app.use('/api/departments', auth, require('./routes/departments'));
app.use('/api/employees', auth, require('./routes/employees'));

// Admin-only routes — protected with adminOnly middleware
app.use('/api/settings', auth, adminOnly, require('./routes/settings'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/work-updates', auth, adminOnly, require('./routes/workUpdates'));
app.use('/api/performance', auth, adminOnly, require('./routes/performance'));
app.use('/api/dashboard', auth, adminOnly, require('./routes/dashboard'));
app.use('/api/reports', auth, adminOnly, require('./routes/reports'));
app.use('/api/audit-logs', auth, adminOnly, require('./routes/auditLogs'));

// Catch-all route for test purposes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Smart Workforce Management System API' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server!' });
});

// DB Connection and Server Start
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/swms';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err.message);
  });
