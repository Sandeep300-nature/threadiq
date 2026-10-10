import React from 'react';

export const StatusBadge = ({ status, type }) => {
  if (!status) return null;

  const normalized = status.toLowerCase();

  let badgeClass = 'badge-pending';
  let dotColor = '#e4e4e7';

  if (normalized.includes('low') || normalized === 'danger' || normalized === 'rejected' || normalized.includes('shortage')) {
    badgeClass = 'badge-low-stock';
    dotColor = '#f43f5e';
  } else if (normalized.includes('balance') || normalized === 'success' || normalized === 'approved') {
    badgeClass = 'badge-balanced';
    dotColor = '#10b981';
  } else if (normalized.includes('excess') || normalized === 'warning' || normalized.includes('overstock')) {
    badgeClass = 'badge-excess';
    dotColor = '#f59e0b';
  } else if (normalized.includes('info') || normalized.includes('minor')) {
    badgeClass = 'badge-pending';
    dotColor = '#38bdf8';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          display: 'inline-block'
        }}
      />
      {status}
    </span>
  );
};
