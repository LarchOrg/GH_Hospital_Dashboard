import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="d-flex flex-column align-items-center justify-content-center text-center" style={{ minHeight: '60vh' }}>
      <i className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: '4rem' }} />
      <h2 className="mt-3">{t('notFound.title')}</h2>
      <p className="text-muted">{t('notFound.message')}</p>
      <Link to="/" className="btn btn-primary mt-2">
        {t('notFound.back')}
      </Link>
    </div>
  );
}
