import React, { useState, useCallback, useEffect, useMemo  } from 'react';
import DashboardGrid from '../components/dashboard/DashboardGrid';
import SafetyScreen, { SAFETY_SCREEN_COUNT } from '../components/dashboard/SafetyScreen';
import UploadedImageScreen from '../components/dashboard/UploadedImageScreen';
import Loader from '../components/common/Loader';
import { useDashboardRotation } from '../hooks/useDashboardRotation';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useLanguage } from '../hooks/useLanguage';
import { patientApi, dashboardImageApi } from '../api/apiClient';

/**
 * Public waiting-area TV dashboard, viewed by patients' visitors in the
 * Emergency & Accident ward - not staff. Kept deliberately calm and
 * uncluttered: no aggregate counts, no flashing alerts, just each
 * patient's name, age, gender, admit time and current status.
 *
 * This page intentionally fetches only the privacy-safe "/patient/dashboard"
 * endpoint - it never touches Father Name, internal IDs, or any other
 * confidential field.
 */
const DASHBOARD_FILTERS = [
  { key: 'all', labelKey: 'form.filterAll' },
  { key: 'today', labelKey: 'form.filterToday' },
  { key: 'ward', labelKey: 'form.filterWardChanged' },
  { key: 'discharged', labelKey: 'form.filterDischarged' }
];

function isAdmitToday(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return false;
  const [, year, month, day] = match;
  const now = new Date();
  return (
    Number(year) === now.getFullYear() &&
    Number(month) === now.getMonth() + 1 &&
    Number(day) === now.getDate()
  );
}

export default function Dashboard() {
  const { t, language, toggleLanguage } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [activeFilter, setActiveFilter] = useState('all');

  const loadDashboard = useCallback(async () => {
    try {
      const response = await patientApi.getDashboard();
      setPatients(response.data || []);
    } catch (err) {
      // Fail silently on the public display; the last known good
      // data stays on screen rather than showing a scary error to visitors.
      console.error('Dashboard refresh failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadImages = useCallback(async () => {
    try {
      const response = await dashboardImageApi.getAll();
      setImages(response.data || []);
    } catch (err) {
      // Same fail-silent policy as the patient list - keep showing
      // whatever images were already loaded rather than an error screen.
      console.error('Dashboard image refresh failed:', err.message);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadImages();
  }, [loadDashboard, loadImages]);

  // Refresh dashboard data every 10 seconds without disrupting the rotation.
  useAutoRefresh(loadDashboard, 10000);

  // Images change far less often than patient status - a 60s poll is
  // plenty to pick up newly uploaded/deleted images without extra load.
  useAutoRefresh(loadImages, 60000);

  // Live ward clock, updated every minute (patients/visitors don't need
  // second-level precision, and a calmer, non-ticking display feels less
  // clinical/anxious than a running stopwatch).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const filteredPatients = useMemo(() => {
  switch (activeFilter) {
    case 'today':
      return patients.filter((p) => isAdmitToday(p.admitTime));
    case 'ward':
      return patients.filter((p) => p.wardStatus === 'Ward');
    case 'discharged':
      return patients.filter((p) => p.wardStatus === 'Discharged');
    default:
      return patients;
  }
}, [patients, activeFilter]);

  const { currentPagePatients, currentSafetyIndex, currentImageIndex, showingSafety, showingImage, totalPages } =
    
  useDashboardRotation(filteredPatients, SAFETY_SCREEN_COUNT, images.length);

  const clockLabel = now.toLocaleTimeString(language === 'ta' ? 'ta-IN' : 'en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const dateLabel = now.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  if (loading) {
    return (
      <div className="tv-dashboard">
        <Loader label="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="tv-dashboard">
      <button type="button" className="tv-lang-toggle" onClick={toggleLanguage} aria-label="Toggle language">
        {language === 'en' ? 'தமிழ்' : 'English'}
      </button>

      {/* SAFETY SCREEN - DISABLED (commented out, not removed). To bring
          the safety-awareness message back into the rotation, restore
          the original three-way ternary:
            {showingSafety ? (
              <SafetyScreen index={currentSafetyIndex} />
            ) : showingImage ? (
              ...
          and undo the matching changes noted in useDashboardRotation.js. */}
      {showingImage ? (
        <UploadedImageScreen image={images[currentImageIndex]} />
      ) : (
        <>
     
          <div className="tv-dashboard-header">
            <div className="tv-dashboard-brand">
              {/* <i className="bi bi-heart-pulse-fill" aria-hidden="true" /> */}
              <img
                src="/Hospital_logo2.png"
                alt="Government of Tamil Nadu"
                className="tv-tn-logo"
              />
              
              <div>
                <h2>{t('dashboard.waitingArea')}</h2>
                <span className="tv-dashboard-datetime">{dateLabel}</span>
              </div>
            </div>
   <div className="tv-dashboard-filters" role="group" aria-label={t('form.quickFiltersLabel')}>
  {DASHBOARD_FILTERS.map((filter) => (
    <button
      key={filter.key}
      type="button"
      className={`tv-filter-btn ${activeFilter === filter.key ? 'active' : ''}`}
      onClick={() => setActiveFilter(filter.key)}
    >
      {t(filter.labelKey)}
    </button>
  ))}
</div>
            <div className="tv-clock">
              <i className="bi bi-clock" aria-hidden="true" />
              {clockLabel}
            </div>
          </div>

          <DashboardGrid patients={currentPagePatients} />

          {totalPages > 1 && (
            <div className="tv-dashboard-pagination" aria-hidden="true">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <span key={idx} className="tv-dashboard-dot" />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
