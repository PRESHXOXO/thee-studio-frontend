import { describe, expect, it } from 'vitest';
import { safeAuthMessage } from './AuthContext.jsx';

describe('safeAuthMessage', () => {
  it('maps replacement API generic credential failures correctly', () => {
    expect(safeAuthMessage(new Error('Invalid email or password.')))
      .toBe('Email or password is incorrect.');
  });

  it('keeps true email-format failures distinct', () => {
    expect(safeAuthMessage(new Error('Invalid email address.')))
      .toBe('Enter a valid email address.');
  });
});
