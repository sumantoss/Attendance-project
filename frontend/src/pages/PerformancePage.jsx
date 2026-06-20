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
    return m.employee?.department === selectedDept;
  });

  // Prepare chart data (Top 5 scorers)
  const chartData = [...filteredMetrics]
    .sort((a, b) => b.individualScore - a.individualScore)
    .slice(0, 5)
    .map(m => ({
      name: m.employee?.name || 'Unknown',
      Score: m.individualScore,
      Completion: m.taskCompletionRate,
      Attendance: m.attendancePercentage
    }));

  return (
    <div className={styles.card}>
      <div className={styles.header} style={{ display: 'block' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 className={styles.title}>Workforce Performance Scoreboard</h2>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
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
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
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
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '15px', color: 'var(--text-primary)' }}>Top Performers Comparison</h3>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={11} stroke="#64748b" />
                <YAxis fontSize={11} stroke="#64748b" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Score" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Completion" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Attendance" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
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
