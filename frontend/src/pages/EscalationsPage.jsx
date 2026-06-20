import { useState, useEffect } from 'react';
import { FaCheck } from 'react-icons/fa';
import api from '../services/api';
import styles from '../styles/AdminCommon.module.css';

function EscalationsPage() {
  const [escalations, setEscalations] = useState([]);

  useEffect(() => {
    api.get('/escalations')
      .then(res => setEscalations(res.data))
      .catch(err => console.error('Failed to fetch escalations', err));
  }, []);

  const handleResolveEscalation = async (id) => {
    try {
      await api.put(`/escalations/${id}`, { status: 'Resolved' });
      api.get('/escalations')
        .then(res => setEscalations(res.data))
        .catch(err => console.error(err));
      alert('Escalation resolved and underlying blockers updated.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update escalation');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resolved': return styles.badgeSuccess;
      case 'Closed': return styles.badgeSuccess;
      case 'In Review': return styles.badgeWarning;
      default: return styles.badgeDanger;
    }
  };

  const getPriorityBadge = (prio) => {
    switch (prio) {
      case 'Critical': return styles.badgeDanger;
      case 'High': return styles.badgeDanger;
      case 'Medium': return styles.badgeWarning;
      default: return styles.badgeSuccess;
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Management Escalations Board</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Review and resolve high-priority escalations forwarded by team leads.
        </span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Raised By</th>
              <th className={styles.th}>Task / Blocker</th>
              <th className={styles.th}>Escalation Reason</th>
              <th className={styles.th}>Escalated To</th>
              <th className={styles.th}>Priority</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {escalations.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.td} style={{ textAlign: 'center' }}>
                  No active escalations. Management queue is empty!
                </td>
              </tr>
            ) : (
              escalations.map(esc => (
                <tr key={esc._id} className={styles.tr}>
                  <td className={styles.td}>
                    <div style={{ fontWeight: '600' }}>{esc.employee?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{esc.employee?.role}</div>
                  </td>
                  <td className={styles.td}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{esc.task?.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Blocker: "{esc.blocker?.description || 'N/A'}"</div>
                  </td>
                  <td className={styles.td} style={{ maxWidth: '220px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>"{esc.reason}"</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Date: {new Date(esc.dateRaised || esc.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div style={{ fontWeight: '500' }}>{esc.escalatedTo?.name || 'Unassigned'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{esc.escalatedTo?.role}</div>
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${getPriorityBadge(esc.priority)}`}>
                      {esc.priority}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${getStatusBadge(esc.status)}`}>
                      {esc.status}
                    </span>
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    {esc.status !== 'Resolved' && esc.status !== 'Closed' ? (
                      <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => handleResolveEscalation(esc._id)}
                      >
                        <FaCheck /> Mark Resolved
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: '600' }}>✓ Resolved</span>
                    )}
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

export default EscalationsPage;
