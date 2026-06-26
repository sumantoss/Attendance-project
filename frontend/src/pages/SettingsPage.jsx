import { useState, useEffect } from 'react';
import { FaSave, FaMapMarkerAlt } from 'react-icons/fa';
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
    // Fetch settings
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
          setFormData({
            ...formData,
            officeLatitude: position.coords.latitude,
            officeLongitude: position.coords.longitude
          });
        },
        (err) => {
          console.error("Geolocation error:", err);
          alert("Could not fetch current location. Please ensure location services are enabled.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await api.post('/settings', formData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.card} style={{ maxWidth: '800px' }}>
      <h2 className={styles.title} style={{ marginBottom: '20px' }}>Office Parameters Settings</h2>
      
      {error && <div className={styles.badgeDanger} style={{ padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>}
      {isSaved && <div className={styles.badgeSuccess} style={{ padding: '10px', borderRadius: '4px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>Settings saved successfully!</div>}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
          <div className={styles.formGroup} style={{ flex: 1, marginBottom: 0 }}>
            <label className={styles.label}>Office Latitude *</label>
            <input
              type="number"
              step="any"
              className={styles.input}
              value={formData.officeLatitude}
              onChange={(e) => setFormData({ ...formData, officeLatitude: parseFloat(e.target.value) })}
              required
            />
          </div>
          <div className={styles.formGroup} style={{ flex: 1, marginBottom: 0 }}>
            <label className={styles.label}>Office Longitude *</label>
            <input
              type="number"
              step="any"
              className={styles.input}
              value={formData.officeLongitude}
              onChange={(e) => setFormData({ ...formData, officeLongitude: parseFloat(e.target.value) })}
              required
            />
          </div>
          <button 
            type="button" 
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={handleGetCurrentLocation}
            style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FaMapMarkerAlt /> Use Current
          </button>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Allowed Radius (in meters) *</label>
          <input
            type="number"
            className={styles.input}
            value={formData.allowedRadius}
            onChange={(e) => setFormData({ ...formData, allowedRadius: parseInt(e.target.value) })}
            min="10"
            max="10000"
            required
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
            Employees must be within this radius to punch in/out.
          </span>
        </div>

        <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            id="bypassGPS"
            checked={formData.bypassGPS}
            onChange={(e) => setFormData({ ...formData, bypassGPS: e.target.checked })}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="bypassGPS" className={styles.label} style={{ marginBottom: 0, cursor: 'pointer' }}>
            Bypass GPS Restriction (Allow punch in/out from anywhere)
          </label>
        </div>

        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ alignSelf: 'flex-start' }} disabled={isLoading}>
          <FaSave /> Save Settings
        </button>
      </form>
    </div>
  );
}

export default SettingsPage;
