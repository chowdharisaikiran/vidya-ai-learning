import React, { useState } from 'react';
import { SubjectScore } from '../../types';

interface PerformanceBarChartProps {
  subjects: SubjectScore[];
  height?: number;
}

export const PerformanceBarChart: React.FC<PerformanceBarChartProps> = ({ subjects, height = 240 }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!subjects || subjects.length === 0) {
    return <div className="text-sm text-slate-400 py-8 text-center">No subject data available</div>;
  }

  const chartHeight = height;
  const paddingBottom = 40;
  const paddingTop = 25;
  const graphHeight = chartHeight - paddingBottom - paddingTop;
  const barWidth = 14;
  const groupSpacing = 68;

  return (
    <div className="w-full overflow-x-auto select-none">
      <div className="flex items-center justify-end gap-4 text-xs font-medium text-slate-600 mb-3 pr-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
          <span>Assignment</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-violet-500" />
          <span>Quiz</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-700" />
          <span>Exam</span>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${Math.max(480, subjects.length * groupSpacing + 40)} ${chartHeight}`}
          className="w-full h-auto min-w-[480px]"
          style={{ maxHeight: chartHeight }}
        >
          {/* Grid lines (0, 25, 50, 75, 100) */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = paddingTop + graphHeight - (val / 100) * graphHeight;
            return (
              <g key={val}>
                <line x1="30" y1={y} x2="98%" y2={y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <text x="22" y={y + 3} textAnchor="end" fontSize="10" fill="#94A3B8" fontWeight="500">
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {subjects.map((sub, i) => {
            const groupX = 45 + i * groupSpacing;
            const assignHeight = (sub.assignment / 100) * graphHeight;
            const quizHeight = (sub.quiz / 100) * graphHeight;
            const examHeight = (sub.exam / 100) * graphHeight;

            const isHovered = hoveredIndex === i;

            return (
              <g
                key={sub.subject}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer transition-opacity"
              >
                {/* Background column highlight on hover */}
                {isHovered && (
                  <rect
                    x={groupX - 6}
                    y={paddingTop}
                    width={barWidth * 3 + 16}
                    height={graphHeight}
                    fill="#F8FAFC"
                    rx="6"
                  />
                )}

                {/* Assignment bar */}
                <rect
                  x={groupX}
                  y={paddingTop + graphHeight - assignHeight}
                  width={barWidth}
                  height={assignHeight}
                  fill="#3B82F6"
                  rx="3"
                  className="transition-all duration-300"
                />

                {/* Quiz bar */}
                <rect
                  x={groupX + barWidth + 3}
                  y={paddingTop + graphHeight - quizHeight}
                  width={barWidth}
                  height={quizHeight}
                  fill="#8B5CF6"
                  rx="3"
                  className="transition-all duration-300"
                />

                {/* Exam bar */}
                <rect
                  x={groupX + (barWidth + 3) * 2}
                  y={paddingTop + graphHeight - examHeight}
                  width={barWidth}
                  height={examHeight}
                  fill="#4338CA"
                  rx="3"
                  className="transition-all duration-300"
                />

                {/* Subject name label */}
                <text
                  x={groupX + barWidth * 1.5 + 3}
                  y={chartHeight - 14}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isHovered ? '700' : '600'}
                  fill={isHovered ? '#1E293B' : '#64748B'}
                >
                  {sub.subject.length > 9 ? sub.subject.slice(0, 7) + '..' : sub.subject}
                </text>

                {/* Grade Badge */}
                <text
                  x={groupX + barWidth * 1.5 + 3}
                  y={chartHeight - 2}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="bold"
                  fill="#3B82F6"
                >
                  {sub.overall}% ({sub.grade})
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating tooltip when hovered */}
        {hoveredIndex !== null && subjects[hoveredIndex] && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg pointer-events-none flex items-center gap-3 border border-slate-700">
            <span className="font-bold text-blue-300">{subjects[hoveredIndex].subject}:</span>
            <span>Assign: <b>{subjects[hoveredIndex].assignment}%</b></span>
            <span>Quiz: <b>{subjects[hoveredIndex].quiz}%</b></span>
            <span>Exam: <b>{subjects[hoveredIndex].exam}%</b></span>
            <span className="text-emerald-400 font-bold">Overall: {subjects[hoveredIndex].overall}%</span>
          </div>
        )}
      </div>
    </div>
  );
};
