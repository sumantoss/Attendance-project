import { useState, useEffect } from 'react';
import { 
  FaUsers, FaUserCheck, FaUserTimes, FaClock, 
  FaFolder, FaEdit, FaExclamationTriangle, FaListAlt, FaTimes
} from 'react-icons/fa';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import api from '../services/api';
import styles from '../styles/DashboardPage.module.css';
import { io } from 'socket.io-client';

const COLORS = ['#0F5132', '#FFC107', '#0D6EFD', '#DC3545'];

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
  const [escalations, setEscalations] = useState([]);
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
      // Fetch summary
      api.get('/dashboard/summary')
        .then(res => setSummary(res.data))
        .catch(err => console.error(err));

      // Fetch charts
      api.get('/dashboard/charts')
        .then(res => setCharts(res.data))
        .catch(err => console.error(err));

      // Fetch recent daily updates
      api.get('/work-updates')
        .then(res => setRecentUpdates(res.data.slice(0, 5)))
        .catch(err => console.error(err));

      // Fetch blockers
      api.get('/blockers')
        .then(res => setBlockers(res.data.filter(b => b.status === 'Open' || b.status === 'In Review').slice(0, 5)))
        .catch(err => console.error(err));

      // Fetch escalations
      api.get('/escalations')
        .then(res => setEscalations(res.data.filter(e => e.status === 'Open').slice(0, 5)))
        .catch(err => console.error(err));

      // Fetch performance metrics
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

  // Compute top performers and needs attention lists
  const sortedPerformance = [...performance].sort((a, b) => b.taskCompletionRate - a.taskCompletionRate);
  const topPerformers = sortedPerformance.filter(p => p.taskCompletionRate >= 80).slice(0, 3);
  const needsAttention = sortedPerformance.filter(p => p.taskCompletionRate < 50 || p.overdueTasks > 1).slice(0, 3);

  // Handle KPI card click — fetch detail data and open modal
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
    { key: 'totalEmployees', title: 'Total Employees', value: summary.totalEmployees, icon: <FaUsers />, color: '#0F5132', bg: '#E8F5E9' },
    { key: 'presentToday', title: 'Present Today', value: summary.presentToday, icon: <FaUserCheck />, color: '#2E7D32', bg: '#E8F5E9' },
    { key: 'absentToday', title: 'Absent Today', value: summary.absentToday, icon: <FaUserTimes />, color: '#DC3545', bg: '#FEE2E2' },
    { key: 'lateToday', title: 'Late Arrivals', value: summary.lateToday, icon: <FaClock />, color: '#D97706', bg: '#FEF3C7' },
    { key: 'activeProjects', title: 'Active Projects', value: summary.activeProjects, icon: <FaFolder />, color: '#0D6EFD', bg: '#DBEAFE' },
    { key: 'pendingTasks', title: 'Pending Tasks', value: summary.pendingTasks, icon: <FaListAlt />, color: '#0F5132', bg: '#E8F5E9' },
    { key: 'openBlockers', title: 'Open Blockers', value: summary.openBlockers, icon: <FaExclamationTriangle />, color: '#DC3545', bg: '#FEE2E2' },
    { key: 'pendingEOD', title: 'Pending EOD', value: summary.pendingDailyUpdates, icon: <FaEdit />, color: '#D97706', bg: '#FEF3C7' },
  ];

  return (
    <div>
      {/* Alert Banner */}
      {(summary.lateToday > 0 || summary.openBlockers > 0) && (
        <div style={{ 
          background: '#FEF2F2', 
          border: '1px solid #FECACA',
          padding: '12px 18px', 
          borderRadius: '10px', 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.84rem',
          color: '#991B1B',
          fontWeight: '500'
        }}>
          <FaExclamationTriangle style={{ color: '#DC3545', fontSize: '1rem', flexShrink: 0 }} />
          <span>
            <strong>Action Required:</strong> {summary.lateToday} late arrival(s) and {summary.openBlockers} open blocker(s) need review.
          </span>
        </div>
      )}

      {/* KPI Metrics */}
      <div className={styles.metricsGrid}>
        {/* Signature Element: Precision Clock */}
        <div className={styles.kpiCard} style={{ gridColumn: 'span 1', background: 'var(--color-forest-black)', color: 'var(--color-canvas)', cursor: 'default' }}>
          <div className={styles.kpiHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-chartreuse)', boxShadow: '0 0 8px var(--color-chartreuse)' }}></div>
              <span style={{ fontFamily: 'var(--font-family-utility)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-chartreuse)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Shift Active
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-family-display)', fontSize: '2.5rem', fontWeight: 300, color: 'var(--color-canvas)', lineHeight: 1 }}>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className={styles.kpiFooter} style={{ color: '#9CA8A0' }}>
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {kpis.slice(1).map((kpi, idx) => (
          <div key={idx} className={styles.kpiCard} onClick={() => handleKpiClick(kpi.key, kpi.title)} style={{ cursor: 'pointer' }}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiTitle}>{kpi.title}</span>
              <span className={styles.kpiValue}>{kpi.value}</span>
              <span className={styles.kpiFooter}>Click to view details</span>
            </div>
          </div>
        ))}
      </div>


      {/* Charts Row */}
      <div className={styles.chartsGrid}>
        {/* Attendance Trends (7 Days) */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>7-Day Attendance Trend</h2>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '0.82rem' }} />
                <Legend />
                <Line type="monotone" dataKey="Present" stroke="#0F5132" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Late" stroke="#D97706" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Completion Rate (Pie Chart) */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Task Distributions</h2>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.taskData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {charts.taskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '0.82rem' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Department Headcounts Row */}
      <div className={styles.chartsGrid} style={{ gridTemplateColumns: '1fr' }}>
        {/* Department Headcounts */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Department Headcounts</h2>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.departmentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#9CA3AF" fontSize={11} width={80} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '0.82rem' }} />
                <Bar dataKey="value" fill="#0F5132" radius={[0, 4, 4, 0]} name="Headcount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Blockers & Escalations Panel */}
      <div className={styles.recentGrid} style={{ marginBottom: '30px' }}>
        <div className={styles.recentCard}>
          <h2 className={styles.recentTitle}>Open Blockers ({blockers.length})</h2>
          <div className={styles.list}>
            {blockers.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.84rem' }}>No open blockers logged.</div>
            ) : (
              blockers.map(b => (
                <div key={b._id} className={styles.listItem} style={{ display: 'block', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600' }}>{b.task?.title}</span>
                    <span style={{ color: '#DC3545', fontWeight: '600', fontSize: '0.72rem', background: '#FDE8EA', padding: '2px 8px', borderRadius: '9999px' }}>{b.priority}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Type: <strong>{b.type}</strong> | Raised by: <strong>{b.employee?.name}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    "{b.description}"
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.recentCard}>
          <h2 className={styles.recentTitle}>Active Escalations ({escalations.length})</h2>
          <div className={styles.list}>
            {escalations.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.84rem' }}>No active escalations.</div>
            ) : (
              escalations.map(e => (
                <div key={e._id} className={styles.listItem} style={{ display: 'block', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600' }}>{e.task?.title}</span>
                    <span style={{ color: '#DC3545', fontWeight: '600', fontSize: '0.72rem', background: '#FDE8EA', padding: '2px 8px', borderRadius: '9999px' }}>{e.priority}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Escalated by: <strong>{e.employee?.name}</strong> | Escalated to: <strong>{e.escalatedTo?.name || 'Admin'}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Reason: "{e.reason}"
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Performance Snapshots & Recent EOD updates */}
      <div className={styles.recentGrid}>
        {/* Performance Snapshot */}
        <div className={styles.recentCard}>
          <h2 className={styles.recentTitle}>Employee Performance Snapshot</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <h4 style={{ color: 'var(--color-success)', fontSize: '0.8rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '10px' }}>Top Performers</h4>
              {topPerformers.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No data available.</div>
              ) : (
                topPerformers.map(p => (
                  <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.8rem' }}>
                    <span>{p.name}</span>
                    <strong style={{ color: 'var(--color-success)' }}>{p.taskCompletionRate}% Rate</strong>
                  </div>
                ))
              )}
            </div>
            <div>
              <h4 style={{ color: 'var(--color-danger)', fontSize: '0.8rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '10px' }}>Needs Attention</h4>
              {needsAttention.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No data available.</div>
              ) : (
                needsAttention.map(p => (
                  <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.8rem' }}>
                    <span>{p.name}</span>
                    <strong style={{ color: 'var(--color-danger)' }}>{p.overdueTasks} Overdue</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* EOD Work Updates */}
        <div className={styles.recentCard}>
          <h2 className={styles.recentTitle}>Recent EOD Daily Updates</h2>
          <div className={styles.list}>
            {recentUpdates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No recent daily updates submitted today.
              </div>
            ) : (
              recentUpdates.map(up => (
                <div key={up._id} className={styles.listItem} style={{ display: 'block', padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600' }}>{up.employee?.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{up.totalHoursWorked} hrs worked</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
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
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }} onClick={() => setKpiModal({ ...kpiModal, open: false })}>
          <div style={{
            background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '720px',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 48px rgba(0,0,0,0.15)', animation: 'scaleIn 0.2s ease'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #E5E7EB',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0 }}>{kpiModal.title}</h2>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                  {kpiModal.loading ? 'Loading...' : `${kpiModal.data.length} result(s)`}
                </span>
              </div>
              <button onClick={() => setKpiModal({ ...kpiModal, open: false })} style={{
                width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #E5E7EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: '#F9FAFB', color: '#6B7280', fontSize: '0.9rem'
              }}>
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
              {kpiModal.loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.88rem' }}>
                  Loading details...
                </div>
              ) : kpiModal.data.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.88rem' }}>
                  No records found.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr>
                      {kpiModal.columns.map((col, i) => (
                        <th key={i} style={{
                          padding: '10px 16px', textAlign: 'left', background: '#F9FAFB',
                          color: '#6B7280', fontWeight: 600, fontSize: '0.72rem',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kpiModal.data.map((row, i) => {
                      const vals = Object.values(row);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          {vals.map((v, j) => (
                            <td key={j} style={{
                              padding: '11px 16px', color: j === 0 ? '#111827' : '#4B5563',
                              fontWeight: j === 0 ? 600 : 400
                            }}>
                              {/* Status column gets a badge */}
                              {j === vals.length - 1 ? (
                                <span style={{
                                  padding: '3px 10px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 600,
                                  background: v === 'Active' || v === 'On Time' ? '#F0FDF4' :
                                             v === 'Late' || v === 'Early Leave' || v === 'Absent' || v === 'Open' || v === 'High' || v === 'Critical' ? '#FEF2F2' :
                                             v === 'In Progress' || v === 'Still In' || v === 'Pending Checkout' ? '#FFFBEB' : '#F3F4F6',
                                  color: v === 'Active' || v === 'On Time' ? '#166534' :
                                         v === 'Late' || v === 'Early Leave' || v === 'Absent' || v === 'Open' || v === 'High' || v === 'Critical' ? '#991B1B' :
                                         v === 'In Progress' || v === 'Still In' || v === 'Pending Checkout' ? '#92400E' : '#4B5563'
                                }}>{v}</span>
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
