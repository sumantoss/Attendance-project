import { useState, useEffect } from 'react';
import { FaPlus, FaEdit } from 'react-icons/fa';
import api from '../services/api';
import styles from '../styles/AdminCommon.module.css';

function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    department: '',
    role: '',
    joiningDate: '',
    pin: '',
    status: 'Active'
  });
  const [error, setError] = useState('');

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.filter(d => d.isActive));
    } catch (err) {
      console.error('Failed to fetch departments', err);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchEmployees();
      fetchDepartments();
    });
  }, []);

  const handleOpenAdd = () => {
    setEditingEmp(null);
    setFormData({
      employeeId: '',
      name: '',
      department: departments.length > 0 ? departments[0]._id : '',
      role: '',
      joiningDate: new Date().toISOString().split('T')[0],
      pin: '',
      status: 'Active'
    });
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingEmp(emp);
    setFormData({
      employeeId: emp.employeeId,
      name: emp.name,
      department: emp.department?._id || '',
      role: emp.role,
      joiningDate: new Date(emp.joiningDate).toISOString().split('T')[0],
      pin: emp.pin,
      status: emp.status
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.name || !formData.department || !formData.role || !formData.pin) {
      alert('Please fill out all required fields');
      return;
    }
    setError('');

    try {
      if (editingEmp) {
        await api.put(`/employees/${editingEmp._id}`, formData);
      } else {
        await api.post('/employees', formData);
      }
      setShowModal(false);
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.message || 'Error occurred');
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Employee Management</h2>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleOpenAdd}>
          <FaPlus /> Add Employee
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Department</th>
              <th className={styles.th}>Role</th>
              <th className={styles.th}>PIN</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.td} style={{ textAlign: 'center' }}>
                  No employees found.
                </td>
              </tr>
            ) : (
              employees.map(emp => (
                <tr key={emp._id} className={styles.tr}>
                  <td className={styles.td} style={{ fontWeight: '600' }}>{emp.employeeId}</td>
                  <td className={styles.td} style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{emp.name}</td>
                  <td className={styles.td}>{emp.department?.name || 'Unassigned'}</td>
                  <td className={styles.td}>{emp.role}</td>
                  <td className={styles.td} style={{ letterSpacing: '2px', fontFamily: 'monospace' }}>{emp.pin}</td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${emp.status === 'Active' ? styles.badgeSuccess : styles.badgeDanger}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      style={{ display: 'inline-flex', padding: '6px 12px' }}
                      onClick={() => handleOpenEdit(emp)}
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
          <form className={styles.modalContent} style={{ maxWidth: '550px' }} onSubmit={handleSubmit}>
            <h3 className={styles.title}>{editingEmp ? 'Edit Employee Profile' : 'Add Employee Profile'}</h3>

            {error && <div className={styles.badgeDanger} style={{ padding: '8px', borderRadius: '4px', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Employee ID *</label>
                <input
                  type="text"
                  placeholder="e.g. EMP004"
                  className={styles.input}
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  disabled={!!editingEmp}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Full Name *</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className={styles.input}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Department *</label>
                <select
                  className={styles.select}
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                >
                  <option value="">-- Choose Dept --</option>
                  {departments.map(d => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Role *</label>
                <input
                  type="text"
                  placeholder="e.g. Project Manager"
                  className={styles.input}
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>4-Digit PIN *</label>
                <input
                  type="text"
                  maxLength="4"
                  placeholder="e.g. 5678"
                  className={styles.input}
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Joining Date *</label>
                <input
                  type="date"
                  className={styles.input}
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Status</label>
                <select
                  className={styles.select}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
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

export default EmployeesPage;
