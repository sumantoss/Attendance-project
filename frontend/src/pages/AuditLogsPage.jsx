import { useState, useEffect } from 'react';
import api from '../services/api';
import styles from '../styles/AdminCommon.module.css';

function AuditLogsPage() {
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/audit-logs');
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchLogs();
    });
  }, []);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>System Audit Trails</h2>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Timestamp</th>
              <th className={styles.th}>User/Actor</th>
              <th className={styles.th}>Action</th>
              <th className={styles.th}>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="4" className={styles.td} style={{ textAlign: 'center' }}>No logs recorded.</td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log._id} className={styles.tr}>
                  <td className={styles.td} style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className={styles.td} style={{ fontWeight: '600' }}>{log.user}</td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${
                      log.action.includes('CORRECT') || log.action.includes('EXCEED')
                        ? styles.badgeDanger 
                        : log.action.includes('CHECKIN') || log.action.includes('CREATE')
                          ? styles.badgeSuccess
                          : styles.badgeWarning
                    }`} style={{ fontSize: '0.7rem' }}>
                      {log.action}
                    </span>
                  </td>
                  <td className={styles.td} style={{ fontSize: '0.825rem' }}>{log.description}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AuditLogsPage;
