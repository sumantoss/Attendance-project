const mongoose = require('mongoose');
const Department = require('./models/Department');
const Employee = require('./models/Employee');
const Project = require('./models/Project');
const Task = require('./models/Task');

const MONGO_URI = 'mongodb://127.0.0.1:27017/swms';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to database successfully.');

    // Clear existing data
    await Department.deleteMany({});
    await Employee.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});

    console.log('Cleared database collections.');

    // Create Departments
    const deptIT = await Department.create({ name: 'Engineering', isActive: true });
    const deptHR = await Department.create({ name: 'Human Resources', isActive: true });
    console.log('Created departments.');

    // Create reporting manager (Employee)
    const manager = await Employee.create({
      employeeId: 'EMP001',
      name: 'John Manager',
      email: 'manager@cropnow.com',
      phone: '1234567890',
      department: deptIT._id,
      role: 'Management',
      joiningDate: new Date(),
      pin: '1111',
      status: 'Active'
    });

    // Create normal employee reporting to manager
    const emp = await Employee.create({
      employeeId: 'EMP002',
      name: 'Alice Developer',
      email: 'alice@cropnow.com',
      phone: '9876543210',
      department: deptIT._id,
      role: 'Employee',
      joiningDate: new Date(),
      reportingManager: manager._id,
      pin: '2222',
      status: 'Active'
    });
    console.log('Created employees with manager references.');

    // Create Project
    const project = await Project.create({
      name: 'Cropnow Mobile Attendance',
      description: 'Mobile applications and scanning kiosks.',
      startDate: new Date(),
      status: 'Active',
      teamMembers: [emp._id, manager._id]
    });
    console.log('Created active project.');

    // Create Tasks
    const task1 = await Task.create({
      project: project._id,
      assignedTo: emp._id,
      title: 'Integrate GPS & Geofencing Validator',
      description: 'Implement geo distance validators on check-in APIs.',
      priority: 'Critical',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      estimatedHours: 12,
      status: 'In Progress'
    });

    const task2 = await Task.create({
      project: project._id,
      assignedTo: emp._id,
      title: 'Design Checkout Blocker Interface',
      description: 'Design form options and blocker forms in modal.',
      priority: 'High',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      estimatedHours: 8,
      status: 'Not Started'
    });
    console.log('Created tasks with Critical and High priority.');

    console.log('Database seeded successfully.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error seeding database:', err.message);
  }
}

seed();
