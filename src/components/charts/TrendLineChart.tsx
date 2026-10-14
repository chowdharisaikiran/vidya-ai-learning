import React, { useState } from 'react';
import { HistoricalRecord } from '../../types';

interface TrendLineChartProps {
  data: HistoricalRecord[];
  height?: number;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({ data, height = 220 }) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="text-sm text-slate-400 py-8 text-center">No historical records available</div>;
  }

  const chartHeight = height;
  const paddingLeft = 36;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;
  const graphWidth = 460;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  const pointsCount = data.length;
  const stepX = (graphWidth - paddingLeft - paddingRight) / (pointsCount - 1 || 1);

  // Compute SVG coordinates
  const scoreCoords = data.map((d, i) => {
    const x = paddingLeft + i * stepX;
    const y = paddingTop + graphHeight - ((d.overallScore - 40) / 60) * graphHeight; // scaled 40 - 100
    return { x, y, score: d.overallScore, month: d.month, att: d.attendance };
  });

  const attendanceCoords = data.map((d, i) => {
    const x = paddingLeft + i * stepX;
    const y = paddingTop + graphHeight - ((d.attendance - 40) / 60) * graphHeight;
    return { x, y, att: d.attendance, month: d.month };
  });

  const scorePath = scoreCoords.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  const attendancePath = attendanceCoords.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');

  // Gradient fill area
  const scoreAreaPath = `${scorePath} L ${scoreCoords[scoreCoords.length - 1].x} ${
    paddingTop + graphHeight
  } L ${scoreCoords[0].x} ${paddingTop + graphHeight} Z`;

  return (
    <div className="w-full overflow-x-auto select-none">
      <div className="flex items-center justify-end gap-5 text-xs font-medium text-slate-600 mb-2 pr-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded-full bg-blue-600" />
          <span>Overall Score %</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded-full bg-violet-500" />
          <span>Attendance %</span>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${graphWidth} ${chartHeight}`}
          className="w-full h-auto min-w-[380px]"
          style={{ maxHeight: chartHeight }}
        >
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines (40, 60, 80, 100) */}
          {[40, 60, 80, 100].map((val) => {
            const y = paddingTop + graphHeight - ((val - 40) / 60) * graphHeight;
            return (
              <g key={val}>
                <line x1={paddingLeft} y1={y} x2={graphWidth - paddingRight} y2={y} stroke="#F1F5F9" strokeWidth="1" />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#94A3B8" fontWeight="500">
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={scoreAreaPath} fill="url(#scoreGradient)" />

          {/* Score line */}
          <path d={scorePath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Attendance line */}
          <path
            d={attendancePath}
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Nodes */}
          {scoreCoords.map((pt, i) => (
            <g
              key={i}
              onMouseEnter={() => setHoveredPoint(i)}
              onMouseLeave={() => setHoveredPoint(null)}
              className="cursor-pointer"
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredPoint === i ? 6 : 4}
                fill="#2563EB"
                stroke="#FFFFFF"
                strokeWidth="2"
                className="transition-all duration-200"
              />
              <circle
                cx={attendanceCoords[i].x}
                cy={attendanceCoords[i].y}
                r={hoveredPoint === i ? 5 : 3.5}
                fill="#8B5CF6"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                className="transition-all duration-200"
              />
              {/* Month label */}
              <text
                x={pt.x}
                y={chartHeight - 10}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill={hoveredPoint === i ? '#1E293B' : '#64748B'}
              >
                {pt.month}
              </text>
            </g>
          ))}
        </svg>

        {hoveredPoint !== null && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-md flex items-center gap-3 pointer-events-none">
            <span className="font-bold text-slate-300">{data[hoveredPoint].month}:</span>
            <span className="text-blue-400">Score: <b>{data[hoveredPoint].overallScore}%</b></span>
            <span className="text-violet-400">Attendance: <b>{data[hoveredPoint].attendance}%</b></span>
            <span>Quiz: {data[hoveredPoint].quizScore}%</span>
          </div>
        )}
      </div>
    </div>
  );
};
