import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import styles from '../styles/LoginPage.module.css';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please fill in your email');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      await api.post('/auth/forgotpassword', { email });
      setMessage('Password reset link has been sent to your email! (Check backend console for ethereal link)');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Forgot Password</h1>
          <p className={styles.subtitle}>Enter your email to receive a reset link</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}
          {message && <div style={{ background: 'var(--color-neutral)', color: 'var(--color-primary)', padding: '12px', borderRadius: '4px', fontSize: '0.85rem', textAlign: 'center' }}>{message}</div>}

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

          <button type="submit" className={styles.btn} disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
          
          <button 
            type="button" 
            onClick={() => navigate('/admin/login')}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', marginTop: '10px', cursor: 'pointer' }}
          >
            Back to Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
