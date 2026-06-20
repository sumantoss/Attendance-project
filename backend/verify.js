const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Blocker = require('./models/Blocker');
const DailyWorkUpdate = require('./models/DailyWorkUpdate');
const TaskUpdate = require('./models/TaskUpdate');

const MONGO_URI = 'mongodb://127.0.0.1:27017/swms';

async function verifyFlow() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('--- SYSTEM VERIFICATION STARTED ---');

    // 1. Fetch Alice (EMP002)
    const alice = await Employee.findOne({ employeeId: 'EMP002' });
    if (!alice) {
      throw new Error('Alice (EMP002) not found in database. Seed the database first.');
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Reset today's attendance/updates for test reproducibility
    await Attendance.deleteOne({ employee: alice._id, date: todayStr });
    await DailyWorkUpdate.deleteOne({ employee: alice._id, date: todayStr });
    console.log('Cleaned up previous attendance logs for today.');

    // 2. Perform Check-in
    const checkInRecord = await Attendance.create({
      employee: alice._id,
      date: todayStr,
      checkIn: new Date(),
      latitude: 12.9715,
      longitude: 77.5946,
      locationVerified: true,
      status: 'Present'
    });
    console.log('Alice Checked In.');

    // 3. Find Tasks assigned to Alice
    const tasks = await Task.find({ assignedTo: alice._id });
    if (tasks.length < 2) {
      throw new Error('Seeded tasks missing for Alice.');
    }

    const task1 = tasks[0];
    const task2 = tasks[1];

    console.log(`Task 1: "${task1.title}" (Current Status: ${task1.status})`);
    console.log(`Task 2: "${task2.title}" (Current Status: ${task2.status})`);

    // 4. Construct check-out payload
    const workedTasks = [
      {
        task: task1._id,
        hoursWorked: 5,
        progressPercent: 40,
        status: 'In Progress',
        workSummary: 'Integrated geofencing validators and coordinates distance helper.',
        subtarget: 'Complete geolocation triggers'
      },
      {
        task: task2._id,
        hoursWorked: 3.5,
        progressPercent: 90,
        status: 'In Progress',
        workSummary: 'Built blocker panels in checkout modal view.',
        subtarget: 'Implement checkout blockers popup UI',
        blocker: {
          type: 'Technical Issue',
          description: 'Need assets for UI layouts.',
          priority: 'High'
        }
      }
    ];

    // Programmatically execute Checkout logic (mimic router handler)
    const now = new Date();
    checkInRecord.checkOut = now;
    checkInRecord.totalHours = workedTasks.reduce((sum, t) => sum + t.hoursWorked, 0);
    await checkInRecord.save();

    const dailyUpdate = await DailyWorkUpdate.create({
      attendance: checkInRecord._id,
      employee: alice._id,
      date: todayStr,
      taskUpdates: [],
      totalHoursWorked: checkInRecord.totalHours,
      eodReport: ''
    });

    const taskUpdateIds = [];
    const summaries = [];

    for (const item of workedTasks) {
      const taskObj = await Task.findById(item.task);
      
      let blockerId = null;
      if (item.blocker) {
        const blockerRecord = await Blocker.create({
          task: taskObj._id,
          employee: alice._id,
          description: item.blocker.description,
          type: item.blocker.type,
          priority: item.blocker.priority || 'Medium',
          assignedReviewer: alice.reportingManager || alice._id,
          status: 'Open'
        });
        blockerId = blockerRecord._id;
        console.log(`Blocker Raised: "${item.blocker.description}" on task "${taskObj.title}".`);
      }

      const taskUpdateRecord = await TaskUpdate.create({
        task: taskObj._id,
        employee: alice._id,
        dailyWorkUpdate: dailyUpdate._id,
        hoursWorked: item.hoursWorked,
        progressPercent: item.progressPercent,
        status: blockerId ? 'Blocked' : item.status,
        workSummary: item.workSummary,
        subtarget: item.subtarget,
        blocker: blockerId
      });

      taskUpdateIds.push(taskUpdateRecord._id);
      summaries.push(`- [${taskObj.title}]: ${item.workSummary} (Subtarget: ${item.subtarget})`);

      // Update Task status & metrics
      taskObj.actualHoursSpent = (taskObj.actualHoursSpent || 0) + item.hoursWorked;
      taskObj.progressPercent = item.progressPercent;
      taskObj.status = blockerId ? 'Blocked' : item.status;
      await taskObj.save();

      // Update Project progress
      const projectTasks = await Task.find({ project: taskObj.project });
      const avgProgress = Math.round(
        projectTasks.reduce((sum, t) => sum + (t.progressPercent || 0), 0) / projectTasks.length
      );
      await Project.findByIdAndUpdate(taskObj.project, { progressPercent: avgProgress });
    }

    dailyUpdate.taskUpdates = taskUpdateIds;
    dailyUpdate.eodReport = summaries.join('\n');
    await dailyUpdate.save();

    console.log('Alice Checked Out & EOD Work Update Submitted.');

    // 5. Verification checks
    console.log('\n--- VERIFICATION CHECKS ---');
    
    // Check 1: Attendance hours
    const updatedAtt = await Attendance.findById(checkInRecord._id);
    console.log(`Attendance hours worked: ${updatedAtt.totalHours} hrs (Expected: 8.5) - ${updatedAtt.totalHours === 8.5 ? 'PASS' : 'FAIL'}`);

    // Check 2: Task 1 progress and hours
    const updatedTask1 = await Task.findById(task1._id);
    console.log(`Task 1 Status: ${updatedTask1.status} (Expected: In Progress) - ${updatedTask1.status === 'In Progress' ? 'PASS' : 'FAIL'}`);
    console.log(`Task 1 Hours: ${updatedTask1.actualHoursSpent} (Expected: 5) - ${updatedTask1.actualHoursSpent === 5 ? 'PASS' : 'FAIL'}`);

    // Check 3: Task 2 Blocked status
    const updatedTask2 = await Task.findById(task2._id);
    console.log(`Task 2 Status: ${updatedTask2.status} (Expected: Blocked due to raised blocker) - ${updatedTask2.status === 'Blocked' ? 'PASS' : 'FAIL'}`);

    // Check 4: Project average progress recalculation
    const updatedProject = await Project.findById(task1.project);
    const expectedProjProgress = Math.round((40 + 90) / 2); // 65%
    console.log(`Project ProgressRecalculation: ${updatedProject.progressPercent}% (Expected: ${expectedProjProgress}%) - ${updatedProject.progressPercent === expectedProjProgress ? 'PASS' : 'FAIL'}`);

    console.log('--- SYSTEM VERIFICATION COMPLETED ---');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Verification failed:', err.message);
  }
}

verifyFlow();
