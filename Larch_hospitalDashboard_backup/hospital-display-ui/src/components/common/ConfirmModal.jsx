import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * Reusable confirmation dialog (e.g. for delete actions). Rendered as a
 * Bootstrap-styled modal controlled entirely via props (no Bootstrap JS
 * dependency required).
 */
export default function ConfirmModal({ show, title, message, onConfirm, onCancel }) {
  const { t } = useLanguage();

  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onCancel} aria-label="Close" />
          </div>
          <div className="modal-body">
            <p className="mb-0">{message}</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
              {t('form.no')}
            </button>
            <button type="button" className="btn btn-danger" onClick={onConfirm}>
              {t('form.yes')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
