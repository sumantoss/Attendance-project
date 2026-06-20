import { useState, useEffect } from 'react';
import { FaPlus, FaEdit } from 'react-icons/fa';
import api from '../services/api';
import styles from '../styles/AdminCommon.module.css';

function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({ name: '', isActive: true });
  const [error, setError] = useState('');

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchDepartments();
    });
  }, []);

  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormData({ name: '', isActive: true });
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setFormData({ name: dept.name, isActive: dept.isActive });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    setError('');

    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept._id}`, formData);
      } else {
        await api.post('/departments', formData);
      }
      setShowModal(false);
      fetchDepartments();
    } catch (err) {
      setError(err.response?.data?.message || 'Error occurred');
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Department Directory</h2>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleOpenAdd}>
          <FaPlus /> Add Department
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Department Name</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 ? (
              <tr>
                <td colSpan="3" className={styles.td} style={{ textAlign: 'center' }}>
                  No departments found.
                </td>
              </tr>
            ) : (
              departments.map(dept => (
                <tr key={dept._id} className={styles.tr}>
                  <td className={styles.td} style={{ fontWeight: '600' }}>{dept.name}</td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${dept.isActive ? styles.badgeSuccess : styles.badgeDanger}`}>
                      {dept.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <button 
                      className={`${styles.btn} ${styles.btnSecondary}`} 
                      style={{ display: 'inline-flex', padding: '6px 12px' }}
                      onClick={() => handleOpenEdit(dept)}
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
          <form className={styles.modalContent} onSubmit={handleSubmit}>
            <h3 className={styles.title}>{editingDept ? 'Edit Department' : 'Add Department'}</h3>
            
            {error && <div className={styles.badgeDanger} style={{ padding: '8px', borderRadius: '4px', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}

            <div className={styles.formGroup}>
              <label className={styles.label}>Department Name</label>
              <input 
                type="text" 
                className={styles.input} 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required 
              />
            </div>

            {editingDept && (
              <div className={styles.formGroup} style={{ flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <label htmlFor="isActive" className={styles.label}>Active Status</label>
              </div>
            )}

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

export default DepartmentsPage;
