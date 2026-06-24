import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import api from '../services/api';
import styles from '../styles/AdminCommon.module.css';

function PerformancePage() {
  const [metrics, setMetrics] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await api.get(`/performance/month/${selectedMonth}`);
        setMetrics(res.data);
      } catch (err) {
        console.error('Failed to load performance metrics', err);
      }
    }

    fetchMetrics();
    api.get('/departments')
      .then(res => setDepartments(res.data))
      .catch(err => console.error(err));
  }, [selectedMonth]);

  // Filter metrics by department
  const filteredMetrics = metrics.filter(m => {
    if (!selectedDept) return true;
    return m.employee?.department?.toString() === selectedDept;
  });

  // Prepare chart data (All employees)
  const chartData = [...filteredMetrics]
    .sort((a, b) => b.individualScore - a.individualScore)
    .map(m => ({
      name: m.employee?.name || 'Unknown',
      Score: m.individualScore,
      Completion: m.taskCompletionRate,
      Attendance: m.attendancePercentage
    }));

  return (
    <div className={styles.card}>
      <div className={styles.header} style={{ display: 'block' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 className={styles.title}>Workforce Performance Scoreboard</h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className={styles.formGroup} style={{ marginBottom: 0, minWidth: '160px' }}>
              <select
                className={styles.select}
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 0, minWidth: '160px' }}>
              <input
                type="month"
                className={styles.input}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Review employee attendance efficiency, task completions, overdue counts, and overall index ratings.
        </p>
      </div>

      {/* Top Scorers Chart */}
      {chartData.length > 0 && (
        <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '15px', color: 'var(--text-primary)' }}>Workforce Performance Comparison</h3>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 45 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} opacity={0.5} />
                <XAxis dataKey="name" fontSize={11} stroke="#64748b" tickLine={false} axisLine={{ stroke: 'var(--border-light)' }} />
                <YAxis fontSize={11} stroke="#64748b" domain={[0, 100]} tickLine={false} axisLine={{ stroke: 'var(--border-light)' }} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-surface)', 
                    border: '1px solid var(--border-light)', 
                    borderRadius: '8px', 
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
                  }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                  cursor={{ fill: 'var(--border-light)', opacity: 0.2 }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="Score" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Completion" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Attendance" fill="var(--text-muted)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Scoreboard List Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Employee</th>
              <th className={styles.th} style={{ textAlign: 'center' }}>Attendance Rate</th>
              <th className={styles.th} style={{ textAlign: 'center' }}>Avg Hours / Day</th>
              <th className={styles.th} style={{ textAlign: 'center' }}>Late Arrivals</th>
              <th className={styles.th} style={{ textAlign: 'center' }}>Tasks (Assigned/Done)</th>
              <th className={styles.th} style={{ textAlign: 'center' }}>Completion Rate</th>
              <th className={styles.th} style={{ textAlign: 'center' }}>Overdue / Blocked</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>Performance Score</th>
            </tr>
          </thead>
          <tbody>
            {filteredMetrics.length === 0 ? (
              <tr>
                <td colSpan="8" className={styles.td} style={{ textAlign: 'center' }}>
                  No performance metrics recorded for this month.
                </td>
              </tr>
            ) : (
              filteredMetrics.map(m => (
                <tr key={m._id} className={styles.tr}>
                  <td className={styles.td}>
                    <div style={{ fontWeight: '600' }}>{m.employee?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.employee?.role}</div>
                  </td>
                  <td className={styles.td} style={{ textAlign: 'center', fontWeight: '500' }}>
                    {m.attendancePercentage}%
                  </td>
                  <td className={styles.td} style={{ textAlign: 'center' }}>
                    {m.averageWorkingHours} hrs
                  </td>
                  <td className={styles.td} style={{ textAlign: 'center', color: m.lateArrivalCount > 2 ? 'var(--color-danger)' : 'inherit' }}>
                    {m.lateArrivalCount}
                  </td>
                  <td className={styles.td} style={{ textAlign: 'center' }}>
                    {m.tasksAssigned} / {m.tasksCompleted}
                  </td>
                  <td className={styles.td} style={{ textAlign: 'center', fontWeight: '500' }}>
                    {m.taskCompletionRate}%
                  </td>
                  <td className={styles.td} style={{ textAlign: 'center' }}>
                    <span style={{ color: m.overdueTasks > 0 ? 'var(--color-danger)' : 'inherit' }}>{m.overdueTasks}</span>
                    {' / '}
                    <span style={{ color: m.blockedTasks > 0 ? 'var(--color-warning)' : 'inherit' }}>{m.blockedTasks}</span>
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <span 
                      style={{ 
                        fontSize: '1rem', 
                        fontWeight: '700',
                        color: m.individualScore >= 80 ? 'var(--color-success)' : m.individualScore < 60 ? 'var(--color-danger)' : 'var(--color-warning)'
                      }}
                    >
                      {m.individualScore} / 100
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PerformancePage;
