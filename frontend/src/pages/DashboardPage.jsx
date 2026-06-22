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

const COLORS = ['#28593D', '#D4E05B', '#315C85', '#C84C31'];

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
    { key: 'totalEmployees', title: 'Total Employees', value: summary.totalEmployees, icon: <FaUsers />, color: '#28593D', bg: '#E6EBE8' },
    { key: 'presentToday', title: 'Present Today', value: summary.presentToday, icon: <FaUserCheck />, color: '#28593D', bg: '#E6EBE8' },
    { key: 'absentToday', title: 'Absent Today', value: summary.absentToday, icon: <FaUserTimes />, color: '#C84C31', bg: '#F5E2DF' },
    { key: 'lateToday', title: 'Late Arrivals', value: summary.lateToday, icon: <FaClock />, color: '#92400E', bg: '#FEF3C7' },
    { key: 'activeProjects', title: 'Active Projects', value: summary.activeProjects, icon: <FaFolder />, color: '#315C85', bg: '#E0E8F0' },
    { key: 'pendingTasks', title: 'Pending Tasks', value: summary.pendingTasks, icon: <FaListAlt />, color: '#315C85', bg: '#E0E8F0' },
    { key: 'openBlockers', title: 'Open Blockers', value: summary.openBlockers, icon: <FaExclamationTriangle />, color: '#C84C31', bg: '#F5E2DF' },
    { key: 'pendingEOD', title: 'Pending EOD', value: summary.pendingDailyUpdates, icon: <FaEdit />, color: '#92400E', bg: '#FEF3C7' },
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
                    <stop offset="5%" stopColor="#28593D" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#28593D" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradLate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C84C31" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#C84C31" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} opacity={0.5} />
                <XAxis dataKey="day" stroke="#9CA8A0" fontSize={11} tickLine={false} axisLine={{ stroke: 'var(--border-light)' }} />
                <YAxis stroke="#9CA8A0" fontSize={11} allowDecimals={false} tickLine={false} axisLine={{ stroke: 'var(--border-light)' }} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(255, 255, 255, 0.95)', 
                    border: 'none', 
                    borderRadius: '12px', 
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                    backdropFilter: 'blur(10px)'
                  }} 
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                />
                <Legend iconType="square" wrapperStyle={{ paddingTop: '12px', fontSize: '0.8rem' }} />
                <Area type="monotone" dataKey="Present" stroke="#28593D" strokeWidth={2} fill="url(#gradPresent)" dot={{ r: 3, fill: '#28593D', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="Late" stroke="#C84C31" strokeWidth={2} fill="url(#gradLate)" dot={{ r: 3, fill: '#C84C31', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} />
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
                    background: 'rgba(255, 255, 255, 0.95)', 
                    border: 'none', 
                    borderRadius: '12px', 
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                    backdropFilter: 'blur(10px)'
                  }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="square" wrapperStyle={{ fontSize: '0.78rem' }} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" horizontal={false} opacity={0.5} />
                <XAxis type="number" stroke="#9CA8A0" fontSize={11} allowDecimals={false} tickLine={false} axisLine={{ stroke: 'var(--border-light)' }} />
                <YAxis type="category" dataKey="name" stroke="#6B7A70" fontSize={11} width={100} tickLine={false} axisLine={{ stroke: 'var(--border-light)' }} fontWeight={600} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(255, 255, 255, 0.95)', 
                    border: 'none', 
                    borderRadius: '12px', 
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                    backdropFilter: 'blur(10px)'
                  }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                />
                <Bar dataKey="value" fill="#28593D" name="Headcount" barSize={24} radius={[0, 6, 6, 0]} />
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
            <span className={styles.count} style={{ background: blockers.length > 0 ? '#F5E2DF' : '#E6EBE8', color: blockers.length > 0 ? '#C84C31' : '#28593D' }}>
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
              <span className={styles.perfLabel} style={{ color: '#28593D' }}>Top Performers</span>
              {topPerformers.length === 0 ? (
                <div className={styles.emptyState}>No data available.</div>
              ) : (
                topPerformers.map(p => (
                  <div key={p._id} className={styles.perfItem}>
                    <span className={styles.perfName}>{p.name}</span>
                    <span className={styles.perfValue} style={{ background: '#E6EBE8', color: '#28593D' }}>{p.taskCompletionRate}%</span>
                  </div>
                ))
              )}
            </div>
            <div className={styles.perfSection}>
              <span className={styles.perfLabel} style={{ color: '#C84C31' }}>Needs Attention</span>
              {needsAttention.length === 0 ? (
                <div className={styles.emptyState}>No data available.</div>
              ) : (
                needsAttention.map(p => (
                  <div key={p._id} className={styles.perfItem}>
                    <span className={styles.perfName}>{p.name}</span>
                    <span className={styles.perfValue} style={{ background: '#F5E2DF', color: '#C84C31' }}>{p.overdueTasks} overdue</span>
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
            <span className={styles.count} style={{ background: '#E6EBE8', color: '#28593D' }}>
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
          background: 'rgba(26, 33, 28, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }} onClick={() => setKpiModal({ ...kpiModal, open: false })}>
          <div style={{
            background: '#fff', width: '100%', maxWidth: '720px',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            border: '1px solid var(--border-color)',
            animation: 'scaleIn 0.2s ease'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #D1D5CE',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#F4F5F2'
            }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1A211C', margin: 0 }}>{kpiModal.title}</h2>
                <span style={{ fontSize: '0.75rem', color: '#6B7A70' }}>
                  {kpiModal.loading ? 'Loading...' : `${kpiModal.data.length} result(s)`}
                </span>
              </div>
              <button onClick={() => setKpiModal({ ...kpiModal, open: false })} style={{
                width: '32px', height: '32px', border: '1px solid #D1D5CE',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: '#fff', color: '#6B7A70', fontSize: '0.9rem'
              }}>
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
              {kpiModal.loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9CA8A0', fontSize: '0.88rem' }}>
                  Loading details...
                </div>
              ) : kpiModal.data.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9CA8A0', fontSize: '0.88rem' }}>
                  No records found.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr>
                      {kpiModal.columns.map((col, i) => (
                        <th key={i} style={{
                          padding: '10px 16px', textAlign: 'left', background: '#F4F5F2',
                          color: '#6B7A70', fontWeight: 700, fontSize: '0.72rem',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          borderBottom: '2px solid #D1D5CE', position: 'sticky', top: 0
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kpiModal.data.map((row, i) => {
                      const vals = Object.values(row);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #E5E8E2' }}>
                          {vals.map((v, j) => (
                            <td key={j} style={{
                              padding: '11px 16px', color: j === 0 ? '#1A211C' : '#424E46',
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
