import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '6px',
  className = ''
}) => (
  <div 
    className={`skeleton ${className}`}
    style={{ 
      width, 
      height, 
      borderRadius,
      minWidth: width === '100%' ? '100%' : undefined,
    }}
  />
);

export const SkeletonCard: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="skeleton-card">
    <Skeleton height="24px" width="60%" />
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} height="14px" width={`${70 + Math.random() * 30}%`} />
    ))}
  </div>
);

export const SkeletonStatsGrid: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="skeleton-grid">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="skeleton-card">
        <Skeleton height="14px" width="50%" />
        <Skeleton height="32px" width="70%" />
        <Skeleton height="12px" width="40%" />
      </div>
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => (
  <div style={{ width: '100%' }}>
    {/* Header */}
    <div style={{ display: 'flex', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px 8px 0 0' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} height="14px" width={`${100 / cols}%`} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div 
        key={rowIdx} 
        style={{ 
          display: 'flex', 
          gap: '12px', 
          padding: '12px',
          borderBottom: '1px solid var(--border-color)' 
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height="14px" width={`${80 + Math.random() * 20}%`} />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonChart: React.FC = () => (
  <div className="chart-container">
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
      <Skeleton height="20px" width="150px" />
      <Skeleton height="32px" width="100px" />
    </div>
    <Skeleton height="250px" borderRadius="8px" />
  </div>
);
