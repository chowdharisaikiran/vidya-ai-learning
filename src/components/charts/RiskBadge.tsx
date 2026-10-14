import React from 'react';
import { RiskLevel } from '../../types';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm font-medium',
  };

  if (level === 'High') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 ${sizeClasses[size]}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        High Risk
      </span>
    );
  }

  if (level === 'Moderate') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 ${sizeClasses[size]}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Moderate Risk
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${sizeClasses[size]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Low Risk
    </span>
  );
};
