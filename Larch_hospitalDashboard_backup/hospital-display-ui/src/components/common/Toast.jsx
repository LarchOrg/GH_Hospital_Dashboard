import React, { useEffect } from 'react';

/**
 * Lightweight, self-dismissing Bootstrap-styled toast notification.
 * Rendered fixed to the top-right of the viewport.
 */
export default function Toast({ message, type = 'success', onClose, durationMs = 3500 }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onClose]);

  if (!message) return null;

  const bgClass = type === 'error' ? 'text-bg-danger' : 'text-bg-success';

  return (
    <div
      className="toast-container position-fixed top-0 end-0 p-3"
      style={{ zIndex: 1080 }}
    >
      <div className={`toast show ${bgClass}`} role="alert" aria-live="assertive" aria-atomic="true">
        <div className="d-flex">
          <div className="toast-body">{message}</div>
          <button
            type="button"
            className="btn-close btn-close-white me-2 m-auto"
            onClick={onClose}
            aria-label="Close"
          />
        </div>
      </div>
    </div>
  );
}
