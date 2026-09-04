import React from 'react';

/**
 * Simple centered Bootstrap spinner used while data is being fetched.
 */
export default function Loader({ label = 'Loading...' }) {
  return (
    <div className="loader-wrapper">
      <div className="text-center">
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">{label}</span>
        </div>
        <div className="mt-2 text-muted">{label}</div>
      </div>
    </div>
  );
}
