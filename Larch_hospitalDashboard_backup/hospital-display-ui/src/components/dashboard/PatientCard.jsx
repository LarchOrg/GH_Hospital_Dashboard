import React from 'react';
import CriticalityBadge from './CriticalityBadge';
import { useLanguage } from '../../hooks/useLanguage';
import { genderLabel, wardStatusLabel } from '../../utils/patientLabels';

const GENDER_ICON = {
  Male: 'bi-gender-male',
  Female: 'bi-gender-female',
  Other: 'bi-gender-ambiguous'
};

const WARD_STATUS_ICON = {
  Ward: 'bi-hospital',
  Discharged: 'bi-box-arrow-right'
};

/**
 * Large, TV-readable card showing the public-safe fields for a single
 * patient: name, father/guardian name, age, gender, admit time, current
 * criticality status and (optionally) ward/discharge status.
 *
 * The status is deliberately shown as a full-width banner rather than a
 * small badge so it reads clearly from across the waiting room, and all
 * type sizes scale with the viewport (clamp()) so the card stays legible
 * whether it's a laptop preview or a 55" TV zoomed far out.
 */
export default function PatientCard({ patient }) {
  const { t, language } = useLanguage();
  const statusClass = (patient.criticality || 'Stable').toLowerCase();
  const genderIcon = GENDER_ICON[patient.gender] || 'bi-person-fill';
  const wardStatusIcon = WARD_STATUS_ICON[patient.wardStatus] || 'bi-clipboard2-pulse';

  // Manually parse the wall-clock components instead of routing through
  // `new Date()` - AdmitTime is a hospital wall-clock timestamp, not a
  // point in time that needs timezone math, and parsing the string
  // directly guarantees the time shown here always matches what staff
  // typed in, regardless of browser/server timezone quirks.
  const admitMatch = String(patient.admitTime || '').match(/(\d{2}):(\d{2})/);
  const admitTimeLabel = admitMatch
    ? (() => {
        const hour24 = Number(admitMatch[1]);
        const minute = admitMatch[2];
        const period = hour24 >= 12 ? 'PM' : 'AM';
        const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
        return `${hour12}:${minute} ${period}`;
      })()
    : '';

  // Patient names are free text, not dictionary words, so they can't be
  // machine-translated. When Tamil is selected we show the Tamil-script
  // name staff entered at registration, falling back to the English name
  // if one wasn't provided.
  const displayName = language === 'ta' && patient.patientNameTamil
    ? patient.patientNameTamil
    : patient.patientName;

  // Same Tamil-toggle fallback for the father/guardian name.
  const displayFatherName = language === 'ta' && patient.fatherNameTamil
    ? patient.fatherNameTamil
    : patient.fatherName;

    // Ward number (e.g. "A101") is only meaningful while the patient is
// actually in a ward - appended to the ward status chip label below.
// const wardStatusText = patient.wardStatus === 'Ward' && patient.wardNumber
//   ? `${wardStatusLabel(t, patient.wardStatus)} - <span style={}>${patient.wardNumber}</span>`
//   : wardStatusLabel(t, patient.wardStatus);

// Ward number (e.g. "A101") is only meaningful while the patient is
// actually in a ward - shown large/bold below since many visitors may
// not read the status label but can recognize a bold ward number quickly.
const wardNumberDisplay = patient.wardStatus === 'Ward' && patient.wardNumber
  ? ' - '+patient.wardNumber
  : null;

  return (
    <div className={`patient-card status-${statusClass}`}>
      <div className={`patient-card-status-banner status-${statusClass}`}>
        <CriticalityBadge criticality={patient.criticality} size="lg" />
      </div>

      <div className="patient-card-body">
        <div className="patient-name">{displayName}</div>

        {patient.fatherName && (
          <div className="patient-card-father">
            <i className="bi bi-person-vcard" aria-hidden="true" />
            <span>{t('dashboard.fatherName')}: <strong>{displayFatherName}</strong></span>
          </div>
        )}

        <div className="patient-card-meta-row">
          <span className="patient-meta-chip">
            <i className={`bi ${genderIcon}`} aria-hidden="true" />
            {genderLabel(t, patient.gender)}
          </span>
          <span className="patient-meta-chip">
            <i className="bi bi-calendar-heart" aria-hidden="true" />
            {patient.age} {t('dashboard.years')}
          </span>
          {patient.wardStatus && (
          <span className={`patient-meta-chip patient-meta-chip--ward ward-${patient.wardStatus.toLowerCase()}`}>
  <i className={`bi ${wardStatusIcon}`} aria-hidden="true" />
  {wardStatusLabel(t, patient.wardStatus)} 
  {wardNumberDisplay && <span className="ward-number-highlight"> {wardNumberDisplay}</span>}
</span>
          )}
        </div>

        <div className="patient-card-admit">
          <i className="bi bi-clock-history" aria-hidden="true" />
          {t('dashboard.admitted')}: <strong>{admitTimeLabel}</strong>
        </div>
      </div>
    </div>
  );
}
