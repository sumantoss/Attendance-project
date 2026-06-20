import { useState, useEffect } from 'react';
import { FaSave, FaCheck, FaExclamationTriangle, FaMapMarkerAlt } from 'react-icons/fa';
import api from '../services/api';
import styles from '../styles/AdminCommon.module.css';

function SettingsPage() {
  const [formData, setFormData] = useState({
    officeLatitude: 0,
    officeLongitude: 0,
    allowedRadius: 150,
    bypassGPS: false
  });
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/settings')
      .then(res => {
        setFormData({
          officeLatitude: res.data.officeLatitude || 0,
          officeLongitude: res.data.officeLongitude || 0,
          allowedRadius: res.data.allowedRadius || 150,
          bypassGPS: res.data.bypassGPS || false
        });
      })
      .catch(err => {
        console.error('Error fetching settings', err);
        setError('Failed to retrieve office parameters settings.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            officeLatitude: parseFloat(position.coords.latitude.toFixed(6)),
            officeLongitude: parseFloat(position.coords.longitude.toFixed(6))
          }));
        },
        (err) => {
          console.error('Error getting geolocation', err);
          alert('GPS access denied or unsupported. Enter coordinates manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setIsSaved(false);
    setError('');

    try {
      await api.put('/settings', formData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.card} style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className={styles.header}>
        <h2 className={styles.title}>Office Location Settings</h2>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && <div className={styles.badgeDanger} style={{ padding: '10px', borderRadius: '4px' }}>{error}</div>}
        {isSaved && <div className={styles.badgeSuccess} style={{ padding: '10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}><FaCheck /> Parameters updated successfully!</div>}

        <div className={styles.formGroup}>
          <label className={styles.label}>Office Coordinates (Latitude)</label>
          <input
            type="number"
            step="any"
            className={styles.input}
            value={formData.officeLatitude}
            onChange={(e) => setFormData({ ...formData, officeLatitude: parseFloat(e.target.value) || 0 })}
            disabled={isLoading}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Office Coordinates (Longitude)</label>
          <input
            type="number"
            step="any"
            className={styles.input}
            value={formData.officeLongitude}
            onChange={(e) => setFormData({ ...formData, officeLongitude: parseFloat(e.target.value) || 0 })}
            disabled={isLoading}
            required
          />
        </div>

        <button 
          type="button" 
          className={`${styles.btn} ${styles.btnSecondary}`} 
          style={{ width: 'fit-content' }}
          onClick={handleGetCurrentLocation}
          disabled={isLoading}
        >
          <FaMapMarkerAlt /> Auto-Detect Current GPS Coordinates
        </button>

        <div style={{ borderBottom: '1px solid var(--border-light)', margin: '10px 0' }} />

        <div className={styles.formGroup}>
          <label className={styles.label}>Allowed Radius Boundary (meters)</label>
          <input
            type="number"
            className={styles.input}
            value={formData.allowedRadius}
            onChange={(e) => setFormData({ ...formData, allowedRadius: parseInt(e.target.value) || 0 })}
            disabled={isLoading}
            required
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
            Distance leeway employee allowed to check-in from office coordinates.
          </span>
        </div>



        <div className={styles.formGroup} style={{ flexDirection: 'row', gap: '10px', alignItems: 'center', backgroundColor: 'var(--color-warning-light)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-warning)' }}>
          <input
            type="checkbox"
            id="bypassGPS"
            checked={formData.bypassGPS}
            onChange={(e) => setFormData({ ...formData, bypassGPS: e.target.checked })}
            disabled={isLoading}
          />
          <div>
            <label htmlFor="bypassGPS" className={styles.label} style={{ color: '#854d0e', fontSize: '0.85rem', cursor: 'pointer' }}>
              <FaExclamationTriangle style={{ marginRight: '5px' }} /> Development Bypass GPS Checks
            </label>
            <p style={{ fontSize: '0.7rem', color: '#a16207', margin: 0 }}>
              Checking this skips 150-meter Geolocation checks. Useful for testing dashboard check-ins on local machine mock servers.
            </p>
          </div>
        </div>

        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ alignSelf: 'flex-start' }} disabled={isLoading}>
          <FaSave /> Save Settings
        </button>
      </form>
    </div>
  );
}

export default SettingsPage;
