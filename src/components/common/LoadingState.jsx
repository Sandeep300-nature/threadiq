import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState = ({ message = 'Loading inventory data...' }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        gap: '14px',
        color: 'var(--text-secondary)'
      }}
    >
      <Loader2
        size={32}
        style={{
          color: 'var(--text-white)',
          animation: 'spin 1s linear infinite'
        }}
      />
      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{message}</span>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
