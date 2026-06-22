import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaCalendarAlt, FaClock, FaTasks, FaTrophy,
  FaExclamationTriangle, FaFlag, FaCheckCircle, FaTimesCircle,
  FaBriefcase, FaEnvelope, FaPhone, FaIdBadge, FaUserTie, FaBuilding,
  FaUpload, FaSpinner
} from 'react-icons/fa';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import api from '../services/api';
import styles from '../styles/EmployeeProfilePage.module.css';

/* ── Helpers ──────────────────────────── */
const avatarColors = [
  'rgba(99,102,241,0.35)', 'rgba(236,72,153,0.35)', 'rgba(34,197,94,0.35)',
  'rgba(245,158,11,0.35)', 'rgba(6,182,212,0.35)', 'rgba(168,85,247,0.35)',
];

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0];
  return parts[0][0] + parts[parts.length - 1][0];
}

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function getTenure(joiningDate) {
  if (!joiningDate) return '';
  const join = new Date(joiningDate);
  const now = new Date();
  let years = now.getFullYear() - join.getFullYear();
  let months = now.getMonth() - join.getMonth();
  if (months < 0) { years--; months += 12; }
  const parts = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (months > 0 || years === 0) parts.push(`${months} mo${months !== 1 ? 's' : ''}`);
  return parts.join(' ');
}

const statusBadge = (status) => {
  const map = {
    Present:      { bg: '#D1FAE5', color: '#065F46' },
    Late:         { bg: '#FEF3C7', color: '#92400E' },
    'Early Leave':{ bg: '#FED7AA', color: '#9A3412' },
    Absent:       { bg: '#FEE2E2', color: '#991B1B' },
    Active:       { bg: '#D1FAE5', color: '#065F46' },
    Inactive:     { bg: '#FEE2E2', color: '#991B1B' },
    'Not Started':{ bg: 'var(--border-light)', color: 'var(--text-secondary)' },
    'In Progress':{ bg: '#DBEAFE', color: '#1E40AF' },
    Blocked:      { bg: '#FEE2E2', color: '#991B1B' },
    Completed:    { bg: '#D1FAE5', color: '#065F46' },
    Open:         { bg: '#FEF3C7', color: '#92400E' },
    'In Review':  { bg: '#DBEAFE', color: '#1E40AF' },
    Resolved:     { bg: '#D1FAE5', color: '#065F46' },
    Closed:       { bg: 'var(--border-light)', color: 'var(--text-secondary)' },
  };
  const s = map[status] || { bg: 'var(--border-light)', color: 'var(--text-secondary)' };
  return { className: styles.badge, style: { backgroundColor: s.bg, color: s.color } };
};

const priorityBadge = (priority) => {
  const map = {
    Low:      { bg: 'var(--border-light)', color: 'var(--text-secondary)' },
    Medium:   { bg: '#DBEAFE', color: '#1E40AF' },
    High:     { bg: '#FEF3C7', color: '#92400E' },
    Critical: { bg: '#FEE2E2', color: '#991B1B' },
  };
  const s = map[priority] || map.Medium;
  return { className: styles.badge, style: { backgroundColor: s.bg, color: s.color } };
};

