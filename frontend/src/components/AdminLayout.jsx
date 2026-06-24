import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { 
  FaThLarge, FaUsers, FaBuilding, FaFolderOpen, 
  FaCheckSquare, FaFileAlt, FaCog, FaHistory, 
  FaSignOutAlt, FaBars, FaBell, FaExclamationTriangle, FaListAlt, FaChartLine,
  FaSun, FaMoon
} from 'react-icons/fa';
import api from '../services/api';
import styles from '../styles/AdminLayout.module.css';
import { io } from 'socket.io-client';

function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('swms_admin_token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Verify token & fetch notifications
    api.get('/auth/me')
      .then(res => {
        setAdminUser(res.data.username);
      })
      .catch(() => {
        localStorage.removeItem('swms_admin_token');
        navigate('/login');
      });

    Promise.resolve().then(() => {
      fetchNotifications();
    });
    const interval = setInterval(fetchNotifications, 30000); // refresh every 30s

    const socketUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'http://localhost:5000';
    const socket = io(socketUrl);

    socket.on('new-notification', () => {
      fetchNotifications();
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('swms_admin_token');
    navigate('/login');
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllNotif = async () => {
    try {
      await api.delete('/notifications');
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: <FaThLarge /> },
    { path: '/admin/employees', label: 'Employees', icon: <FaUsers /> },
    { path: '/admin/departments', label: 'Departments', icon: <FaBuilding /> },
    { path: '/admin/projects', label: 'Projects', icon: <FaFolderOpen /> },
    { path: '/admin/tasks', label: 'Tasks', icon: <FaCheckSquare /> },
    { path: '/admin/blockers', label: 'Blockers', icon: <FaExclamationTriangle /> },
    { path: '/admin/performance', label: 'Performance', icon: <FaChartLine /> },
    { path: '/admin/reports', label: 'Reports', icon: <FaFileAlt /> },
    { path: '/admin/settings', label: 'Settings', icon: <FaCog /> },
    { path: '/admin/audit-logs', label: 'Audit Logs', icon: <FaHistory /> },
  ];

  // Helper to check if item is active
  const isActive = (path) => location.pathname === path;

  // Page titles map
  const getPageTitle = () => {
    const activeItem = menuItems.find(item => item.path === location.pathname);
    if (activeItem) return activeItem.label;
    
    if (location.pathname.startsWith('/admin/employees/')) return 'Employee Details';
    if (location.pathname.startsWith('/admin/projects/')) return 'Project Details';
    if (location.pathname.startsWith('/admin/tasks/')) return 'Task Details';
    
    return 'Admin Portal';
  };

  return (
    <div className={styles.container}>
      {/* Sidebar Navigation */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.logoArea}>
          {!collapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Logo size={32} />
              <span className={styles.logoText}>Cropnow Admin</span>
            </div>
          ) : (
            <Logo size={28} style={{ margin: '0 auto' }} />
          )}
          <div className={styles.toggleBtn} onClick={() => setCollapsed(!collapsed)} style={{ marginLeft: collapsed ? '0' : 'auto' }}>
            <FaBars />
          </div>
        </div>
        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`${styles.navLink} ${isActive(item.path) ? styles.activeNavLink : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={`${styles.navLabel} ${collapsed ? styles.navLabelHidden : ''}`}>
                {item.label}
              </span>
            </Link>
          ))}
          <div className={styles.logoutBtn} onClick={handleLogout}>
            <span className={styles.navIcon}><FaSignOutAlt /></span>
            {!collapsed && <span className={styles.navLabel}>Logout</span>}
          </div>
        </nav>
      </aside>

      {/* Main Wrapper */}
      <div className={`${styles.mainWrapper} ${collapsed ? styles.mainWrapperCollapsed : ''}`}>
        {/* Header bar */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
          </div>
          <div className={styles.headerRight}>
            {/* Theme Toggle */}
            <div className={styles.themeToggleBtn} onClick={toggleTheme}>
              {theme === 'light' ? <FaMoon /> : <FaSun />}
            </div>

            {/* Notifications Dropdown */}
            <div className={styles.notificationArea}>
              <div 
                className={styles.notifIconBtn} 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              >
                <FaBell />
                {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
              </div>
              
              {showNotifDropdown && (
                <div className={styles.notifDropdown}>
                  <div className={styles.notifHeader}>
                    <span>Alerts ({unreadCount})</span>
                    {notifications.length > 0 && (
                      <button className={styles.notifClearBtn} onClick={handleClearAllNotif}>
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className={styles.notifList}>
                    {notifications.length === 0 ? (
                      <div className={styles.notifEmpty}>No system alerts</div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif._id} 
                          className={`${styles.notifItem} ${!notif.isRead ? styles.notifItemUnread : ''}`}
                          onClick={() => handleMarkAsRead(notif._id)}
                        >
                          {notif.message}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile badge */}
            <div className={styles.userBadge}>
              <div className={styles.avatar}>
                {adminUser ? adminUser.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{adminUser || 'Admin'}</span>
                <span className={styles.userRole}>HR Department</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content routing rendering viewport */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
