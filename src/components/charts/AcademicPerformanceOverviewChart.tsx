import React, { useState } from 'react';
import { BarChart3, Info } from 'lucide-react';

interface AcademicPerformanceOverviewChartProps {
  avgQuiz: number | null | undefined;
  avgMidterm: number | null | undefined;
  avgFinal: number | null | undefined;
  validCount?: number;
}

interface CategoryData {
  id: string;
  name: string;
  shortName: string;
  rawMean: number | null;
  maxScore: number;
  percentage: number | null;
  colorHex: string;
  barClass: string;
  badgeClass: string;
  bgGlow: string;
  type: string;
}

export const AcademicPerformanceOverviewChart: React.FC<AcademicPerformanceOverviewChartProps> = ({
  avgQuiz,
  avgMidterm,
  avgFinal,
  validCount,
}) => {
  const [activeTooltip, setActiveTooltip] = useState<CategoryData | null>(null);

  // Normalization baselines
  const quizMax = 10;
  const midtermMax = 30;
  const finalMax = 60;

  const quizRaw = typeof avgQuiz === 'number' && !isNaN(avgQuiz) ? avgQuiz : null;
  const midtermRaw = typeof avgMidterm === 'number' && !isNaN(avgMidterm) ? avgMidterm : null;
  const finalRaw = typeof avgFinal === 'number' && !isNaN(avgFinal) ? avgFinal : null;

  const quizPct = quizRaw !== null ? Math.round(((quizRaw / quizMax) * 100) * 10) / 10 : null;
  const midtermPct = midtermRaw !== null ? Math.round(((midtermRaw / midtermMax) * 100) * 10) / 10 : null;
  const finalPct = finalRaw !== null ? Math.round(((finalRaw / finalMax) * 100) * 10) / 10 : null;

  const categories: CategoryData[] = [
    {
      id: 'quiz',
      name: 'Quiz Average',
      shortName: 'Quiz',
      rawMean: quizRaw,
      maxScore: quizMax,
      percentage: quizPct,
      colorHex: '#3B82F6', // Blue
      barClass: 'from-blue-500 to-indigo-600',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      bgGlow: 'hover:bg-blue-50/50',
      type: 'Continuous Assessment',
    },
    {
      id: 'midterm',
      name: 'Midterm Marks',
      shortName: 'Midterm',
      rawMean: midtermRaw,
      maxScore: midtermMax,
      percentage: midtermPct,
      colorHex: '#6366F1', // Indigo
      barClass: 'from-indigo-500 to-violet-600',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      bgGlow: 'hover:bg-indigo-50/50',
      type: 'Mid-Semester Exam',
    },
    {
      id: 'final',
      name: 'Final Exam Marks',
      shortName: 'Final Exam',
      rawMean: finalRaw,
      maxScore: finalMax,
      percentage: finalPct,
      colorHex: '#10B981', // Emerald
      barClass: 'from-emerald-500 to-teal-600',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      bgGlow: 'hover:bg-emerald-50/50',
      type: 'Summative Examination',
    },
  ];

  // SVG Chart Geometry
  const svgWidth = 520;
  const svgHeight = 185;
  const paddingTop = 28;
  const paddingBottom = 42;
  const paddingLeft = 40;
  const paddingRight = 20;
  const graphHeight = svgHeight - paddingTop - paddingBottom;
  const graphWidth = svgWidth - paddingLeft - paddingRight;

  const barWidth = 64;
  const columnPositions = [
    paddingLeft + graphWidth * 0.18,
    paddingLeft + graphWidth * 0.5,
    paddingLeft + graphWidth * 0.82,
  ];

  return (
    <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
              Academic Performance Overview
            </h4>
            <p className="text-[11px] text-slate-500">
              Normalized comparison as a percentage of maximum score {validCount ? `(${validCount} records)` : ''}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            <span>Quiz (Max 10)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
            <span>Midterm (Max 30)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>Final (Max 60)</span>
          </span>
        </div>
      </div>

      {/* SVG Bar Chart Area */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto max-h-[220px]"
          aria-label="Academic Performance Overview Bar Chart"
        >
          {/* Horizontal Grid lines (0%, 25%, 50%, 75%, 100%) */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = paddingTop + graphHeight - (val / 100) * graphHeight;
            const isPassingBaseline = val === 50;

            return (
              <g key={val}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke={isPassingBaseline ? '#CBD5E1' : '#E2E8F0'}
                  strokeWidth={isPassingBaseline ? 1.5 : 1}
                  strokeDasharray={isPassingBaseline ? '4 3' : '2 3'}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill={isPassingBaseline ? '#64748B' : '#94A3B8'}
                  fontWeight={isPassingBaseline ? '600' : '500'}
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* 50% Passing Baseline indicator label */}
          <text
            x={svgWidth - paddingRight}
            y={paddingTop + graphHeight * 0.5 - 5}
            textAnchor="end"
            fontSize="9"
            fill="#94A3B8"
            fontStyle="italic"
          >
            50% Passing Benchmark
          </text>

          {/* Render Bars */}
          {categories.map((cat, idx) => {
            const centerX = columnPositions[idx];
            const barX = centerX - barWidth / 2;
            const pct = cat.percentage ?? 0;
            const barHeight = Math.max(4, (pct / 100) * graphHeight);
            const barY = paddingTop + graphHeight - barHeight;
            const isHovered = activeTooltip?.id === cat.id;

            return (
              <g
                key={cat.id}
                tabIndex={0}
                role="graphics-symbol"
                aria-label={`${cat.name}: ${cat.rawMean ?? 'N/A'} out of ${cat.maxScore} (${cat.percentage ?? 0}%)`}
                onMouseEnter={() => setActiveTooltip(cat)}
                onMouseLeave={() => setActiveTooltip(null)}
                onFocus={() => setActiveTooltip(cat)}
                onBlur={() => setActiveTooltip(null)}
                className="cursor-pointer outline-hidden transition-all duration-200"
              >
                {/* Column Hover Hitbox / Background Highlight */}
                <rect
                  x={barX - 8}
                  y={paddingTop}
                  width={barWidth + 16}
                  height={graphHeight + 10}
                  fill={isHovered ? 'rgba(241, 245, 249, 0.7)' : 'transparent'}
                  rx="8"
                  className="transition-colors"
                />

                {/* Vertical Bar */}
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  fill={cat.colorHex}
                  rx="6"
                  opacity={isHovered ? 1 : 0.9}
                  className="transition-all duration-300"
                  filter={isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.12))' : undefined}
                />

                {/* Percentage Value on top of bar */}
                <text
                  x={centerX}
                  y={barY - 7}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="#1E293B"
                  className="font-mono tracking-tight"
                >
                  {cat.percentage !== null ? `${cat.percentage}%` : 'N/A'}
                </text>

                {/* Category Label at Bottom */}
                <text
                  x={centerX}
                  y={svgHeight - 22}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isHovered ? '700' : '600'}
                  fill={isHovered ? '#0F172A' : '#334155'}
                >
                  {cat.name}
                </text>

                {/* Denominator Subtitle */}
                <text
                  x={centerX}
                  y={svgHeight - 9}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="500"
                  fill="#64748B"
                  className="font-mono"
                >
                  {cat.rawMean !== null ? `${cat.rawMean} / ${cat.maxScore}` : `Max: ${cat.maxScore}`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Interactive Floating Tooltip */}
        {activeTooltip && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white px-3.5 py-2 rounded-xl shadow-xl pointer-events-none flex items-center gap-3 border border-slate-700/80 backdrop-blur-xs text-xs animate-in fade-in zoom-in-95 duration-150 z-20"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: activeTooltip.colorHex }}
              />
              <span className="font-bold text-slate-100">{activeTooltip.name}:</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold">
                {activeTooltip.rawMean !== null ? `${activeTooltip.rawMean} / ${activeTooltip.maxScore}` : 'N/A'}
              </span>
              <span className="text-emerald-400 font-bold">
                ({activeTooltip.percentage !== null ? `${activeTooltip.percentage}%` : 'N/A'})
              </span>
            </div>
            <span className="text-[11px] text-slate-400 border-l border-slate-700 pl-2">
              {activeTooltip.type}
            </span>
          </div>
        )}
      </div>

      {/* Accessible Mobile-Friendly Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-slate-200/80">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onMouseEnter={() => setActiveTooltip(cat)}
            onMouseLeave={() => setActiveTooltip(null)}
            className={`p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between transition-all cursor-pointer ${
              activeTooltip?.id === cat.id ? 'ring-2 ring-blue-400 border-blue-300 shadow-xs' : ''
            }`}
            title={`Mean: ${cat.rawMean !== null ? `${cat.rawMean} / ${cat.maxScore}` : 'N/A'}`}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cat.colorHex }}
              />
              <span className="font-medium text-slate-700">{cat.name}</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-500 font-medium text-[11px]">
                {cat.rawMean !== null ? `${cat.rawMean} / ${cat.maxScore}` : 'N/A'}
              </span>
              <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${cat.badgeClass}`}>
                {cat.percentage !== null ? `${cat.percentage}%` : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
