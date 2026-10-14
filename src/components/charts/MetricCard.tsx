import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  icon: LucideIcon;
  accentColor?: 'blue' | 'violet' | 'emerald' | 'amber' | 'rose';
  progress?: number; // 0 to 100
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  trend,
  icon: Icon,
  accentColor = 'blue',
  progress,
}) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      bar: 'bg-blue-600',
      border: 'hover:border-blue-200',
    },
    violet: {
      bg: 'bg-violet-50',
      icon: 'text-violet-600',
      bar: 'bg-violet-600',
      border: 'hover:border-violet-200',
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-600',
      bar: 'bg-emerald-600',
      border: 'hover:border-emerald-200',
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
      bar: 'bg-amber-600',
      border: 'hover:border-amber-200',
    },
    rose: {
      bg: 'bg-rose-50',
      icon: 'text-rose-600',
      bar: 'bg-rose-600',
      border: 'hover:border-rose-200',
    },
  };

  const scheme = colorMap[accentColor];

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs transition-all duration-200 hover:shadow-md ${scheme.border}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-slate-900 font-mono tabular-nums">{value}</span>
            {trend && (
              <span
                className={`text-xs font-medium inline-flex items-center gap-0.5 font-mono ${
                  trend.isNeutral
                    ? 'text-slate-500'
                    : trend.isPositive
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                }`}
              >
                {trend.isPositive ? '↑' : trend.isNeutral ? '•' : '↓'} {trend.value}
              </span>
            )}
          </div>
          {subtext && <p className="mt-1 text-xs text-slate-500 font-normal leading-relaxed">{subtext}</p>}
        </div>

        <div className={`p-3 rounded-xl ${scheme.bg} ${scheme.icon} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${scheme.bar}`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
