import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ThreadIQ ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: '32px 28px',
            backgroundColor: 'var(--bg-card, #0a0a0a)',
            border: '1px solid var(--border-hairline, rgba(255, 255, 255, 0.1))',
            borderLeft: '3px solid var(--color-shortage, #f43f5e)',
            borderRadius: 'var(--radius-md, 8px)',
            margin: '24px 0',
            color: 'var(--text-white, #ffffff)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <AlertTriangle size={18} style={{ color: 'var(--color-shortage, #f43f5e)' }} />
            <span className="technical-index" style={{ color: 'var(--color-shortage, #f43f5e)' }}>
              [ RUNTIME DIAGNOSTIC // MODULE FAULT ISOLATED ]
            </span>
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 8px 0', color: '#ffffff' }}>
            {this.props.moduleName ? `${this.props.moduleName} Interrupted` : 'Dashboard Component Interrupted'}
          </h3>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-silver, #a3a3a3)', marginBottom: '16px', lineHeight: 1.5 }}>
            A rendering fault occurred while evaluating telemetry data. The rest of the ThreadIQ platform remains operational.
          </p>

          {this.state.error && (
            <div
              className="font-tech"
              style={{
                fontSize: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm, 4px)',
                color: 'var(--color-shortage, #f43f5e)',
                marginBottom: '18px',
                overflowX: 'auto'
              }}
            >
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={this.handleReset}
              className="btn btn-secondary btn-sm font-tech"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={13} />
              <span>RELOAD MODULE</span>
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="btn btn-ghost btn-sm font-tech"
            >
              <span>RETURN TO OVERVIEW</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
