import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMoon, FaSun, FaEye, FaEyeSlash } from 'react-icons/fa';
import api from '../services/api';
import Logo from '../components/Logo';
import styles from '../styles/LoginPage.module.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [selectedRole, setSelectedRole] = useState('admin');
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedRole === 'teamlead') {
      setIsSignUp(false);
    }
  }, [selectedRole]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Fetch departments for team lead signup
    api.get('/departments')
      .then(res => {
        setDepartments(res.data);
        if (res.data.length > 0) setSelectedDepartment(res.data[0]._id);
      })
      .catch(err => console.error('Failed to load departments', err));
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isSignUp) {
      if (!fullName || !email || !password || !confirmPassword) {
        setError('Please fill in all fields');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (selectedRole === 'teamlead' && !selectedDepartment) {
        setError('Please select a department for the team lead');
        return;
      }
    } else {
      if (!email || !password) {
        setError('Please fill in all fields');
        return;
      }
    }
    
    setIsLoading(true);
    setError('');

    try {
      const endpoint = isSignUp ? '/auth/register' : '/auth/login';
      const payload = isSignUp 
        ? { fullName, email, password, role: selectedRole, department: selectedDepartment } 
        : { email, password, role: selectedRole };
      const res = await api.post(endpoint, payload);
      localStorage.setItem('swms_admin_token', res.data.token);
      localStorage.setItem('swms_user_role', res.data.user.role || selectedRole);
      
      // Navigate based on role
      if (res.data.user.role === 'teamlead') {
        navigate('/teamlead/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || (isSignUp ? 'Registration failed' : 'Invalid credentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const subtitleText = selectedRole === 'admin' 
    ? 'Enter HR admin credentials to manage' 
    : 'Enter team lead credentials to continue';

  return (
    <div className={styles.container}>
      <button 
        onClick={toggleTheme}
        style={{
          position: 'absolute', top: '20px', right: '20px',
          width: '40px', height: '40px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
          color: 'var(--text-primary)', cursor: 'pointer', zIndex: 10
        }}
      >
        {theme === 'light' ? <FaMoon /> : <FaSun />}
      </button>
      <div className={styles.card}>
        <div className={styles.header}>
          <Logo size={64} style={{ display: 'block', margin: '0 auto 16px auto' }} />
          <h1 className={styles.title}>Cropnow Portal</h1>
          <p className={styles.subtitle}>{subtitleText}</p>
        </div>

        <form className={styles.form} onSubmit={handleLogin}>
          {error && <div className={styles.error}>{error}</div>}

          {/* Role Selector */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Login As</label>
            <div style={{
              display: 'flex',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)'
            }}>
              <button
                type="button"
                onClick={() => { setSelectedRole('admin'); setError(''); }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  background: selectedRole === 'admin' ? 'var(--color-primary)' : 'transparent',
                  color: selectedRole === 'admin' ? '#fff' : 'var(--text-secondary)',
                }}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => { setSelectedRole('teamlead'); setError(''); }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: 'none',
                  borderLeft: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  background: selectedRole === 'teamlead' ? 'var(--color-primary)' : 'transparent',
                  color: selectedRole === 'teamlead' ? '#fff' : 'var(--text-secondary)',
                }}
              >
                Team Lead
              </button>
            </div>
          </div>

          {isSignUp && selectedRole === 'admin' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Full Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                  required={isSignUp}
                />
              </div>
            </>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className={styles.label}>Password</label>
              {!isSignUp && (
                <button 
                  type="button" 
                  onClick={() => navigate('/admin/forgot-password')}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
              >
                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={styles.input}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required={isSignUp}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className={styles.btn} disabled={isLoading}>
            {isLoading ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
          
          {selectedRole === 'admin' && (
            <div className={styles.toggleContainer}>
              <span className={styles.toggleText}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </span>
              <button 
                type="button" 
                className={styles.toggleLink} 
                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
