import { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaEdit } from 'react-icons/fa';
import api from '../services/api';
import styles from '../styles/AdminCommon.module.css';

function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [formData, setFormData] = useState({
    project: '',
    assignedTo: '',
    title: '',
    description: '',
    priority: 'Medium',
    deadline: '',
    status: 'Pending'
  });
  const [error, setError] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to load tasks', err);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/projects');
      const activeProj = res.data.filter(p => p.status === 'Active');
      setProjects(activeProj);
      setFormData(prev => {
        if (activeProj.length > 0 && !prev.project) {
          return { ...prev, project: activeProj[0]._id };
        }
        return prev;
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get('/employees');
      const activeEmp = res.data.filter(e => e.status === 'Active');
      setEmployees(activeEmp);
      setFormData(prev => {
        if (activeEmp.length > 0 && !prev.assignedTo) {
          return { ...prev, assignedTo: activeEmp[0]._id };
        }
        return prev;
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchTasks();
      fetchProjects();
      fetchEmployees();
    });
  }, [fetchTasks, fetchProjects, fetchEmployees]);

  const handleOpenAdd = () => {
    setEditingTask(null);
    setFormData({
      project: projects.length > 0 ? projects[0]._id : '',
      assignedTo: employees.length > 0 ? employees[0]._id : '',
      title: '',
      description: '',
      priority: 'Medium',
      deadline: new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0],
      status: 'Pending'
    });
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setFormData({
      project: task.project?._id || '',
      assignedTo: task.assignedTo?._id || '',
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'Medium',
      deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
      status: task.status || 'Pending'
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project || !formData.assignedTo || !formData.title) {
      alert('Please fill in required fields');
      return;
    }
    setError('');

    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask._id}`, formData);
      } else {
        await api.post('/tasks', formData);
      }
      setShowModal(false);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || 'Error occurred');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed': return styles.badgeSuccess;
      case 'In Progress': return styles.badgeWarning;
      case 'Blocked': return styles.badgeDanger;
      default: return styles.badgeMuted;
    }
  };

  const getPriorityBadge = (prio) => {
    switch (prio) {
      case 'High': return styles.badgeDanger;
      case 'Medium': return styles.badgeWarning;
      default: return styles.badgeSuccess;
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Task Allocations</h2>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleOpenAdd}>
          <FaPlus /> Assign Task
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Project</th>
              <th className={styles.th}>Task</th>
              <th className={styles.th}>Assigned To</th>
              <th className={styles.th}>Priority</th>
              <th className={styles.th}>Deadline</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.td} style={{ textAlign: 'center' }}>
                  No tasks assigned yet.
                </td>
              </tr>
            ) : (
              tasks.map(task => (
                <tr key={task._id} className={styles.tr}>
                  <td className={styles.td} style={{ fontWeight: '500' }}>{task.project?.name}</td>
                  <td className={styles.td}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{task.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{task.description}</div>
                  </td>
                  <td className={styles.td}>{task.assignedTo?.name}</td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${getPriorityBadge(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {task.deadline ? new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${getStatusBadge(task.status)}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      style={{ display: 'inline-flex', padding: '6px 12px' }}
                      onClick={() => handleOpenEdit(task)}
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
            <h3 className={styles.title}>{editingTask ? 'Edit Task Details' : 'Assign Task'}</h3>

            {error && <div className={styles.badgeDanger} style={{ padding: '8px', borderRadius: '4px', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}

            <div className={styles.formGroup}>
              <label className={styles.label}>Associated Project *</label>
              <select
                className={styles.select}
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                required
              >
                <option value="">-- Choose Project --</option>
                {projects.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Assignee Employee *</label>
              <select
                className={styles.select}
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                required
              >
                <option value="">-- Choose Employee --</option>
                {employees.map(e => (
                  <option key={e._id} value={e._id}>{e.name} ({e.role})</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Task Title *</label>
              <input
                type="text"
                placeholder="e.g. Integrate map widget"
                className={styles.input}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Task Description</label>
              <textarea
                placeholder="List tasks checklist or guidelines..."
                className={styles.textarea}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Priority Level</label>
                <select
                  className={styles.select}
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Task Deadline</label>
                <input
                  type="date"
                  className={styles.input}
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Status</label>
              <select
                className={styles.select}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Blocked">Blocked</option>
                <option value="Completed">Completed</option>
              </select>
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

export default TasksPage;
