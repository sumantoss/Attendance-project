import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaEye, FaTrash } from 'react-icons/fa';
import api from '../services/api';
import styles from '../styles/AdminCommon.module.css';

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProj, setEditingProj] = useState(null);
  const [viewingProj, setViewingProj] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    assignedTo: '',
    priority: 'Medium',
    deadline: '',
    description: ''
  });
  
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Active',
    teamMembers: [],
    department: ''
  });
  const [error, setError] = useState('');
  
  const userRole = localStorage.getItem('swms_user_role');

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

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error('Failed to fetch departments', err);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchProjects();
      fetchEmployees();
      fetchDepartments();
    });
  }, []);

  const handleOpenAdd = () => {
    setEditingProj(null);
    setFormData({
      name: '',
      description: '',
      status: 'Active',
      teamMembers: [],
      department: ''
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
      teamMembers: proj.teamMembers?.map(m => m._id) || [],
      department: proj.department?._id || proj.department || ''
    });
    setError('');
    setShowModal(true);
  };

  const handleOpenView = async (proj) => {
    setViewingProj(proj);
    setShowTaskForm(false);
    try {
      const res = await api.get(`/reports/tasks?projectId=${proj._id}`);
      setProjectTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks for project', err);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskFormData.title || !taskFormData.assignedTo) return;
    try {
      await api.post('/tasks', {
        ...taskFormData,
        project: viewingProj._id,
        status: 'In Progress'
      });
      const res = await api.get(`/reports/tasks?projectId=${viewingProj._id}`);
      setProjectTasks(res.data);
      setShowTaskForm(false);
      setTaskFormData({ title: '', assignedTo: '', priority: 'Medium', deadline: '', description: '' });
    } catch (err) {
      console.error('Failed to create task', err);
      alert('Failed to create task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      const res = await api.get(`/reports/tasks?projectId=${viewingProj._id}`);
      setProjectTasks(res.data);
    } catch (err) {
      console.error('Failed to delete task', err);
      alert('Failed to delete task: ' + (err.response?.data?.message || err.message));
    }
  };


  const getGroupedTasks = () => {
    const grouped = {};
    projectTasks.forEach(task => {
      const assigneeId = task.assignedTo?._id || task.assignedTo;
      const emp = employees.find(e => e._id === assigneeId);
      const deptName = emp?.department?.name || 'Unassigned Area';
      if (!grouped[deptName]) grouped[deptName] = [];
      grouped[deptName].push(task);
    });
    return grouped;
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
                          <span key={m._id} className={styles.badge} style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.7rem' }}>
                            {m.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        style={{ display: 'inline-flex', padding: '6px 12px' }}
                        onClick={() => handleOpenView(proj)}
                      >
                        <FaEye /> View
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        style={{ display: 'inline-flex', padding: '6px 12px' }}
                        onClick={() => handleOpenEdit(proj)}
                      >
                        <FaEdit /> Edit
                      </button>
                    </div>
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

            {userRole === 'admin' && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Department</label>
                <select
                  className={styles.select}
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                >
                  <option value="">No Department Assigned</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            )}

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

      {viewingProj && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '800px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className={styles.title}>{viewingProj.name} - Roadmap</h3>
              <button onClick={() => setViewingProj(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
              {projectTasks.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>No tasks assigned to this project yet.</p>
              ) : (
                Object.entries(getGroupedTasks()).map(([deptName, tasks]) => (
                  <div key={deptName} style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }}></span>
                      {deptName}
                    </h4>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {tasks.map(task => (
                        <div key={task._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{task.title}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Assignee: {task.assignedTo?.name || 'Unknown'}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className={`${styles.badge} ${task.status === 'Completed' ? styles.badgeSuccess : task.status === 'Blocked' ? styles.badgeDanger : task.status === 'In Progress' ? styles.badgeWarning : styles.badgeMuted}`}>
                              {task.status}
                            </span>
                            <button 
                              onClick={() => handleDeleteTask(task._id)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                              title="Delete Task"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              {showTaskForm && (
                <form onSubmit={handleAddTask} style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '10px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1.05rem', color: 'var(--text-primary)' }}>New Task</h4>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <input className={styles.input} placeholder="Task Title *" value={taskFormData.title} onChange={e => setTaskFormData({...taskFormData, title: e.target.value})} required />
                    
                    <select className={styles.select} value={taskFormData.assignedTo} onChange={e => setTaskFormData({...taskFormData, assignedTo: e.target.value})} required>
                      <option value="">-- Assign To --</option>
                      {(viewingProj?.teamMembers || [])
                        .filter(emp => employees.some(e => e._id === emp._id))
                        .map(emp => (
                        <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
                      ))}
                    </select>

                    <textarea className={styles.textarea} style={{ minHeight: '60px' }} placeholder="Task Description" value={taskFormData.description} onChange={e => setTaskFormData({...taskFormData, description: e.target.value})} />

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <select className={styles.select} value={taskFormData.priority} onChange={e => setTaskFormData({...taskFormData, priority: e.target.value})}>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                      <input type="date" className={styles.input} value={taskFormData.deadline} onChange={e => setTaskFormData({...taskFormData, deadline: e.target.value})} />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowTaskForm(false)}>Cancel</button>
                      <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Save Task</button>
                    </div>
                  </div>
                </form>
              )}
            </div>
            <div className={styles.actions} style={{ alignSelf: 'flex-end', marginTop: '15px' }}>
              {!showTaskForm && (
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowTaskForm(true)}>
                  <FaPlus /> Add Task
                </button>
              )}
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setViewingProj(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
