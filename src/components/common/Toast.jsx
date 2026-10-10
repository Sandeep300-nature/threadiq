import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useApp();

  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 120,
        maxWidth: '380px',
        width: '100%'
      }}
    >
      {toasts.map((toast) => {
        let borderColor = 'var(--border-card)';
        let Icon = Info;
        let iconColor = 'var(--text-white)';

        if (toast.type === 'success') {
          borderColor = 'var(--color-success-border)';
          Icon = CheckCircle2;
          iconColor = 'var(--color-success)';
        } else if (toast.type === 'danger') {
          borderColor = 'var(--color-danger-border)';
          Icon = AlertCircle;
          iconColor = 'var(--color-danger)';
        }

        return (
          <div
            key={toast.id}
            style={{
              backgroundColor: '#1b1d26',
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              animation: 'fadeIn 0.2s ease',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          >
            <Icon size={18} style={{ color: iconColor, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
