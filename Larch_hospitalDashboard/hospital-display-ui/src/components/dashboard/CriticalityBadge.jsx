import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { criticalityLabel } from '../../utils/patientLabels';

const ICON_MAP = {
  Stable: 'bi-check-circle-fill',
  Critical: 'bi-exclamation-triangle-fill',
  MostCritical: 'bi-exclamation-octagon-fill',
  Deceased: 'bi-dash-circle-fill'
};

/**
 * Colour-coded pill badge representing a patient's current status.
 * Stable = green, Critical = yellow, Most Critical = red (pulsing),
 * Deceased = black.
 */
export default function CriticalityBadge({ criticality, size = 'md' }) {
  const { t } = useLanguage();
  const cssClass = (criticality || 'stable').toLowerCase();

  return (
    <span className={`criticality-badge criticality-badge--${size} ${cssClass}`}>
      <i className={`bi ${ICON_MAP[criticality] || 'bi-circle-fill'}`} aria-hidden="true" />
      {criticalityLabel(t, criticality)}
    </span>
  );
}
