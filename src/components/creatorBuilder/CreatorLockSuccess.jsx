import React from 'react';
import { Card } from '../surfaces/Card.jsx';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';

export function CreatorLockSuccess({ name, primaryUrl, onContinue, onSkipToBrand }) {
  return (
    <Card style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
      <div style={{
        width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--accent-deep)',
        boxShadow: 'var(--shadow-coral)',
      }}>
        {primaryUrl && <img src={primaryUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 'var(--radius-pill)',
        background: 'var(--status-ready-bg)', color: 'var(--status-ready)', font: '600 0.75rem/1 var(--font-ui)',
      }}>
        <Icon name="fingerprint" size={12} strokeWidth={2.5} /> References Saved
      </div>
      <h2 style={{ font: 'var(--display-md, 1.5rem)/1.2 var(--font-display)', color: 'var(--text-strong)', margin: 0 }}>
        {name}'s references are secure.
      </h2>
      <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0, maxWidth: 380 }}>
        Headshot and identity details are privately saved. Next: add a full-body reference and define proportions.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <Button variant="primary" onClick={onContinue}>
          <Icon name="person-stand" size={15} /> Define Body
        </Button>
      </div>
    </Card>
  );
}
