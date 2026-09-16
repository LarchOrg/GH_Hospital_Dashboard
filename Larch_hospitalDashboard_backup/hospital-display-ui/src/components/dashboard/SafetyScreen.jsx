import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';

// Each entry maps to a Bootstrap Icon and a pair of translation keys
// (title/message) defined in locales/en.json and locales/ta.json.
const SAFETY_SCREENS = [
  { icon: 'bi-shield-fill-check', titleKey: 'safety.helmetTitle', messageKey: 'safety.helmetMessage' },
  { icon: 'bi-car-front-fill', titleKey: 'safety.seatbeltTitle', messageKey: 'safety.seatbeltMessage' },
  { icon: 'bi-cup-straw', titleKey: 'safety.drinkDriveTitle', messageKey: 'safety.drinkDriveMessage' },
  { icon: 'bi-sign-turn-right-fill', titleKey: 'safety.trafficRulesTitle', messageKey: 'safety.trafficRulesMessage' },
  { icon: 'bi-phone-fill', titleKey: 'safety.mobilePhoneTitle', messageKey: 'safety.mobilePhoneMessage' }
];

export const SAFETY_SCREEN_COUNT = SAFETY_SCREENS.length;

/**
 * Full-screen public safety awareness interstitial shown between
 * patient dashboard pages, cycling through helmet / seat-belt /
 * drink-driving / traffic-rules / mobile-phone messages.
 */
export default function SafetyScreen({ index }) {
  const { t } = useLanguage();
  const screen = SAFETY_SCREENS[index % SAFETY_SCREENS.length];

  return (
    <div className="safety-screen">
      <i className={`bi ${screen.icon} safety-icon`} />
      <h2>{t(screen.titleKey)}</h2>
      <p>{t(screen.messageKey)}</p>
    </div>
  );
}
