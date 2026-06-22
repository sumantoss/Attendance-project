import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaEdit, FaEye, FaEyeSlash, FaChevronDown, FaChevronRight, FaSearch, FaUsers } from 'react-icons/fa';
import api from '../services/api';
import styles from '../styles/AdminCommon.module.css';

/* ── tiny inline styles for the department grouping ── */
const deptStyles = {
  filterBar: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchBox: {
    position: 'relative',
    flex: '1 1 220px',
    maxWidth: '320px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px 10px 36px',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    background: '#fff',
    outline: 'none',
    transition: 'all 0.2s ease-in-out',
  },
  deptChip: (active) => ({
    padding: '7px 16px',
    borderRadius: '9999px',
    fontSize: '0.82rem',
    fontWeight: active ? '600' : '500',
    cursor: 'pointer',
    border: active ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
    background: active ? 'var(--color-primary-light, #EEF2FF)' : '#fff',
    color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  }),
  countBubble: (active) => ({
    background: active ? 'var(--color-primary)' : 'var(--border-color)',
    color: active ? '#fff' : 'var(--text-secondary)',
    borderRadius: '9999px',
    padding: '1px 7px',
    fontSize: '0.72rem',
    fontWeight: '700',
    lineHeight: '1.4',
  }),
  sectionHeader: (expanded) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    background: expanded ? 'var(--color-canvas, #F9FAFB)' : '#fff',
    borderBottom: '1px solid var(--border-color)',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background 0.2s ease',
  }),
  sectionLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  deptIcon: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-sm)',
    background: 'linear-gradient(135deg, var(--color-primary-light, #EEF2FF), var(--color-primary-light, #E0E7FF))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-primary)',
    fontSize: '0.85rem',
  },
  deptName: {
    fontWeight: '600',
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
  },
  empCount: {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  chevron: {
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    transition: 'transform 0.2s ease',
  },
  emptyMsg: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
  },
};

