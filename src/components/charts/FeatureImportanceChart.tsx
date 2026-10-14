import React from 'react';
import { FeatureContribution } from '../../types';

interface FeatureImportanceChartProps {
  contributions: FeatureContribution[];
}

export const FeatureImportanceChart: React.FC<FeatureImportanceChartProps> = ({ contributions }) => {
  if (!contributions || contributions.length === 0) {
    return <div className="text-sm text-slate-400 py-4 text-center">No feature attributions computed</div>;
  }

  // Max absolute weight for normalization
  const maxAbsWeight = Math.max(...contributions.map((c) => Math.abs(c.weight)), 20);

  return (
    <div className="space-y-3">
      {contributions.map((item, idx) => {
        const isPositive = item.impact === 'positive';
        const percentWidth = Math.min(100, (Math.abs(item.weight) / maxAbsWeight) * 100);

        return (
          <div key={idx} className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-800">{item.feature}</span>
              <span
                className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                  isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isPositive ? `+${item.weight} pts` : `${item.weight} pts`}
              </span>
            </div>

            {/* Split bar visualization */}
            <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden flex">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${percentWidth}%` }}
              />
            </div>

            <p className="mt-1 text-[11px] text-slate-500 leading-tight">{item.description}</p>
          </div>
        );
      })}
    </div>
  );
};
