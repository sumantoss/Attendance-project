import { useState, useEffect } from 'react';
import { FaPlus, FaEdit } from 'react-icons/fa';
import api from '../services/api';
import styles from '../styles/AdminCommon.module.css';

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProj, setEditingProj] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Active',
    teamMembers: []
  });
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data.filter(e => e.status === 'Active'));
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchProjects();
      fetchEmployees();
    });
  }, []);

  const handleOpenAdd = () => {
    setEditingProj(null);
    setFormData({
      name: '',
      description: '',
      status: 'Active',
      teamMembers: []
    });
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (proj) => {
    setEditingProj(proj);
    setFormData({
      name: proj.name,
      description: proj.description || '',
      status: proj.status,
      teamMembers: proj.teamMembers?.map(m => m._id) || []
    });
    setError('');
    setShowModal(true);
  };

  const handleToggleMember = (empId) => {
    const isSelected = formData.teamMembers.includes(empId);
    if (isSelected) {
      setFormData({
        ...formData,
        teamMembers: formData.teamMembers.filter(id => id !== empId)
      });
    } else {
      setFormData({
        ...formData,
        teamMembers: [...formData.teamMembers, empId]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    setError('');

    try {
      if (editingProj) {
        await api.put(`/projects/${editingProj._id}`, formData);
      } else {
        await api.post('/projects', formData);
      }
      setShowModal(false);
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Error occurred');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Active': return styles.badgeSuccess;
      case 'Planning': return styles.badgeWarning;
      case 'On Hold': return styles.badgeMuted;
      case 'Completed': return styles.badgeSuccess;
      default: return styles.badgeMuted;
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Project Dashboard</h2>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleOpenAdd}>
          <FaPlus /> Create Project
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Project Name</th>
              <th className={styles.th}>Description</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Team Members</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan="5" className={styles.td} style={{ textAlign: 'center' }}>
                  No projects created.
                </td>
              </tr>
            ) : (
              projects.map(proj => (
                <tr key={proj._id} className={styles.tr}>
                  <td className={styles.td} style={{ fontWeight: '600' }}>{proj.name}</td>
                  <td className={styles.td}>{proj.description || '-'}</td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${getStatusBadgeClass(proj.status)}`}>
                      {proj.status}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {proj.teamMembers?.length === 0 ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>No members</span>
                      ) : (
                        proj.teamMembers?.map(m => (
                          <span key={m._id} className={styles.badge} style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', fontSize: '0.7rem' }}>
                            {m.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      style={{ display: 'inline-flex', padding: '6px 12px' }}
                      onClick={() => handleOpenEdit(proj)}
                    >
                      <FaEdit /> Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <form className={styles.modalContent} style={{ maxWidth: '520px' }} onSubmit={handleSubmit}>
            <h3 className={styles.title}>{editingProj ? 'Modify Project' : 'Create Project'}</h3>

            {error && <div className={styles.badgeDanger} style={{ padding: '8px', borderRadius: '4px', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}

            <div className={styles.formGroup}>
              <label className={styles.label}>Project Name *</label>
              <input
                type="text"
                placeholder="e.g. SWMS App"
                className={styles.input}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                placeholder="Project brief..."
                className={styles.textarea}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Project Status</label>
              <select
                className={styles.select}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Team Members Allocation</label>
              <div style={{
                maxHeight: '120px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {employees.map(emp => {
                  const isChecked = formData.teamMembers.includes(emp._id);
                  return (
                    <label key={emp._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleMember(emp._id)}
                      />
                      <span>{emp.name} ({emp.role})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className={styles.actions} style={{ alignSelf: 'flex-end', marginTop: '10px' }}>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