function EmployeesPage() {
  const navigate = useNavigate();
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
    status: 'Active',
    email: '',
    phone: '',
    reportingManager: ''
  });
  const [error, setError] = useState('');

  // New state for filtering & grouping
  const [selectedDept, setSelectedDept] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDepts, setExpandedDepts] = useState({}); // { deptId: true/false }
  const [visiblePins, setVisiblePins] = useState({});

  const togglePinVisibility = (empId) => {
    setVisiblePins(prev => ({ ...prev, [empId]: !prev[empId] }));
  };

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

  // Expand all departments by default once data loads
  useEffect(() => {
    if (departments.length > 0) {
      const initial = { unassigned: true };
      departments.forEach(d => { initial[d._id] = true; });
      setExpandedDepts(prev => {
        // Only set defaults for keys not already set
        const merged = { ...initial };
        Object.keys(prev).forEach(k => { merged[k] = prev[k]; });
        return merged;
      });
    }
  }, [departments]);

  // Group employees by department
  const groupedEmployees = useMemo(() => {
    let filtered = employees;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(q) ||
        emp.employeeId.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q)
      );
    }

    // Department filter
    if (selectedDept !== 'all') {
      if (selectedDept === 'unassigned') {
        filtered = filtered.filter(emp => !emp.department);
      } else {
        filtered = filtered.filter(emp => emp.department?._id === selectedDept);
      }
    }

    // Build groups
    const groups = {};
    filtered.forEach(emp => {
      const deptId = emp.department?._id || 'unassigned';
      const deptName = emp.department?.name || 'Unassigned';
      if (!groups[deptId]) {
        groups[deptId] = { deptId, deptName, employees: [] };
      }
      groups[deptId].employees.push(emp);
    });

    // Sort groups: named departments alphabetically, "Unassigned" last
    return Object.values(groups).sort((a, b) => {
      if (a.deptId === 'unassigned') return 1;
      if (b.deptId === 'unassigned') return -1;
      return a.deptName.localeCompare(b.deptName);
    });
  }, [employees, selectedDept, searchQuery]);

  // Dept counts for filter chips (before search, so chips show total counts)
  const deptCounts = useMemo(() => {
    const counts = { all: employees.length, unassigned: 0 };
    departments.forEach(d => { counts[d._id] = 0; });
    employees.forEach(emp => {
      const deptId = emp.department?._id || 'unassigned';
      counts[deptId] = (counts[deptId] || 0) + 1;
    });
    return counts;
  }, [employees, departments]);

  const toggleDept = (deptId) => {
    setExpandedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const handleOpenAdd = () => {
    setEditingEmp(null);
    setFormData({
      employeeId: '',
      name: '',
      department: departments.length > 0 ? departments[0]._id : '',
      role: '',
      joiningDate: new Date().toISOString().split('T')[0],
      pin: '',
      status: 'Active',
      email: '',
      phone: '',
      reportingManager: ''
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
      status: emp.status,
      email: emp.email || '',
      phone: emp.phone || '',
      reportingManager: emp.reportingManager?._id || emp.reportingManager || ''
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
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Employee Management</h2>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleOpenAdd}>
          <FaPlus /> Add Employee
        </button>
      </div>

      {/* Filter bar: search + department chips */}
      <div style={deptStyles.filterBar}>
        <div style={deptStyles.searchBox}>
          <FaSearch style={deptStyles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name, ID, or role…"
            style={deptStyles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* "All" chip */}
          <span
            style={deptStyles.deptChip(selectedDept === 'all')}
            onClick={() => setSelectedDept('all')}
          >
            All
            <span style={deptStyles.countBubble(selectedDept === 'all')}>{deptCounts.all}</span>
          </span>

          {/* Per-department chips */}
          {departments.map(d => (
            <span
              key={d._id}
              style={deptStyles.deptChip(selectedDept === d._id)}
              onClick={() => setSelectedDept(d._id)}
            >
              {d.name}
              <span style={deptStyles.countBubble(selectedDept === d._id)}>{deptCounts[d._id] || 0}</span>
            </span>
          ))}

          {/* Unassigned chip (only show if there are unassigned employees) */}
          {deptCounts.unassigned > 0 && (
            <span
              style={deptStyles.deptChip(selectedDept === 'unassigned')}
              onClick={() => setSelectedDept('unassigned')}
            >
              Unassigned
              <span style={deptStyles.countBubble(selectedDept === 'unassigned')}>{deptCounts.unassigned}</span>
            </span>
          )}
        </div>
      </div>

      {/* Grouped employee sections */}
      {groupedEmployees.length === 0 ? (
        <div style={deptStyles.emptyMsg}>
          <FaUsers style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.4 }} /><br />
          No employees found.
        </div>
      ) : (
        groupedEmployees.map(group => {
          const isExpanded = expandedDepts[group.deptId] !== false;
          return (
            <div key={group.deptId} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {/* Department section header */}
              <div
                style={deptStyles.sectionHeader(isExpanded)}
                onClick={() => toggleDept(group.deptId)}
              >
                <div style={deptStyles.sectionLeft}>
                  <div style={deptStyles.deptIcon}>
                    <FaUsers />
                  </div>
                  <div>
                    <div style={deptStyles.deptName}>{group.deptName}</div>
                    <div style={deptStyles.empCount}>
                      {group.employees.length} employee{group.employees.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <span style={deptStyles.chevron}>
                  {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                </span>
              </div>

              {/* Employee table for this department */}
              {isExpanded && (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>ID</th>
                      <th className={styles.th}>Name</th>
                      <th className={styles.th}>Role</th>
                      <th className={styles.th}>PIN</th>
                      <th className={styles.th}>Status</th>
                      <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.employees.map(emp => (
                      <tr key={emp._id} className={styles.tr}>
                        <td className={styles.td} style={{ fontWeight: '600' }}>{emp.employeeId}</td>
                        <td className={styles.td}>
                          <span
                            style={{ fontWeight: '500', color: 'var(--color-primary)', cursor: 'pointer', borderBottom: '1px dashed var(--color-primary)' }}
                            onClick={() => navigate(`/admin/employees/${emp._id}`)}
                          >
                            {emp.name}
                          </span>
                        </td>
                        <td className={styles.td}>{emp.role}</td>
                        <td className={styles.td} style={{ letterSpacing: '2px', fontFamily: 'monospace', position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{visiblePins[emp._id] ? emp.pin : '••••'}</span>
                            <button 
                              onClick={() => togglePinVisibility(emp._id)} 
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px', display: 'flex', alignItems: 'center' }}
                              title={visiblePins[emp._id] ? "Hide PIN" : "Show PIN"}
                            >
                              {visiblePins[emp._id] ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>
                        </td>
                        <td className={styles.td}>
                          <span className={`${styles.badge} ${emp.status === 'Active' ? styles.badgeSuccess : styles.badgeDanger}`}>
                            {emp.status}
                          </span>
                        </td>
                        <td className={styles.td} style={{ textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            style={{ display: 'inline-flex', padding: '6px 12px', fontSize: '0.82rem' }}
                            onClick={() => navigate(`/admin/employees/${emp._id}`)}
                          >
                            <FaEye /> View
                          </button>
                          <button
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            style={{ display: 'inline-flex', padding: '6px 12px' }}
                            onClick={() => handleOpenEdit(emp)}
                          >
                            <FaEdit /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })
      )}

      {/* Add / Edit Modal (unchanged) */}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. email@company.com"
                  className={styles.input}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  className={styles.input}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
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

              <div className={styles.formGroup}>
                <label className={styles.label}>Reporting Manager</label>
                <select
                  className={styles.select}
                  value={formData.reportingManager}
                  onChange={(e) => setFormData({ ...formData, reportingManager: e.target.value })}
                >
                  <option value="">-- No Manager --</option>
                  {employees
                    .filter(emp => !editingEmp || emp._id !== editingEmp._id)
                    .map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
                    ))}
                </select>
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
