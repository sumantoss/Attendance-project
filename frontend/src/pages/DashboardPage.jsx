import { useState, useEffect } from 'react';
import { 
  FaUsers, FaUserCheck, FaUserTimes, FaClock, 
  FaFolder, FaEdit, FaExclamationTriangle, FaListAlt, FaTimes, FaArrowRight
} from 'react-icons/fa';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import api from '../services/api';
import styles from '../styles/DashboardPage.module.css';
import { io } from 'socket.io-client';

const COLORS = ['#4d8c58', '#030303', '#7b7b7b', '#d64545'];

function DashboardPage() {
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    activeProjects: 0,
    pendingTasks: 0,
    openBlockers: 0,
    pendingDailyUpdates: 0
  });

  const [charts, setCharts] = useState({
    attendanceTrend: [],
    departmentData: [],
    taskData: []
  });

  const [recentUpdates, setRecentUpdates] = useState([]);
  const [blockers, setBlockers] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // KPI Detail Modal state
  const [kpiModal, setKpiModal] = useState({ open: false, title: '', data: [], columns: [], loading: false });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadAllData = () => {
      api.get('/dashboard/summary')
        .then(res => setSummary(res.data))
        .catch(err => console.error(err));

      api.get('/dashboard/charts')
        .then(res => setCharts(res.data))
        .catch(err => console.error(err));

      const todayStr = new Date().toISOString().split('T')[0];
      api.get(`/work-updates?date=${todayStr}`)
        .then(res => setRecentUpdates(res.data.slice(0, 5)))
        .catch(err => console.error(err));

      api.get('/blockers')
        .then(res => setBlockers(res.data.filter(b => b.status === 'Open' || b.status === 'In Review').slice(0, 5)))
        .catch(err => console.error(err));

      api.get('/reports/performance')
        .then(res => setPerformance(res.data))
        .catch(err => console.error(err));
    };

    loadAllData();

    const socketUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'http://localhost:5000';
    const socket = io(socketUrl);

    socket.on('dashboard-update', () => {
      loadAllData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const sortedPerformance = [...performance].sort((a, b) => b.taskCompletionRate - a.taskCompletionRate);
  const topPerformers = sortedPerformance.filter(p => p.taskCompletionRate >= 80).slice(0, 3);
  const needsAttention = sortedPerformance.filter(p => p.taskCompletionRate < 50 || p.overdueTasks > 1).slice(0, 3);

  // Handle KPI card click
  const handleKpiClick = async (kpiKey, kpiTitle) => {
    setKpiModal({ open: true, title: kpiTitle, data: [], columns: [], loading: true });
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      let data = [];
      let columns = [];

      switch (kpiKey) {
        case 'totalEmployees': {
          const res = await api.get('/employees');
          data = res.data.filter(e => e.status === 'Active').map(e => ({
            name: e.name,
            id: e.employeeId,
            dept: e.department?.name || '—',
            role: e.role || '—',
            status: e.status
          }));
          columns = ['Name', 'Emp ID', 'Department', 'Role', 'Status'];
          break;
        }
        case 'presentToday': {
          const res = await api.get(`/reports/attendance?startDate=${todayStr}&endDate=${todayStr}`);
          data = res.data.map(a => ({
            name: a.employee?.name || '—',
            id: a.employee?.employeeId || '—',
            checkIn: a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
            checkOut: a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Still In',
            status: a.status || 'On Time'
          }));
          columns = ['Name', 'Emp ID', 'Check In', 'Check Out', 'Status'];
          break;
        }
        case 'absentToday': {
          const [empRes, attRes] = await Promise.all([
            api.get('/employees'),
            api.get(`/reports/attendance?startDate=${todayStr}&endDate=${todayStr}`)
          ]);
          const presentIds = new Set(attRes.data.map(a => a.employee?._id));
          data = empRes.data
            .filter(e => e.status === 'Active' && !presentIds.has(e._id))
            .map(e => ({
              name: e.name,
              id: e.employeeId,
              dept: e.department?.name || '—',
              role: e.role || '—',
              status: 'Absent'
            }));
          columns = ['Name', 'Emp ID', 'Department', 'Role', 'Status'];
          break;
        }
        case 'lateToday': {
          const res = await api.get(`/reports/attendance?startDate=${todayStr}&endDate=${todayStr}`);
          data = res.data.filter(a => a.status === 'Late').map(a => ({
            name: a.employee?.name || '—',
            id: a.employee?.employeeId || '—',
            checkIn: a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
            checkOut: a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Still In',
            status: 'Late'
          }));
          columns = ['Name', 'Emp ID', 'Check In', 'Check Out', 'Status'];
          break;
        }
        case 'activeProjects': {
          const res = await api.get('/projects');
          data = res.data.filter(p => p.status === 'Active').map(p => ({
            name: p.name,
            id: p._id.slice(-6).toUpperCase(),
            dept: p.description || '—',
            role: `${p.teamMembers?.length || 0} members`,
            status: p.status
          }));
          columns = ['Project Name', 'ID', 'Description', 'Team Size', 'Status'];
          break;
        }
        case 'pendingTasks': {
          const res = await api.get('/tasks');
          data = res.data
            .filter(t => ['Not Started', 'In Progress', 'Blocked'].includes(t.status))
            .map(t => ({
              name: t.title,
              id: t.assignedTo?.name || '—',
              dept: t.project?.name || '—',
              role: t.priority || '—',
              status: t.status
            }));
          columns = ['Task Title', 'Assigned To', 'Project', 'Priority', 'Status'];
          break;
        }
        case 'openBlockers': {
          const res = await api.get('/blockers');
          data = res.data.filter(b => b.status === 'Open').map(b => ({
            name: b.description?.substring(0, 50) || '—',
            id: b.employee?.name || '—',
            dept: b.task?.title || '—',
            role: b.type || '—',
            status: b.priority || '—'
          }));
          columns = ['Description', 'Raised By', 'Task', 'Type', 'Priority'];
          break;
        }
        case 'pendingEOD': {
          const [attRes, empRes] = await Promise.all([
            api.get(`/reports/attendance?startDate=${todayStr}&endDate=${todayStr}`),
            api.get('/employees')
          ]);
          const checkedInNotOut = attRes.data.filter(a => !a.checkOut);
          const empMap = {};
          empRes.data.forEach(e => { empMap[e._id] = e; });
          data = checkedInNotOut.map(a => {
            const emp = a.employee || empMap[a.employee] || {};
            return {
              name: emp.name || '—',
              id: emp.employeeId || '—',
              dept: emp.department?.name || '—',
              checkIn: a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
              status: 'Pending Checkout'
            };
          });
          columns = ['Name', 'Emp ID', 'Department', 'Check In', 'Status'];
          break;
        }
        default:
          break;
      }

      setKpiModal({ open: true, title: kpiTitle, data, columns, loading: false });
    } catch (err) {
      console.error('Failed to load KPI detail:', err);
      setKpiModal({ open: true, title: kpiTitle, data: [], columns: [], loading: false });
    }
  };

  const kpis = [
    { key: 'totalEmployees', title: 'Total Employees', value: summary.totalEmployees, icon: <FaUsers />, color: '#4d8c58', bg: '#f5faf2' },
    { key: 'presentToday', title: 'Present Today', value: summary.presentToday, icon: <FaUserCheck />, color: '#4d8c58', bg: '#f5faf2' },
    { key: 'absentToday', title: 'Absent Today', value: summary.absentToday, icon: <FaUserTimes />, color: '#d64545', bg: '#fee2e2' },
    { key: 'lateToday', title: 'Late Arrivals', value: summary.lateToday, icon: <FaClock />, color: '#d64545', bg: '#fee2e2' },
    { key: 'activeProjects', title: 'Active Projects', value: summary.activeProjects, icon: <FaFolder />, color: '#030303', bg: '#e5e7eb' },
    { key: 'pendingTasks', title: 'Pending Tasks', value: summary.pendingTasks, icon: <FaListAlt />, color: '#030303', bg: '#e5e7eb' },
    { key: 'openBlockers', title: 'Open Blockers', value: summary.openBlockers, icon: <FaExclamationTriangle />, color: '#d64545', bg: '#fee2e2' },
    { key: 'pendingEOD', title: 'Pending EOD', value: summary.pendingDailyUpdates, icon: <FaEdit />, color: '#d64545', bg: '#fee2e2' },
  ];

  const getStatusBadgeClass = (status) => {
    if (['Active', 'On Time', 'Completed'].includes(status)) return styles.badgeSuccess;
    if (['Late', 'Absent', 'Open', 'High', 'Critical', 'Blocked', 'Early Leave'].includes(status)) return styles.badgeDanger;
    if (['In Progress', 'Still In', 'Pending Checkout', 'Medium'].includes(status)) return styles.badgeWarning;
    return styles.badgeInfo;
  };

  return (
    <div>
      {/* Alert Banner */}
      {(summary.lateToday > 0 || summary.openBlockers > 0) && (
        <div className={styles.alertBanner}>
          <FaExclamationTriangle style={{ fontSize: '1rem', flexShrink: 0 }} />
          <span>
            <strong>Action Required:</strong> {summary.lateToday} late arrival(s) and {summary.openBlockers} open blocker(s) need review.
          </span>
        </div>
      )}

      {/* Shift Clock Banner */}
      <div className={styles.shiftBanner}>
        <div className={styles.shiftDotWrap}>
          <div className={styles.pulseDot}></div>
          <span className={styles.shiftLabel}>Shift Active</span>
        </div>
        <span className={styles.shiftTime}>
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        <span className={styles.shiftDate}>
          {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* KPI Metrics */}
      <div className={styles.metricsGrid}>
        {kpis.map((kpi, idx) => (
          <div 
            key={idx} 
            className={styles.kpiCard} 
            onClick={() => handleKpiClick(kpi.key, kpi.title)} 
            style={{ '--kpi-accent': kpi.color, '--kpi-bg': kpi.bg, cursor: 'pointer' }}
          >
            <div className={styles.kpiHeader}>
              <div className={styles.kpiTitleGroup}>
                <span className={styles.kpiTitle}>{kpi.title}</span>
              </div>
              <div className={styles.kpiIconWrapper}>
                {kpi.icon}
              </div>
            </div>
            <span className={styles.kpiValue}>{kpi.value}</span>
            <span className={styles.kpiFooter}>
              View details <FaArrowRight style={{ fontSize: '0.55rem' }} />
            </span>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className={styles.chartsGrid}>
        {/* Attendance Trends */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>7-Day Attendance Trend</h2>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.attendanceTrend}>
                <defs>
                  <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4d8c58" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#4d8c58" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradLate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d64545" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#d64545" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.5} />
                <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} allowDecimals={false} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-surface)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    fontSize: '14px',
                    fontFamily: 'var(--font-family-utility)',
                    fontWeight: 500,
                    boxShadow: 'var(--shadow-md)',
                  }} 
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                />
                <Legend iconType="square" wrapperStyle={{ paddingTop: '12px', fontSize: '14px', fontFamily: 'var(--font-family-utility)' }} />
                <Area type="monotone" dataKey="Present" stroke="#4d8c58" strokeWidth={2} fill="url(#gradPresent)" dot={{ r: 3, fill: '#4d8c58', stroke: 'var(--bg-surface)', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="Late" stroke="#d64545" strokeWidth={2} fill="url(#gradLate)" dot={{ r: 3, fill: '#d64545', stroke: 'var(--bg-surface)', strokeWidth: 2 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Distribution Pie */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Task Distribution</h2>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.taskData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {charts.taskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-surface)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    fontSize: '14px',
                    fontFamily: 'var(--font-family-utility)',
                    fontWeight: 500,
                    boxShadow: 'var(--shadow-md)',
                  }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="square" wrapperStyle={{ fontSize: '14px', fontFamily: 'var(--font-family-utility)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Department Headcounts */}
      <div className={styles.chartsGrid} style={{ gridTemplateColumns: '1fr' }}>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Department Headcounts</h2>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.departmentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} opacity={0.5} />
                <XAxis type="number" stroke="var(--text-secondary)" fontSize={11} allowDecimals={false} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
                <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" fontSize={11} width={100} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} fontWeight={600} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-surface)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    fontSize: '14px',
                    fontFamily: 'var(--font-family-utility)',
                    fontWeight: 500,
                    boxShadow: 'var(--shadow-md)',
                  }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                />
                <Bar dataKey="value" fill="#4d8c58" name="Headcount" barSize={24} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Blockers */}
      <div className={styles.recentGrid} style={{ gridTemplateColumns: '1fr' }}>
        <div className={styles.recentCard}>
          <h2 className={styles.recentTitle}>
            Open Blockers
            <span className={styles.count} style={{ background: blockers.length > 0 ? '#fee2e2' : '#f5faf2', color: blockers.length > 0 ? '#d64545' : '#4d8c58' }}>
              {blockers.length}
            </span>
          </h2>
          <div className={styles.list}>
            {blockers.length === 0 ? (
              <div className={styles.emptyState}>No open blockers logged.</div>
            ) : (
              blockers.map(b => (
                <div key={b._id} className={styles.listItem}>
                  <div className={styles.listItemHeader}>
                    <span className={styles.listItemTitle}>{b.task?.title || 'Standalone Blocker'}</span>
                    <span className={`${styles.badge} ${b.priority === 'Critical' || b.priority === 'High' ? styles.badgeDanger : styles.badgeWarning}`}>{b.priority}</span>
                  </div>
                  <div className={styles.listItemMeta}>
                    {b.type} · Raised by <strong>{b.employee?.name}</strong>
                  </div>
                  <div className={styles.listItemDesc}>{b.description}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Performance & EOD Updates */}
      <div className={styles.recentGrid}>
        {/* Performance Snapshot */}
        <div className={styles.recentCard}>
          <h2 className={styles.recentTitle}>Performance Snapshot</h2>
          <div className={styles.perfGrid}>
            <div className={styles.perfSection}>
              <span className={styles.perfLabel} style={{ color: '#4d8c58' }}>Top Performers</span>
              {topPerformers.length === 0 ? (
                <div className={styles.emptyState}>No data available.</div>
              ) : (
                topPerformers.map(p => (
                  <div key={p._id} className={styles.perfItem}>
                    <span className={styles.perfName}>{p.name}</span>
                    <span className={styles.perfValue} style={{ background: '#f5faf2', color: '#4d8c58' }}>{p.taskCompletionRate}%</span>
                  </div>
                ))
              )}
            </div>
            <div className={styles.perfSection}>
              <span className={styles.perfLabel} style={{ color: '#d64545' }}>Needs Attention</span>
              {needsAttention.length === 0 ? (
                <div className={styles.emptyState}>No data available.</div>
              ) : (
                needsAttention.map(p => (
                  <div key={p._id} className={styles.perfItem}>
                    <span className={styles.perfName}>{p.name}</span>
                    <span className={styles.perfValue} style={{ background: '#fee2e2', color: '#d64545' }}>{p.overdueTasks} overdue</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* EOD Updates */}
        <div className={styles.recentCard}>
          <h2 className={styles.recentTitle}>
            Today's EOD Updates
            <span className={styles.count} style={{ background: '#f5faf2', color: '#4d8c58' }}>
              {recentUpdates.length}
            </span>
          </h2>
          <div className={styles.list}>
            {recentUpdates.length === 0 ? (
              <div className={styles.emptyState}>No daily updates submitted today.</div>
            ) : (
              recentUpdates.map(up => (
                <div key={up._id} className={styles.listItem}>
                  <div className={styles.listItemHeader}>
                    <span className={styles.listItemTitle}>{up.employee?.name}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7A70' }}>
                      {up.totalHoursWorked} hrs
                    </span>
                  </div>
                  <div className={styles.listItemDesc} style={{ fontStyle: 'normal' }}>
                    {up.eodReport}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* KPI Detail Modal */}
      {kpiModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }} onClick={() => setKpiModal({ ...kpiModal, open: false })}>
          <div style={{
            background: 'var(--bg-surface)', width: '100%', maxWidth: '720px',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            border: '1px solid var(--border-color)',
            animation: 'scaleIn 0.2s ease',
            borderRadius: '10px', overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--bg-canvas)'
            }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{kpiModal.title}</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {kpiModal.loading ? 'Loading...' : `${kpiModal.data.length} result(s)`}
                </span>
              </div>
              <button onClick={() => setKpiModal({ ...kpiModal, open: false })} style={{
                width: '32px', height: '32px', border: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: '0.9rem'
              }}>
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '0', overflowY: 'auto', overflowX: 'auto', flex: 1 }}>
              {kpiModal.loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Loading details...
                </div>
              ) : kpiModal.data.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  No records found.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr>
                      {kpiModal.columns.map((col, i) => (
                        <th key={i} style={{
                          padding: '10px 16px', textAlign: 'left', background: 'var(--bg-canvas)',
                          color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.72rem',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kpiModal.data.map((row, i) => {
                      const vals = Object.values(row);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          {vals.map((v, j) => (
                            <td key={j} style={{
                              padding: '11px 16px', color: j === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                              fontWeight: j === 0 ? 600 : 400
                            }}>
                              {j === vals.length - 1 ? (
                                <span className={`${styles.badge} ${getStatusBadgeClass(v)}`}>{v}</span>
                              ) : v}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
