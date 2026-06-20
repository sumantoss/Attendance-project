import { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaCheckCircle, FaUserCheck, FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';
import api from '../services/api';
import styles from '../styles/AttendancePage.module.css';

function AttendancePage() {
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null, accuracy: null, error: null });
  const [settings, setSettings] = useState(null);
  
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  
  const [pin, setPin] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [employeeStatus, setEmployeeStatus] = useState(null);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check out Work Update modal state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [selectedTasksData, setSelectedTasksData] = useState({});

  const resetPin = () => {
    setPin('');
    setPinVerified(false);
    setEmployeeStatus(null);
    setErrorMsg('');
  };

  const recalculateHours = (prevData) => {
    const checkedTaskIds = Object.keys(prevData).filter(id => prevData[id].checked);
    const count = checkedTaskIds.length;
    
    const checkInTime = employeeStatus?.attendance?.checkIn;
    const elapsed = checkInTime 
      ? Math.max(0.1, parseFloat(((new Date() - new Date(checkInTime)) / (1000 * 60 * 60)).toFixed(1))) 
      : 8.5;

    const hoursPerTask = count > 0 ? parseFloat((elapsed / count).toFixed(1)) : 0;

    const newData = { ...prevData };
    Object.keys(newData).forEach(id => {
      if (newData[id].checked) {
        newData[id] = {
          ...newData[id],
          hoursWorked: hoursPerTask
        };
      } else {
        newData[id] = {
          ...newData[id],
          hoursWorked: 0
        };
      }
    });
    return newData;
  };

  // Load departments and settings
  useEffect(() => {
    api.get('/departments')
      .then(res => setDepartments(res.data.filter(d => d.isActive)))
      .catch(err => console.error('Error fetching departments', err));

    api.get('/settings')
      .then(res => setSettings(res.data))
      .catch(err => console.error('Error fetching settings', err));

    // Geolocate
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            error: null
          });
        },
        (error) => {
          console.error('GPS Access Denied', error);
          setCoordinates(prev => ({
            ...prev,
            error: 'GPS Access Denied. Please enable location permissions to mark attendance.'
          }));
        },
        { enableHighAccuracy: true }
      );
    } else {
      Promise.resolve().then(() => {
        setCoordinates(prev => ({
          ...prev,
          error: 'Geolocation is not supported by your browser.'
        }));
      });
    }
  }, []);

  // Fetch employees when department changes
  useEffect(() => {
    if (selectedDept) {
      api.get(`/employees/dept/${selectedDept}`)
        .then(res => {
          setEmployees(res.data);
          setSelectedEmp('');
          resetPin();
        })
        .catch(err => console.error('Error fetching employees', err));
    } else {
      Promise.resolve().then(() => {
        setEmployees([]);
        setSelectedEmp('');
        resetPin();
      });
    }
  }, [selectedDept]);

  // Load tasks for checkout checklist when modal opens
  useEffect(() => {
    if (showCheckoutModal && employeeStatus && employeeStatus.employee) {
      api.get(`/tasks?assignedTo=${employeeStatus.employee._id}`)
        .then(res => {
          const activeTasks = res.data.filter(t => t.status !== 'Completed');
          setAssignedTasks(activeTasks);
          
          const initialData = {};
          activeTasks.forEach(task => {
            initialData[task._id] = {
              checked: false,
              task: task._id,
              hoursWorked: 0,
              progressPercent: task.progressPercent || 0,
              status: task.status || 'In Progress',
              workSummary: '',
              subtarget: '',
              raiseBlocker: false,
              blockerType: 'Technical Issue',
              blockerDesc: '',
              blockerPriority: 'Medium'
            };
          });
          setSelectedTasksData(initialData);
        })
        .catch(err => console.error('Error fetching tasks for checkout', err));
    }
  }, [showCheckoutModal, employeeStatus]);


  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        verifyEmployeeStatus(newPin);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMsg('');
    }
  };

  const verifyEmployeeStatus = async (enteredPin) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post('/attendance/status', {
        employeeId: selectedEmp,
        pin: enteredPin,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      });
      setEmployeeStatus(res.data);
      setPinVerified(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Verification failed. Check PIN or Location.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (actionPath) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      await api.post(`/attendance/${actionPath}`, {
        employeeId: selectedEmp,
        pin,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      });
      setSuccessMsg(`Action successful!`);
      setTimeout(() => {
        setSuccessMsg('');
        resetAll();
      }, 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();

    const workedTasksList = Object.values(selectedTasksData).filter(t => t.checked);
    if (workedTasksList.length === 0) {
      alert('Please select and log details for at least one task you worked on today.');
      return;
    }

    for (const item of workedTasksList) {
      if (!item.hoursWorked || parseFloat(item.hoursWorked) <= 0) {
        alert('Please specify valid hours worked for checked tasks.');
        return;
      }
      if (!item.workSummary || item.workSummary.trim() === '') {
        alert('Please fill out the work summary for checked tasks.');
        return;
      }
      if (!item.subtarget || item.subtarget.trim() === '') {
        alert('Please fill out the subtarget working on for checked tasks.');
        return;
      }
      if (item.raiseBlocker) {
        if (!item.blockerDesc || item.blockerDesc.trim() === '') {
          alert('Please enter a description for the blocker.');
          return;
        }
      }
    }

    setIsLoading(true);
    setErrorMsg('');

    const workedTasks = workedTasksList.map(item => {
      const payloadItem = {
        task: item.task,
        hoursWorked: parseFloat(item.hoursWorked),
        progressPercent: parseInt(item.progressPercent),
        status: item.raiseBlocker ? 'Blocked' : item.status,
        workSummary: item.workSummary,
        subtarget: item.subtarget
      };
      if (item.raiseBlocker) {
        payloadItem.blocker = {
          type: item.blockerType,
          description: item.blockerDesc,
          priority: item.blockerPriority
        };
      }
      return payloadItem;
    });

    try {
      await api.post('/attendance/check-out', {
        employeeId: selectedEmp,
        pin,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        workedTasks
      });
      setShowCheckoutModal(false);
      setSuccessMsg('Checked out successfully. Have a nice evening!');
      setTimeout(() => {
        setSuccessMsg('');
        resetAll();
      }, 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Check-out failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAll = () => {
    setSelectedDept('');
    setSelectedEmp('');
    resetPin();
    setAssignedTasks([]);
    setSelectedTasksData({});
  };

  return (
    <div className={styles.container}>
      <div className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <img src="/logo.png" alt="Cropnow Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', mixBlendMode: 'screen', marginBottom: '24px' }} />
          <h1 style={{ fontFamily: 'var(--font-family-display)', fontSize: '3rem', fontWeight: 300, color: 'var(--color-canvas)', lineHeight: 1.1, marginBottom: '16px' }}>Cropnow<br />Attendance</h1>
          <p style={{ color: '#9CA8A0', fontSize: '1rem', fontFamily: 'var(--font-family-utility)' }}>Terminal</p>
        </div>
      </div>
      <div className={styles.formPanel}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h2 className={styles.title}>Secure Check-in</h2>
            <p className={styles.subtitle}>Enter your details to clock in or out.</p>
          </div>

        {/* GPS Banner */}
        {settings && (
          <div className={`${styles.gpsBanner} ${
            settings.bypassGPS 
              ? styles.gpsSuccess 
              : coordinates.error 
                ? styles.gpsError 
                : styles.gpsSuccess
          }`}>
            <span>
              <FaMapMarkerAlt /> 
              {settings.bypassGPS 
                ? ' Dev Mode: GPS Verification Bypassed' 
                : coordinates.error 
                  ? ` ${coordinates.error}` 
                  : ' Office GPS Connected'
              }
            </span>
          </div>
        )}

        {successMsg ? (
          <div className={styles.successCard}>
            <FaCheckCircle style={{ fontSize: '2.5rem', marginBottom: '10px', display: 'block', margin: '0 auto 10px' }} />
            <p>{successMsg}</p>
          </div>
        ) : (
          <>
            {/* Step 1: Select Department */}
            <div className={styles.formGroup}>
              <label className={styles.label}>1. Select Department</label>
              <select 
                className={styles.select}
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="">-- Choose Department --</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>

            {/* Step 2: Select Employee */}
            {selectedDept && (
              <div className={styles.formGroup}>
                <label className={styles.label}>2. Select Employee</label>
                <select
                  className={styles.select}
                  value={selectedEmp}
                  onChange={(e) => {
                    setSelectedEmp(e.target.value);
                    resetPin();
                  }}
                >
                  <option value="">-- Choose Your Name --</option>
                  {employees.map(emp => (
                    <option key={emp.employeeId} value={emp.employeeId}>{emp.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Step 3: Enter PIN */}
            {selectedEmp && !pinVerified && (
              <div className={styles.pinPadContainer}>
                <label className={styles.label}>3. Enter 4-Digit PIN</label>
                <div className={styles.pinDisplay}>
                  {[0, 1, 2, 3].map((index) => (
                    <div 
                      key={index} 
                      className={`${styles.pinDot} ${pin.length > index ? styles.pinDotFilled : ''}`}
                    />
                  ))}
                </div>
                <div className={styles.keypad}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button 
                      key={num} 
                      className={styles.key}
                      onClick={() => handleKeyPress(num.toString())}
                      disabled={isLoading}
                    >
                      {num}
                    </button>
                  ))}
                  <button className={`${styles.key} ${styles.keyClear}`} onClick={resetAll} disabled={isLoading}>
                    Reset
                  </button>
                  <button 
                    className={styles.key}
                    onClick={() => handleKeyPress('0')}
                    disabled={isLoading}
                  >
                    0
                  </button>
                  <button className={`${styles.key} ${styles.keyClear}`} onClick={handleBackspace} disabled={isLoading}>
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Available Actions */}
            {pinVerified && employeeStatus && (
              <div className={styles.statusCard}>
                <FaUserCheck style={{ fontSize: '2rem', color: 'var(--color-primary)' }} />
                <div>
                  <h3 className={styles.statusName}>{employeeStatus.employee.name}</h3>
                  <p className={styles.statusText}>{employeeStatus.employee.role}</p>
                </div>

                <div className={styles.actionsContainer} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Case 1: Check In */}
                  {!employeeStatus.checkedIn && (
                    <button 
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={() => handleAction('check-in')}
                      disabled={isLoading}
                    >
                      <FaSignInAlt /> Check In
                    </button>
                  )}

                  {/* Case 2: Already Checked Out */}
                  {employeeStatus.checkedIn && employeeStatus.checkedOut && (
                    <div className={styles.successCard} style={{ padding: '10px', textAlign: 'center' }}>
                      Attendance Closed for Today. Thank you!
                    </div>
                  )}

                  {/* Case 3: Checked In, can Check Out */}
                  {employeeStatus.checkedIn && !employeeStatus.checkedOut && (
                    <button 
                      className={`${styles.btn} ${styles.btnDanger}`}
                      onClick={() => setShowCheckoutModal(true)}
                      disabled={isLoading}
                    >
                      <FaSignOutAlt /> Check Out
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Error messaging panel */}
            {errorMsg && <div className={styles.errorCard}>{errorMsg}</div>}
          </>
        )}
      </div>

      {/* Checkout modal for Work Update */}
      {showCheckoutModal && (
        <div className={styles.modalOverlay}>
          <form className={styles.modalContent} style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }} onSubmit={handleCheckoutSubmit}>
            <h2 className={styles.modalTitle}>Checkout & Daily Work Update</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
              Select the tasks you worked on today, record hours, update progress, and raise blockers if any.
            </p>

            {assignedTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-danger)' }}>
                No active tasks assigned to you. Please contact your reporting manager to assign tasks.
              </div>
            ) : (
              <div className={styles.taskListContainer} style={{ marginBottom: '20px' }}>
                {assignedTasks.map(task => {
                  const taskData = selectedTasksData[task._id] || {};
                  return (
                    <div 
                      key={task._id} 
                      style={{ 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px', 
                        padding: '15px', 
                        marginBottom: '15px',
                        backgroundColor: taskData.checked ? '#f8fafc' : '#fff',
                        boxShadow: taskData.checked ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', color: 'var(--text-primary)' }}>
                        <input 
                          type="checkbox" 
                          style={{ marginRight: '10px', width: '18px', height: '18px' }}
                          checked={!!taskData.checked}
                          onChange={(e) => {
                            setSelectedTasksData(prev => {
                              const updated = {
                                ...prev,
                                [task._id]: { ...prev[task._id], checked: e.target.checked }
                              };
                              return recalculateHours(updated);
                            });
                          }}
                        />
                        {task.title} <span style={{ marginLeft: '10px', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#e2e8f0', color: '#475569' }}>{task.project?.name}</span>
                      </label>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '28px', marginTop: '4px' }}>
                        {task.description || 'No description'}
                      </div>

                      {taskData.checked && (
                        <div style={{ marginLeft: '28px', marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div className={styles.formGroup}>
                              <label className={styles.label}>Hours Worked Today *</label>
                              <input 
                                type="number" 
                                className={styles.input} 
                                value={taskData.hoursWorked || ''}
                                disabled
                                required
                              />
                            </div>
                            <div className={styles.formGroup}>
                              <label className={styles.label}>Progress % *</label>
                              <input 
                                type="number" 
                                min="0" 
                                max="100" 
                                className={styles.input} 
                                value={taskData.progressPercent !== undefined ? taskData.progressPercent : ''}
                                onChange={(e) => {
                                  setSelectedTasksData(prev => ({
                                    ...prev,
                                    [task._id]: { ...prev[task._id], progressPercent: e.target.value }
                                  }));
                                }}
                                required
                              />
                            </div>
                          </div>

                          <div className={styles.formGroup}>
                            <label className={styles.label}>Task Status *</label>
                            <select 
                              className={styles.select}
                              value={taskData.status || 'In Progress'}
                              onChange={(e) => {
                                setSelectedTasksData(prev => ({
                                  ...prev,
                                  [task._id]: { ...prev[task._id], status: e.target.value }
                                }));
                              }}
                              required
                            >
                              <option value="Not Started">Not Started</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>

                          <div className={styles.formGroup}>
                            <label className={styles.label}>Subtarget working on *</label>
                            <input 
                              type="text"
                              placeholder="e.g. Working on authorization middleware & integration tests"
                              className={styles.input} 
                              value={taskData.subtarget || ''}
                              onChange={(e) => {
                                setSelectedTasksData(prev => ({
                                  ...prev,
                                  [task._id]: { ...prev[task._id], subtarget: e.target.value }
                                }));
                              }}
                              required
                            />
                          </div>

                          <div className={styles.formGroup}>
                            <label className={styles.label}>Work Summary *</label>
                            <textarea 
                              placeholder="Detail your contributions on this task today..."
                              className={styles.textarea} 
                              value={taskData.workSummary || ''}
                              onChange={(e) => {
                                setSelectedTasksData(prev => ({
                                  ...prev,
                                  [task._id]: { ...prev[task._id], workSummary: e.target.value }
                                }));
                              }}
                              required
                            />
                          </div>

                          <div style={{ marginTop: '5px', padding: '10px', backgroundColor: '#fff', border: '1px dashed #ccc', borderRadius: '6px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: '500' }}>
                              <input 
                                type="checkbox" 
                                style={{ marginRight: '8px' }}
                                checked={!!taskData.raiseBlocker}
                                onChange={(e) => {
                                  setSelectedTasksData(prev => ({
                                    ...prev,
                                    [task._id]: { ...prev[task._id], raiseBlocker: e.target.checked }
                                  }));
                                }}
                              />
                              Raise Blocker for this task?
                            </label>

                            {taskData.raiseBlocker && (
                              <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                  <div className={styles.formGroup}>
                                    <label className={styles.label}>Blocker Type *</label>
                                    <select
                                      className={styles.select}
                                      value={taskData.blockerType || 'Technical Issue'}
                                      onChange={(e) => {
                                        setSelectedTasksData(prev => ({
                                          ...prev,
                                          [task._id]: { ...prev[task._id], blockerType: e.target.value }
                                        }));
                                      }}
                                    >
                                      <option value="Technical Issue">Technical Issue</option>
                                      <option value="Requirement Missing">Requirement Missing</option>
                                      <option value="Dependency Pending">Dependency Pending</option>
                                      <option value="Waiting For Approval">Waiting For Approval</option>
                                      <option value="External Dependency">External Dependency</option>
                                      <option value="Other">Other</option>
                                    </select>
                                  </div>
                                  <div className={styles.formGroup}>
                                    <label className={styles.label}>Blocker Priority *</label>
                                    <select
                                      className={styles.select}
                                      value={taskData.blockerPriority || 'Medium'}
                                      onChange={(e) => {
                                        setSelectedTasksData(prev => ({
                                          ...prev,
                                          [task._id]: { ...prev[task._id], blockerPriority: e.target.value }
                                        }));
                                      }}
                                    >
                                      <option value="Low">Low</option>
                                      <option value="Medium">Medium</option>
                                      <option value="High">High</option>
                                      <option value="Critical">Critical</option>
                                    </select>
                                  </div>
                                </div>
                                <div className={styles.formGroup}>
                                  <label className={styles.label}>Blocker Description *</label>
                                  <textarea
                                    placeholder="Explain why this task is blocked..."
                                    className={styles.textarea}
                                    value={taskData.blockerDesc || ''}
                                    onChange={(e) => {
                                      setSelectedTasksData(prev => ({
                                        ...prev,
                                        [task._id]: { ...prev[task._id], blockerDesc: e.target.value }
                                      }));
                                    }}
                                    required
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className={styles.modalActions}>
              <button 
                type="button" 
                className={`${styles.btn} ${styles.btnCancel}`} 
                onClick={() => setShowCheckoutModal(false)}
                disabled={isLoading}
              >
                Back
              </button>
              {assignedTasks.length > 0 && (
                <button 
                  type="submit" 
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={isLoading}
                >
                  Submit & Check Out
                </button>
              )}
            </div>
          </form>
        </div>
      )}
      </div> {/* End formPanel */}
    </div>
  );
}

export default AttendancePage;
