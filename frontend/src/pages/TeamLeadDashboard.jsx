import { useState, useEffect } from 'react';
import { 
  FaFolder, FaCheckSquare, FaExclamationTriangle, FaListAlt
} from 'react-icons/fa';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend
} from 'recharts';
import api from '../services/api';
import styles from '../styles/DashboardPage.module.css';

const COLORS = ['#4d8c58', '#030303', '#7b7b7b', '#d64545'];

function TeamLeadDashboard() {
  const [summary, setSummary] = useState({
    activeProjects: 0,
    pendingTasks: 0,
    openBlockers: 0,
    completedTasks: 0
  });

  const [taskChartData, setTaskChartData] = useState([]);
  const [blockers, setBlockers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        const [projectsRes, tasksRes, blockersRes] = await Promise.all([
          api.get('/projects'),
          api.get('/tasks'),
          api.get('/blockers')
        ]);

        const projects = projectsRes.data;
        const tasks = tasksRes.data;
        const allBlockers = blockersRes.data;

        // Calculate summary
        const activeProjects = projects.filter(p => p.status === 'Active').length;
        const pendingTasks = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
        const completedTasks = tasks.filter(t => t.status === 'Completed').length;
        const openBlockers = allBlockers.filter(b => b.status === 'Open' || b.status === 'In Review').length;

        setSummary({
          activeProjects,
          pendingTasks,
          openBlockers,
          completedTasks
        });

        // Prepare Task Chart Data
        const statusCounts = tasks.reduce((acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {});

        const chartData = [
          { name: 'Completed', value: statusCounts['Completed'] || 0 },
          { name: 'In Progress', value: statusCounts['In Progress'] || 0 },
          { name: 'Pending', value: statusCounts['Pending'] || 0 },
          { name: 'Blocked', value: statusCounts['Blocked'] || 0 }
        ].filter(item => item.value > 0);

        setTaskChartData(chartData);

        // Set recent open blockers
        setBlockers(allBlockers.filter(b => b.status !== 'Resolved').slice(0, 5));

      } catch (err) {
        console.error('Failed to load team lead dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Team Lead Dashboard</h1>
          <p className={styles.subtitle}>Overview of project execution and operational tasks.</p>
        </div>
      </header>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading dashboard data...
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div className={styles.kpiIconWrapper} style={{ background: '#f0f5f1', color: '#4d8c58' }}>
                  <FaFolder />
                </div>
              </div>
              <div className={styles.kpiValue}>{summary.activeProjects}</div>
              <div className={styles.kpiLabel}>Active Projects</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div className={styles.kpiIconWrapper} style={{ background: '#f5f5f5', color: '#030303' }}>
                  <FaListAlt />
                </div>
              </div>
              <div className={styles.kpiValue}>{summary.pendingTasks}</div>
              <div className={styles.kpiLabel}>Pending Tasks</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div className={styles.kpiIconWrapper} style={{ background: '#f5faf2', color: '#4d8c58' }}>
                  <FaCheckSquare />
                </div>
              </div>
              <div className={styles.kpiValue}>{summary.completedTasks}</div>
              <div className={styles.kpiLabel}>Completed Tasks</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div className={styles.kpiIconWrapper} style={{ background: '#fee2e2', color: '#d64545' }}>
                  <FaExclamationTriangle />
                </div>
              </div>
              <div className={styles.kpiValue}>{summary.openBlockers}</div>
              <div className={styles.kpiLabel}>Open Blockers</div>
            </div>
          </div>

          <div className={styles.chartsGrid}>
            {/* Task Status Breakdown */}
            <div className={styles.chartCard}>
              <h2 className={styles.chartTitle}>Overall Task Breakdown</h2>
              <div className={styles.chartWrapper}>
                {taskChartData.length === 0 ? (
                  <div className={styles.emptyState}>No tasks available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskChartData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {taskChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: 'none', 
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          background: 'var(--bg-surface)',
                          color: 'var(--text-primary)'
                        }} 
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Recent Blockers */}
            <div className={styles.recentCard}>
              <h2 className={styles.recentTitle}>
                Active Blockers
                <span className={styles.count} style={{ background: '#fee2e2', color: '#d64545' }}>
                  {blockers.length}
                </span>
              </h2>
              <div className={styles.list}>
                {blockers.length === 0 ? (
                  <div className={styles.emptyState}>No active blockers.</div>
                ) : (
                  blockers.map(blocker => (
                    <div key={blocker._id} className={styles.listItem}>
                      <div className={styles.itemIcon} style={{ color: '#d64545', background: '#fee2e2' }}>
                        <FaExclamationTriangle />
                      </div>
                      <div className={styles.itemContent}>
                        <div className={styles.itemTitle}>{blocker.task?.title || 'Unknown Task'}</div>
                        <div className={styles.itemSub}>{blocker.description}</div>
                      </div>
                      <div className={styles.itemMeta}>
                        {new Date(blocker.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TeamLeadDashboard;
