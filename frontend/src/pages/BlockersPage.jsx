import { useState, useEffect } from 'react';
import { FaCheck, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import api from '../services/api';
import styles from '../styles/AdminCommon.module.css';

function BlockersPage() {
  const [blockers, setBlockers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedBlocker, setSelectedBlocker] = useState(null);
  const [escalationReason, setEscalationReason] = useState('');
  const [escalateTo, setEscalateTo] = useState('');
  const [escalationPriority, setEscalationPriority] = useState('High');
  useEffect(() => {
    api.get('/blockers')
      .then(res => setBlockers(res.data))
      .catch(err => console.error('Failed to fetch blockers', err));

    api.get('/employees')
      .then(res => setEmployees(res.data.filter(e => e.status === 'Active')))
      .catch(err => console.error(err));
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`/blockers/${id}`, { status: newStatus });
      api.get('/blockers').then(res => setBlockers(res.data));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update blocker status');
    }
  };

  const handleOpenEscalation = (blocker) => {
    setSelectedBlocker(blocker);
    setEscalateTo(employees.length > 0 ? employees[0]._id : '');
    setEscalationReason('');
    setEscalationPriority('High');
    setShowModal(true);
  };

  const handleEscalationSubmit = async (e) => {
    e.preventDefault();
    if (!escalationReason.trim() || !escalateTo) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await api.post('/escalations', {
        task: selectedBlocker.task?._id,
        blocker: selectedBlocker._id,
        employee: selectedBlocker.employee?._id,
        reason: escalationReason,
        escalatedTo: escalateTo,
        priority: escalationPriority
      });
      setShowModal(false);
      api.get('/blockers').then(res => setBlockers(res.data));
      alert('Blocker successfully escalated!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to escalate blocker');
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
        <h2 className={styles.title}>Project Blockers Directory</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Review and resolve employee-raised blockages or escalate them to Management.
        </span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Employee</th>
              <th className={styles.th}>Task / Project</th>
              <th className={styles.th}>Blocker Details</th>
              <th className={styles.th}>Type</th>
              <th className={styles.th}>Priority</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {blockers.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.td} style={{ textAlign: 'center' }}>
                  No blockers logged. All tasks are flowing smoothly!
                </td>
              </tr>
            ) : (
              blockers.map(b => (
                <tr key={b._id} className={styles.tr}>
                  <td className={styles.td}>
                    <div style={{ fontWeight: '600' }}>{b.employee?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.employee?.employeeId}</div>
                  </td>
                  <td className={styles.td}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{b.task?.title || 'Standalone Blocker'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.task?.project?.name || 'No Project'}</div>
                  </td>
                  <td className={styles.td} style={{ maxWidth: '220px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>"{b.description}"</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Raised: {new Date(b.dateRaised || b.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className={styles.td}>{b.type}</td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${getPriorityBadge(b.priority)}`}>
                      {b.priority}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${getStatusBadge(b.status)}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {b.status !== 'Resolved' && b.status !== 'Closed' && (
                        <>
                          <button
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleUpdateStatus(b._id, 'Resolved')}
                          >
                            <FaCheck /> Resolve
                          </button>
                          {b.status === 'Open' && (
                            <button
                              className={`${styles.btn}`}
                              style={{ padding: '6px 12px', fontSize: '0.75rem', backgroundColor: '#e2e8f0', color: '#1e293b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleUpdateStatus(b._id, 'In Review')}
                            >
                              <FaSync /> In Review
                            </button>
                          )}
                          <button
                            className={`${styles.btn}`}
                            style={{ padding: '6px 12px', fontSize: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleOpenEscalation(b)}
                          >
                            <FaExclamationTriangle /> Escalate
                          </button>
                        </>
                      )}
                      {(b.status === 'Resolved' || b.status === 'Closed') && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: '600' }}>✓ Handled</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && selectedBlocker && (
        <div className={styles.modalOverlay}>
          <form className={styles.modalContent} style={{ maxWidth: '500px' }} onSubmit={handleEscalationSubmit}>
            <h3 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
              <FaExclamationTriangle /> Escalate Unresolved Blocker
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
              You are escalating the block on: <strong>{selectedBlocker.task?.title || 'Standalone Blocker'}</strong>
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Escalate To (Management/Admin) *</label>
              <select
                className={styles.select}
                value={escalateTo}
                onChange={(e) => setEscalateTo(e.target.value)}
                required
              >
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Reason for Escalation *</label>
              <textarea
                placeholder="Explain why this blocker requires management intervention..."
                className={styles.textarea}
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Escalation Priority Level</label>
              <select
                className={styles.select}
                value={escalationPriority}
                onChange={(e) => setEscalationPriority(e.target.value)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className={styles.actions} style={{ marginTop: '15px' }}>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ backgroundColor: '#dc2626' }}>
                Submit Escalation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default BlockersPage;
