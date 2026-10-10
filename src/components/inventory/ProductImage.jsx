import React from 'react';

export const ProductImage = ({ colour = '#18181b', size = 48, label = 'Tee' }) => {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: 'var(--radius-md)',
        backgroundColor: '#161720',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0
      }}
      title={`${label} (${colour})`}
    >
      <svg
        width={size * 0.7}
        height={size * 0.7}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* T-Shirt Silhouette */}
        <path
          d="M7 3L2 8L5 10L6.5 8.5V20H17.5V8.5L19 10L22 8L17 3C15.5 4.5 12.5 5 12 5C11.5 5 8.5 4.5 7 3Z"
          fill={colour}
          stroke="#4b5563"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Collar Accent */}
        <path
          d="M9.5 3C9.8 4.2 10.8 5 12 5C13.2 5 14.2 4.2 14.5 3"
          stroke="#9ca3af"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