const attendanceBarColor = {
  Present: '#10B981',
  Late: '#F59E0B',
  'Early Leave': '#F97316',
};

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */
function EmployeeProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed!');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB!');
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);

    try {
      setUploading(true);
      setUploadError('');

      const res = await api.post(`/employees/${id}/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Update employee photo path in context state
      setData(prev => ({
        ...prev,
        employee: {
          ...prev.employee,
          photo: res.data.photo
        }
      }));
      
      alert('Photo uploaded successfully!');
    } catch (err) {
      console.error('Error uploading photo:', err);
      const errMsg = err.response?.data?.message || 'Failed to upload photo';
      setUploadError(errMsg);
      alert(errMsg);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/employees/profile/${id}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  /* ── Attendance chart data (last 30 days) ── */
  const attendanceChartData = useMemo(() => {
    if (!data) return [];
    const records = data.attendance.records;
    // Build a map by date
    const byDate = {};
    records.forEach(r => { byDate[r.date] = r; });
    // Generate last 30 days
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dow = d.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const rec = byDate[dateStr];
      days.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
        hours: rec?.totalHours || 0,
        status: isWeekend ? 'Weekend' : (rec?.status || 'Absent'),
        isWeekend,
      });
    }
    return days;
  }, [data]);

  /* ── Task distribution pie ── */
  const taskPieData = useMemo(() => {
    if (!data) return [];
    const s = data.tasks.summary;
    return [
      { name: 'Completed', value: s.completed, fill: '#10B981' },
      { name: 'In Progress', value: s.inProgress, fill: '#3B82F6' },
      { name: 'Blocked', value: s.blocked, fill: '#EF4444' },
      { name: 'Not Started', value: Math.max(0, s.total - s.completed - s.inProgress - s.blocked), fill: '#9CA3AF' },
    ].filter(d => d.value > 0);
  }, [data]);

  /* ── Sorted Blockers ── */
  const sortedBlockers = useMemo(() => {
    if (!data) return [];
    return (data.blockers || []).sort((a, b) => {
      const dateA = new Date(a.dateRaised || a.createdAt);
      const dateB = new Date(b.dateRaised || b.createdAt);
      return dateB - dateA;
    });
  }, [data]);

  if (loading) {
    return <div className={styles.loading}>Loading employee profile…</div>;
  }
  if (error) {
    return (
      <div className={styles.page}>
        <button className={styles.backBtn} onClick={() => navigate('/admin/employees')}><FaArrowLeft /> Back</button>
        <div className={styles.loading} style={{ color: 'var(--color-danger)' }}>{error}</div>
      </div>
    );
  }
  if (!data) return null;

  const { employee, attendance, tasks, recentUpdates, performance } = data;
  const attnSummary = attendance.summary;
  const taskSummary = tasks.summary;

  return (
    <div className={styles.page}>

      {/* ── Back button ──────────────────── */}
      <button className={styles.backBtn} onClick={() => navigate('/admin/employees')}>
        <FaArrowLeft /> Back to Employees
      </button>

      {/* ════════════════════════════════════
          HERO CARD
         ════════════════════════════════════ */}
      <div className={styles.hero}>
        <div className={styles.heroPattern} />

        {/* Avatar Container with Upload capability */}
        <div className={styles.avatarContainer}>
          <div className={styles.avatar} style={{ backgroundColor: getAvatarColor(employee.name) }}>
            {employee.photo ? (
              <img 
                src={`${api.defaults.baseURL.replace('/api', '')}${employee.photo}`} 
                alt={employee.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              getInitials(employee.name)
            )}
            {uploading && (
              <div className={styles.uploadSpinner}>
                <FaSpinner className="spin-icon" />
              </div>
            )}
            <label className={styles.avatarOverlay}>
              <FaUpload />
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
                style={{ display: 'none' }} 
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* Info */}
        <div className={styles.heroInfo}>
          <div className={styles.heroName}>{employee.name}</div>
          <div className={styles.heroRole}>{employee.role}</div>
          <span className={employee.status === 'Active' ? styles.heroBadgeActive : styles.heroBadgeInactive}>
            {employee.status === 'Active' ? <FaCheckCircle /> : <FaTimesCircle />}
            {employee.status}
          </span>

          <div className={styles.heroMeta}>
            <span className={styles.heroMetaItem}><FaIdBadge /> {employee.employeeId}</span>
            <span className={styles.heroMetaItem}><FaBuilding /> {employee.department?.name || 'Unassigned'}</span>
            <span className={styles.heroMetaItem}><FaCalendarAlt /> Joined {formatDate(employee.joiningDate)} · {getTenure(employee.joiningDate)}</span>
            {employee.email && <span className={styles.heroMetaItem}><FaEnvelope /> {employee.email}</span>}
            {employee.phone && <span className={styles.heroMetaItem}><FaPhone /> {employee.phone}</span>}
            {employee.reportingManager && (
              <span className={styles.heroMetaItem}><FaUserTie /> Reports to {employee.reportingManager.name}</span>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          QUICK STATS
         ════════════════════════════════════ */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#EEF2FF', color: 'var(--color-primary)' }}><FaCalendarAlt /></div>
          <div>
            <div className={styles.statValue}>{attnSummary.attendanceRate}%</div>
            <div className={styles.statLabel}>Attendance Rate</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}><FaClock /></div>
          <div>
            <div className={styles.statValue}>{attnSummary.avgHours}h</div>
            <div className={styles.statLabel}>Avg. Working Hours</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}><FaTasks /></div>
          <div>
            <div className={styles.statValue}>{taskSummary.completed}/{taskSummary.total}</div>
            <div className={styles.statLabel}>Tasks Completed</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#FEF3C7', color: '#F59E0B' }}><FaTrophy /></div>
          <div>
            <div className={styles.statValue}>{performance?.individualScore ?? '—'}</div>
            <div className={styles.statLabel}>Performance Score</div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          PERSONAL INFO DETAILS
         ════════════════════════════════════ */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}><FaIdBadge /> Personal Information</div>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Employee ID</span>
              <span className={styles.infoValue}>{employee.employeeId}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Full Name</span>
              <span className={styles.infoValue}>{employee.name}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Department</span>
              <span className={styles.infoValue}>{employee.department?.name || 'Unassigned'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Role / Designation</span>
              <span className={styles.infoValue}>{employee.role}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Joining Date</span>
              <span className={styles.infoValue}>{formatDate(employee.joiningDate)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Tenure</span>
              <span className={styles.infoValue}>{getTenure(employee.joiningDate)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>{employee.email || '—'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Phone</span>
              <span className={styles.infoValue}>{employee.phone || '—'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Reporting Manager</span>
              <span className={styles.infoValue}>{employee.reportingManager?.name || '—'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Status</span>
              <span className={styles.infoValue}>
                <span {...statusBadge(employee.status)}>{employee.status}</span>
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>PIN</span>
              <span className={styles.infoValue} style={{ fontFamily: 'monospace', letterSpacing: '2px' }}>{employee.pin}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          CHARTS — ATTENDANCE + HOURS
         ════════════════════════════════════ */}
      <div className={styles.chartsGrid}>
        {/* Attendance Bar Chart (30 days) */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}><FaCalendarAlt /> Attendance — Last 30 Days</div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#10B981', display: 'inline-block' }} /> Present
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#F59E0B', display: 'inline-block' }} /> Late
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#EF4444', display: 'inline-block' }} /> Absent
              </span>
            </div>
          </div>
          <div className={styles.sectionBody} style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceChartData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="label" fontSize={10} tick={{ fill: 'var(--text-muted)' }} interval={4} />
                <YAxis fontSize={10} tick={{ fill: 'var(--text-muted)' }} domain={[0, 12]} unit="h" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.82rem' }}
                  formatter={(value, name) => [`${value}h`, 'Hours']}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) return `${label} — ${payload[0].payload.status}`;
                    return label;
                  }}
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                  {attendanceChartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.isWeekend ? '#E5E7EB' :
                        attendanceBarColor[entry.status] || '#EF4444'
                      }
                      opacity={entry.isWeekend ? 0.4 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Distribution Pie + Quick Numbers */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}><FaTasks /> Task Overview</div>
          </div>
          <div className={styles.sectionBody} style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {taskPieData.length > 0 ? (
              <div style={{ width: '160px', height: '160px', flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {taskPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: '0.82rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No tasks
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, minWidth: '160px' }}>
              {[
                { label: 'Total Tasks', value: taskSummary.total, color: 'var(--text-primary)' },
                { label: 'Completed', value: taskSummary.completed, color: '#10B981' },
                { label: 'In Progress', value: taskSummary.inProgress, color: '#3B82F6' },
                { label: 'Blocked', value: taskSummary.blocked, color: '#EF4444' },
                { label: 'Overdue', value: taskSummary.overdue, color: '#F59E0B' },
                { label: 'Late Arrivals', value: attnSummary.totalLate, color: '#F59E0B' },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          WORK HOURS TREND (Line Chart)
         ════════════════════════════════════ */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}><FaClock /> Daily Work Hours — Last 30 Days</div>
        </div>
        <div className={styles.sectionBody} style={{ height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={attendanceChartData.filter(d => !d.isWeekend && d.hours > 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="label" fontSize={10} tick={{ fill: 'var(--text-muted)' }} />
              <YAxis fontSize={10} tick={{ fill: 'var(--text-muted)' }} domain={[0, 'auto']} unit="h" />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.82rem' }} />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--color-primary)' }}
                activeDot={{ r: 5 }}
                name="Hours"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ════════════════════════════════════
          ACTIVE TASKS TABLE
         ════════════════════════════════════ */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}><FaBriefcase /> Assigned Tasks</div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{taskSummary.total} total</span>
        </div>
        {tasks.list.length === 0 ? (
          <div className={styles.empty}>No tasks assigned yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Task</th>
                  <th className={styles.th}>Project</th>
                  <th className={styles.th}>Priority</th>
                  <th className={styles.th}>Progress</th>
                  <th className={styles.th}>Hours</th>
                  <th className={styles.th}>Deadline</th>
                  <th className={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.list.map(t => (
                  <tr key={t._id}>
                    <td className={styles.td} style={{ fontWeight: '500', maxWidth: '220px' }}>{t.title}</td>
                    <td className={styles.td}>{t.project?.name || '—'}</td>
                    <td className={styles.td}><span {...priorityBadge(t.priority)}>{t.priority}</span></td>
                    <td className={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className={styles.progressOuter}>
                          <div className={styles.progressInner} style={{ width: `${Math.min(100, 
                            t.progressPercent)}%`, backgroundColor: t.progressPercent >= 100 ? '#10B981' : t.progressPercent >= 50 ? '#3B82F6' : '#F59E0B'
                           || 'var(--color-primary)' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t.progressPercent}%</span>
                      </div>
                    </td>
                    <td className={styles.td} style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {t.actualHoursSpent || 0}/{t.estimatedHours || 0}h
                    </td>
                    <td className={styles.td} style={{ fontSize: '0.8rem' }}>
                      {t.deadline ? formatDate(t.deadline) : '—'}
                      {t.status !== 'Completed' && t.deadline && new Date(t.deadline) < new Date() && (
                        <span style={{ color: '#EF4444', marginLeft: '4px', fontSize: '0.7rem', fontWeight: '600' }}>OVERDUE</span>
                      )}
                    </td>
                    <td className={styles.td}><span {...statusBadge(t.status)}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════
          RECENT WORK UPDATES
         ════════════════════════════════════ */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}><FaCalendarAlt /> Recent Work Updates</div>
        </div>
        <div className={styles.sectionBody}>
          {recentUpdates.length === 0 ? (
            <div className={styles.empty}>No work updates yet.</div>
          ) : (
            <div className={styles.timeline}>
              {recentUpdates.map(u => (
                <div key={u._id} className={styles.timelineItem}>
                  <div className={styles.timelineDot} style={{ backgroundColor: '#6366F1' || 'var(--color-primary)' }} />
                  <div className={styles.timelineDate}>{formatDate(u.date)}</div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineTitle}>
                      {u.totalHoursWorked}h logged across {u.taskUpdates?.length || 0} task{u.taskUpdates?.length !== 1 ? 's' : ''}
                    </div>
                    {u.taskUpdates && u.taskUpdates.length > 0 && (
                      <div className={styles.timelineDesc}>
                        {u.taskUpdates.map((tu, i) => (
                          <div key={i} style={{ marginBottom: '2px' }}>
                            • <strong>{tu.task?.title || 'Task'}</strong> — {tu.workSummary || '(no summary)'} ({tu.hoursWorked}h, {tu.progressPercent}%)
                          </div>
                        ))}
                      </div>
                    )}
                    {u.eodReport && !u.taskUpdates?.length && (
                      <div className={styles.timelineDesc}>{u.eodReport}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════
          BLOCKERS
         ════════════════════════════════════ */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}><FaExclamationTriangle /> Blockers</div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {sortedBlockers.filter(b => b.status === 'Open' || b.status === 'In Review').length} active
          </span>
        </div>
        <div className={styles.sectionBody}>
          {sortedBlockers.length === 0 ? (
            <div className={styles.empty}>No active blockers.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {sortedBlockers.map(item => (
                <div key={item._id} className={styles.blockerCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div className={styles.blockerTitle} style={{ flex: 1, marginRight: '10px' }}>{item.description}</div>
                  </div>
                  <div className={styles.blockerMeta}>
                    <span>Task: {item.task?.title || '—'}</span>
                    <span>Type: {item.type}</span>
                    <span {...priorityBadge(item.priority)}>{item.priority}</span>
                    <span {...statusBadge(item.status)}>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════
          PERFORMANCE BREAKDOWN (if available)
         ════════════════════════════════════ */}
      {performance && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}><FaTrophy /> Performance Metrics — {performance.month}</div>
            <span style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              color: performance.individualScore >= 75 ? '#10B981' : performance.individualScore >= 50 ? '#F59E0B' : '#EF4444',
            }}>
              Score: {performance.individualScore}/100
            </span>
          </div>
          <div className={styles.sectionBody} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Attendance %</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className={styles.progressOuter} style={{ flex: 1 }}>
                    <div className={styles.progressInner} style={{ width: `${Math.min(100, performance.attendancePercentage)}%`, backgroundColor: '#10B981' || 'var(--color-primary)' }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{performance.attendancePercentage}%</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Avg Working Hours</span>
                <span className={styles.infoValue}>{performance.averageWorkingHours}h / day</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Late Arrivals</span>
                <span className={styles.infoValue}>{performance.lateArrivalCount}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Task Completion Rate</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className={styles.progressOuter} style={{ flex: 1 }}>
                    <div className={styles.progressInner} style={{ width: `${Math.min(100, performance.taskCompletionRate)}%`, backgroundColor: '#3B82F6' || 'var(--color-primary)' }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{performance.taskCompletionRate}%</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Tasks Assigned / Completed</span>
                <span className={styles.infoValue}>{performance.tasksAssigned} / {performance.tasksCompleted}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Overdue Tasks</span>
                <span className={styles.infoValue} style={{ color: performance.overdueTasks > 0 ? '#EF4444' : 'var(--text-primary)' }}>
                  {performance.overdueTasks}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Blocked Tasks</span>
                <span className={styles.infoValue} style={{ color: performance.blockedTasks > 0 ? '#EF4444' : 'var(--text-primary)' }}>
                  {performance.blockedTasks}
                </span>
              </div>
            </div>
            
            {/* Performance Chart */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Attendance', Percentage: performance.attendancePercentage },
                  { name: 'Completion', Percentage: performance.taskCompletionRate },
                  { name: 'Overall Score', Percentage: performance.individualScore }
                ]} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                  <XAxis dataKey="name" fontSize={11} tick={{ fill: 'var(--text-muted)' }} />
                  <YAxis fontSize={11} tick={{ fill: 'var(--text-muted)' }} domain={[0, 100]} unit="%" />
                  <Tooltip formatter={(value) => [`${value}%`, 'Value']} />
                  <Bar dataKey="Percentage" radius={[4, 4, 0, 0]}>
                    <Cell fill="#10B981" />
                    <Cell fill="#3B82F6" />
                    <Cell fill="#6366F1" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default EmployeeProfilePage;
