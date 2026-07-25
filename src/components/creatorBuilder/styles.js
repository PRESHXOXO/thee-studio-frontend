// Shared inline-style tokens for the Creator Builder wizard components —
// keeps every step visually identical without a shared CSS class.
export const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 };
export const INPUT_STYLE = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', background: 'var(--surface-inset)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', font: 'var(--text-sm)', color: 'var(--text-body)', outline: 'none', fontFamily: 'inherit' };
export const TEXTAREA_STYLE = { ...INPUT_STYLE, resize: 'vertical', lineHeight: 1.5 };
