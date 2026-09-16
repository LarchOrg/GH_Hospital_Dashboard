import React from 'react';
import PatientCard from './PatientCard';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * Renders the current rotation page of patient cards in a responsive
 * TV-optimised grid. Shows a friendly empty state when there are
 * currently no patients to display.
 */
export default function DashboardGrid({ patients }) {
  const { t } = useLanguage();

  if (!patients || patients.length === 0) {
    return (
      <div className="tv-dashboard-grid tv-dashboard-grid--empty">
        <div className="no-patients-message">
          <i className="bi bi-clipboard2-pulse" aria-hidden="true" />
          <div className="no-patients-title">{t('dashboard.noPatients')}</div>
          <div className="no-patients-subtitle">{t('dashboard.noPatientsSub')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`tv-dashboard-grid tv-dashboard-grid--count-${patients.length}`}>
      {patients.map((patient, idx) => (
        <PatientCard key={`${patient.patientName}-${patient.admitTime}-${idx}`} patient={patient} />
      ))}
    </div>
  );
}
