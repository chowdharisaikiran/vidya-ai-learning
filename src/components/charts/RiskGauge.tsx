import React from 'react';
import { RiskLevel } from '../../types';

interface RiskGaugeProps {
  score: number; // 0 to 100 (probability of risk)
  level: RiskLevel;
  size?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, level, size = 180 }) => {
  const strokeWidth = 14;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  // Semicircle gauge or 240 degree arc: let's do a 240-degree arc
  const arcFraction = 0.75;
  const strokeDashoffset = circumference * (1 - (score / 100) * arcFraction);

  let strokeColor = '#10B981'; // emerald
  let textColor = 'text-emerald-700';
  let bgColor = 'bg-emerald-50';

  if (level === 'High') {
    strokeColor = '#F43F5E'; // rose
    textColor = 'text-rose-700';
    bgColor = 'bg-rose-50';
  } else if (level === 'Moderate') {
    strokeColor = '#F59E0B'; // amber
    textColor = 'text-amber-700';
    bgColor = 'bg-amber-50';
  }

  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - arcFraction)}
          strokeLinecap="round"
        />
        {/* Active indicator */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{score}%</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Risk Index</span>
        <div className={`mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${textColor} ${bgColor}`}>
          {level} Risk
        </div>
      </div>
    </div>
  );
};
