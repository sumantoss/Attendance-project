import { useState, useEffect, useCallback } from 'react';
import { FaFileDownload, FaSearch } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import api from '../services/api';
import styles from '../styles/AdminCommon.module.css';

function ReportsPage() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);

  // Reports data states
  const [attendanceData, setAttendanceData] = useState([]);
  const [tasksData, setTasksData] = useState([]);
  const [projectsData, setProjectsData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [employeesData, setEmployeesData] = useState([]);

  // Attendance Filters
  const [attFilter, setAttFilter] = useState(() => ({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    employeeId: ''
  }));
  const [attEmployeeName, setAttEmployeeName] = useState('');

  // Task Filters
  const [taskFilter, setTaskFilter] = useState({
    projectId: '',
    employeeId: '',
    status: ''
  });
  const [taskAssigneeName, setTaskAssigneeName] = useState('');

  const loadReportData = useCallback(() => {
    if (activeTab === 'attendance') {
      const query = new URLSearchParams(attFilter).toString();
      api.get(`/reports/attendance?${query}`)
        .then(res => setAttendanceData(res.data))
        .catch(err => console.error(err));
    } else if (activeTab === 'employee') {
      api.get('/employees')
        .then(res => setEmployeesData(res.data))
        .catch(err => console.error(err));
    } else if (activeTab === 'tasks') {
      const query = new URLSearchParams(taskFilter).toString();
      api.get(`/reports/tasks?${query}`)
        .then(res => setTasksData(res.data))
        .catch(err => console.error(err));
    } else if (activeTab === 'projects') {
      api.get('/reports/projects')
        .then(res => setProjectsData(res.data))
        .catch(err => console.error(err));
    } else if (activeTab === 'performance') {
      api.get('/reports/performance')
        .then(res => setPerformanceData(res.data))
        .catch(err => console.error(err));
    }
  }, [activeTab, attFilter, taskFilter]);

  useEffect(() => {
    api.get('/employees')
      .then(res => setEmployees(res.data))
      .catch(err => console.error('Error fetching employees', err));

    api.get('/projects')
      .then(res => setProjects(res.data))
      .catch(err => console.error('Error fetching projects', err));
  }, []);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const exportExcel = (data, filename) => {
    if (data.length === 0) {
      alert('No data to export!');
      return;
    }
    const cleanData = data.map(item => {
      const flat = { ...item };
      if (typeof flat.employee === 'object' && flat.employee !== null) {
        flat.EmployeeName = flat.employee.name;
        flat.EmployeeId = flat.employee.employeeId;
        delete flat.employee;
      }
      if (typeof flat.assignedTo === 'object' && flat.assignedTo !== null) {
        flat.AssignedTo = flat.assignedTo.name;
        delete flat.assignedTo;
      }
      if (typeof flat.project === 'object' && flat.project !== null) {
        flat.ProjectName = flat.project.name;
        delete flat.project;
      }
      delete flat._id;
      delete flat.__v;
      delete flat.createdAt;
      delete flat.updatedAt;
      return flat;
    });

    const worksheet = XLSX.utils.json_to_sheet(cleanData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const exportCSV = (data, filename) => {
    if (data.length === 0) {
      alert('No data to export!');
      return;
    }
    const cleanData = data.map(item => {
      const flat = { ...item };
      if (typeof flat.employee === 'object' && flat.employee !== null) {
        flat.EmployeeName = flat.employee.name;
        flat.EmployeeId = flat.employee.employeeId;
        delete flat.employee;
      }
      if (typeof flat.assignedTo === 'object' && flat.assignedTo !== null) {
        flat.AssignedTo = flat.assignedTo.name;
        delete flat.assignedTo;
      }
      if (typeof flat.project === 'object' && flat.project !== null) {
        flat.ProjectName = flat.project.name;
        delete flat.project;
      }
      delete flat._id;
      delete flat.__v;
      delete flat.createdAt;
      delete flat.updatedAt;
      return flat;
    });

    const worksheet = XLSX.utils.json_to_sheet(cleanData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.card}>
      {/* Report Type tabs */}
      <div className={styles.tabs}>
        {[
          { id: 'attendance', label: 'Attendance Logs' },
          { id: 'employee', label: 'Employee Reports' },
          { id: 'tasks', label: 'Task Reports' },
          { id: 'projects', label: 'Project Progress' },
          { id: 'performance', label: 'Performance Metrics' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Attendance Log Section */}
      {activeTab === 'attendance' && (
        <>
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>From:</span>
              <input
                type="date"
                className={styles.filterInput}
                value={attFilter.startDate}
                onChange={(e) => setAttFilter({ ...attFilter, startDate: e.target.value })}
              />
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>To:</span>
              <input
                type="date"
                className={styles.filterInput}
                value={attFilter.endDate}
                onChange={(e) => setAttFilter({ ...attFilter, endDate: e.target.value })}
              />
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Employee:</span>
              <input
                list="att-employee-options"
                className={styles.filterInput}
                placeholder="All Employees"
                value={attEmployeeName}
                onChange={(e) => {
                  setAttEmployeeName(e.target.value);
                  const matched = employees.find(emp => emp.name.toLowerCase() === e.target.value.toLowerCase());
                  setAttFilter({ ...attFilter, employeeId: matched ? matched._id : '' });
                }}
              />
              <datalist id="att-employee-options">
                {employees.map(emp => (
                  <option key={emp._id} value={emp.name} />
                ))}
              </datalist>
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '8px 14px' }} onClick={loadReportData}>
              <FaSearch /> Search
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => exportCSV(attendanceData, 'Attendance_Report')}>
                CSV
              </button>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => exportExcel(attendanceData, 'Attendance_Report')}>
                <FaFileDownload /> Excel
              </button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Date</th>
                  <th className={styles.th}>Employee</th>
                  <th className={styles.th}>Check-In</th>
                  <th className={styles.th}>Check-Out</th>
                  <th className={styles.th}>Hours Worked</th>
                  <th className={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.td} style={{ textAlign: 'center' }}>No attendance logs match query filters.</td>
                  </tr>
                ) : (
                  attendanceData.map(att => (
                    <tr key={att._id} className={styles.tr}>
                      <td className={styles.td} style={{ fontWeight: '600' }}>{new Date(att.date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className={styles.td}>{att.employee?.name}</td>
                      <td className={styles.td}>{new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className={styles.td}>
                        {att.checkOut
                          ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : <span className={`${styles.badge} ${styles.badgeSuccess}`}>ACTIVE</span>
                        }
                      </td>
                      <td className={styles.td} style={{ fontWeight: '500' }}>{att.totalHours || '0'} hrs</td>
                      <td className={styles.td}>
                        <span className={`${styles.badge} ${att.status === 'Present' ? styles.badgeSuccess : att.status === 'Late' ? styles.badgeWarning : styles.badgeDanger
                          }`}>
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 2. Tasks Reports Section */}
      {activeTab === 'tasks' && (
        <>
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Project:</span>
              <select
                className={styles.filterSelect}
                value={taskFilter.projectId}
                onChange={(e) => setTaskFilter({ ...taskFilter, projectId: e.target.value })}
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Assignee:</span>
              <input
                list="task-assignee-options"
                className={styles.filterInput}
                placeholder="All Assignees"
                value={taskAssigneeName}
                onChange={(e) => {
                  setTaskAssigneeName(e.target.value);
                  const matched = employees.find(emp => emp.name.toLowerCase() === e.target.value.toLowerCase());
                  setTaskFilter({ ...taskFilter, employeeId: matched ? matched._id : '' });
                }}
              />
              <datalist id="task-assignee-options">
                {employees.map(emp => (
                  <option key={emp._id} value={emp.name} />
                ))}
              </datalist>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Status:</span>
              <select
                className={styles.filterSelect}
                value={taskFilter.status}
                onChange={(e) => setTaskFilter({ ...taskFilter, status: e.target.value })}
              >
                <option value="">All Statuses</option>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Blocked">Blocked</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '8px 14px' }} onClick={loadReportData}>
              <FaSearch /> Search
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => exportCSV(tasksData, 'Tasks_Report')}>
                CSV
              </button>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => exportExcel(tasksData, 'Tasks_Report')}>
                <FaFileDownload /> Excel
              </button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Project</th>
                  <th className={styles.th}>Task Title</th>
                  <th className={styles.th}>Assignee</th>
                  <th className={styles.th}>Priority</th>
                  <th className={styles.th}>Deadline</th>
                  <th className={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasksData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.td} style={{ textAlign: 'center' }}>No tasks matches query filters.</td>
                  </tr>
                ) : (
                  tasksData.map(task => (
                    <tr key={task._id} className={styles.tr}>
                      <td className={styles.td} style={{ fontWeight: '500' }}>{task.project?.name}</td>
                      <td className={styles.td}>{task.title}</td>
                      <td className={styles.td}>{task.assignedTo?.name}</td>
                      <td className={styles.td}>
                        <span className={`${styles.badge} ${task.priority === 'High' ? styles.badgeDanger : task.priority === 'Medium' ? styles.badgeWarning : styles.badgeSuccess
                          }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className={styles.td}>
                        {task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}
                      </td>
                      <td className={styles.td}>
                        <span className={`${styles.badge} ${task.status === 'Completed' ? styles.badgeSuccess : task.status === 'Blocked' ? styles.badgeDanger : styles.badgeWarning
                          }`}>
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 3. Projects Report Section */}
      {activeTab === 'projects' && (
        <>
          <div className={styles.filters} style={{ justifyContent: 'flex-end' }}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => exportCSV(projectsData, 'Projects_Report')}>
              CSV
            </button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => exportExcel(projectsData, 'Projects_Report')}>
              <FaFileDownload /> Excel
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Project Name</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Team Count</th>
                  <th className={styles.th}>Total Tasks</th>
                  <th className={styles.th}>Completed Tasks</th>
                  <th className={styles.th}>Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                {projectsData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.td} style={{ textAlign: 'center' }}>No active projects recorded.</td>
                  </tr>
                ) : (
                  projectsData.map(proj => (
                    <tr key={proj._id} className={styles.tr}>
                      <td className={styles.td} style={{ fontWeight: '600' }}>{proj.name}</td>
                      <td className={styles.td}>
                        <span className={`${styles.badge} ${proj.status === 'Active' ? styles.badgeSuccess : styles.badgeWarning}`}>
                          {proj.status}
                        </span>
                      </td>
                      <td className={styles.td} style={{ fontWeight: '500' }}>{proj.teamCount} members</td>
                      <td className={styles.td}>{proj.totalTasks}</td>
                      <td className={styles.td}>{proj.completedTasks}</td>
                      <td className={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: '1', backgroundColor: '#E2E8F0', height: '6px', width: '80px', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ backgroundColor: 'var(--color-success)', height: '100%', width: `${proj.completionRate}%` }} />
                          </div>
                          <span style={{ fontWeight: '600', fontSize: '0.8rem' }}>{proj.completionRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 4. Performance Report Section */}
      {activeTab === 'performance' && (
        <>
          <div className={styles.filters} style={{ justifyContent: 'flex-end' }}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => exportCSV(performanceData, 'Performance_Report')}>
              CSV
            </button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => exportExcel(performanceData, 'Performance_Report')}>
              <FaFileDownload /> Excel
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Employee</th>
                  <th className={styles.th}>Department</th>
                  <th className={styles.th}>Days Present</th>
                  <th className={styles.th}>Avg. Daily Hours</th>
                  <th className={styles.th}>Late Arrivals</th>
                  <th className={styles.th}>Tasks Assigned</th>
                  <th className={styles.th}>Tasks Completed</th>
                  <th className={styles.th}>Task Completion %</th>
                </tr>
              </thead>
              <tbody>
                {performanceData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className={styles.td} style={{ textAlign: 'center' }}>No active employees found.</td>
                  </tr>
                ) : (
                  performanceData.map(perf => (
                    <tr key={perf._id} className={styles.tr}>
                      <td className={styles.td} style={{ fontWeight: '600' }}>
                        <div>{perf.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 'normal' }}>{perf.role}</div>
                      </td>
                      <td className={styles.td}>{perf.department}</td>
                      <td className={styles.td} style={{ fontWeight: '500' }}>{perf.presentDays} days</td>
                      <td className={styles.td}>{perf.avgHours} hrs</td>
                      <td className={styles.td}>
                        <span className={`${styles.badge} ${perf.lateArrivals > 2 ? styles.badgeDanger : perf.lateArrivals > 0 ? styles.badgeWarning : styles.badgeSuccess}`}>
                          {perf.lateArrivals} times
                        </span>
                      </td>
                      <td className={styles.td}>{perf.tasksAssigned}</td>
                      <td className={styles.td}>{perf.tasksCompleted}</td>
                      <td className={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: '1', backgroundColor: '#E2E8F0', height: '6px', width: '60px', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ backgroundColor: 'var(--color-primary)', height: '100%', width: `${perf.taskCompletionRate}%` }} />
                          </div>
                          <span style={{ fontWeight: '600', fontSize: '0.8rem' }}>{perf.taskCompletionRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 5. Employee Reports Section */}
      {activeTab === 'employee' && (
        <>
          <div className={styles.filters} style={{ justifyContent: 'flex-end' }}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => exportCSV(employeesData, 'Employee_Report')}>
              CSV
            </button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => exportExcel(employeesData, 'Employee_Report')}>
              <FaFileDownload /> Excel
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Employee ID</th>
                  <th className={styles.th}>Name</th>
                  <th className={styles.th}>Email</th>
                  <th className={styles.th}>Phone</th>
                  <th className={styles.th}>Department</th>
                  <th className={styles.th}>Role</th>
                  <th className={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {employeesData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.td} style={{ textAlign: 'center' }}>No employees found.</td>
                  </tr>
                ) : (
                  employeesData.map(emp => (
                    <tr key={emp._id} className={styles.tr}>
                      <td className={styles.td} style={{ fontWeight: '600' }}>{emp.employeeId}</td>
                      <td className={styles.td} style={{ fontWeight: '600' }}>{emp.name}</td>
                      <td className={styles.td}>{emp.email || '-'}</td>
                      <td className={styles.td}>{emp.phone || '-'}</td>
                      <td className={styles.td}>{emp.department?.name || 'Unassigned'}</td>
                      <td className={styles.td}>{emp.role}</td>
                      <td className={styles.td}>
                        <span className={`${styles.badge} ${emp.status === 'Active' ? styles.badgeSuccess : styles.badgeMuted}`}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default ReportsPage;
