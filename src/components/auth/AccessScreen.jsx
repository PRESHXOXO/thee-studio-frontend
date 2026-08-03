import React from 'react';
import { Button } from '../core/Button.jsx';

export function AccessScreen({ title, detail, loading = false, onRetry, onSignOut }) {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-live="polite">
        <div className="auth-brand-mark">T</div>
        <div className="auth-brand-name">{title}</div>
        {detail && <p className="access-detail">{detail}</p>}
        {loading ? <div className="access-loader" aria-label="Connecting" /> : (
          <div className="access-actions">
            {onRetry && <Button variant="primary" onClick={onRetry}>Try Again</Button>}
            {onSignOut && <Button variant="secondary" onClick={onSignOut}>Sign Out</Button>}
          </div>
        )}
      </section>
    </main>
  );
}
