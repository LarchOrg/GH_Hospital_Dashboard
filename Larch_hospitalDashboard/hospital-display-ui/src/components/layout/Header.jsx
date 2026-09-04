import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * Header for the staff-facing screens (registration / management).
 * Not shown on the public TV dashboard, which is a full-screen, chrome-free view.
 */
export default function Header() {
  const { t, language, toggleLanguage } = useLanguage();
  const location = useLocation();

  return (
    <header className="app-header">
      <div className="app-header-brand">
        {/* <span className="app-header-icon">
          <i className="bi bi-hospital-fill" aria-hidden="true" />
        </span> */}
        <img
          src="/Hospital_logo.png"
          alt="Government of Tamil Nadu"
          className="app-tn-logo"
        />
        <div>
          <h1>{t('hospitalName')}</h1>
          <small>{t('appTitle')}</small>
        </div>
      </div>

      <nav className="app-header-nav">
        <Link
          to="/"
          className={`app-nav-link ${location.pathname === '/' ? 'active' : ''}`}
        >
          <i className="bi bi-tv-fill" aria-hidden="true" />
          {t('nav.dashboard')}
        </Link>
        <Link
          to="/register"
          className={`app-nav-link ${location.pathname.startsWith('/register') ? 'active' : ''}`}
        >
          <i className="bi bi-clipboard2-plus-fill" aria-hidden="true" />
          {t('nav.register')}
        </Link>
        <Link
          to="/upload-images"
          className={`app-nav-link ${location.pathname.startsWith('/upload-images') ? 'active' : ''}`}
        >
          <i className="bi bi-images" aria-hidden="true" />
          {t('nav.uploadImages')}
        </Link>

        <button type="button" className="lang-toggle-btn" onClick={toggleLanguage}>
          <i className="bi bi-translate" aria-hidden="true" />
          {language === 'en' ? 'தமிழ்' : 'English'}
        </button>
      </nav>
    </header>
  );
}
