import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="app-footer">
      <i className="bi bi-shield-lock-fill" aria-hidden="true" />
      <span>{t('footer.text')}</span>
    </footer>
  );
}
