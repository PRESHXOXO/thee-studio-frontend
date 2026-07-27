import React from 'react';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';
import { reportStudioError } from '../../lib/cloudStore.js';

// Catches render/lifecycle errors thrown by the active studio screen so a
// single broken screen can't blank the whole studio shell. The sidebar and
// topbar live outside this boundary and stay interactive. Note: React error
// boundaries do not catch async or event-handler exceptions.
export class StudioErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Studio screen crashed:', error, info?.componentStack);
    void reportStudioError(error, {
      code: 'react_error_boundary',
      componentStack: info?.componentStack?.slice(0, 4000),
      screen: this.props.resetKey,
    });
  }

  componentDidUpdate(prevProps) {
    // Navigating to a different screen clears the failure state.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  handleGoHome = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        maxWidth: 'var(--content-max)', margin: '0 auto', padding: '72px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center',
      }}>
        <Icon name="alert-triangle" size={36} strokeWidth={1.25} style={{ color: 'var(--status-warn)' }} />
        <div style={{ font: '600 1.25rem/1.3 var(--font-display)', color: 'var(--text-strong)' }}>
          This screen ran into a problem.
        </div>
        <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 440, lineHeight: 1.55 }}>
          Your creators and saved media are safe. Head back to Studio Home, or pick another tool from the sidebar.
        </div>
        <Button variant="accent" onClick={this.handleGoHome}>
          <Icon name="layout-dashboard" size={15} /> Back to Studio Home
        </Button>
      </div>
    );
  }
}
