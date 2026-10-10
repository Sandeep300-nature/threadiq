import React from 'react';

export const StatCard = ({ label, value, subtext, icon: Icon, trend }) => {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="stat-card-label">{label}</span>
        {Icon && <Icon size={16} style={{ color: 'var(--text-muted)' }} />}
      </div>

      <div className="stat-card-value">{value}</div>

      {(subtext || trend) && (
        <div className="stat-card-footer">
          {trend && (
            <span style={{ color: trend.positive ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
              {trend.value}
            </span>
          )}
          <span>{subtext}</span>
        </div>
      )}
    </div>
  );
};
