import React from 'react';
import { StudentData } from '../../types';

interface RadarChartProps {
  student: StudentData;
  size?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({ student, size = 260 }) => {
  const center = size / 2;
  const radius = size * 0.38;

  // 6 dimensions normalized to 0 - 100
  const axes = [
    { label: 'Attendance', value: student.Attendance_Percent },
    { label: 'Study Hours', value: Math.min(100, (student.Study_Hours_Per_Day / 6) * 100) },
    { label: 'Assignments', value: student.Assignment_Score },
    { label: 'Quizzes', value: student.Quiz_Score },
    {
      label: 'Motivation',
      value: student.Motivation_Level === 'High' ? 95 : student.Motivation_Level === 'Medium' ? 70 : 40,
    },
    {
      label: 'Sleep Rest',
      value: student.Sleep_Hours >= 7 && student.Sleep_Hours <= 8.5 ? 95 : (student.Sleep_Hours / 8) * 80,
    },
  ];

  const totalAxes = axes.length;
  const angleStep = (2 * Math.PI) / totalAxes;

  // Points on outer web rings (25%, 50%, 75%, 100%)
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Calculate polygon points for student data
  const dataPoints = axes.map((axis, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const distance = (axis.value / 100) * radius;
    const x = center + distance * Math.cos(angle);
    const y = center + distance * Math.sin(angle);
    return { x, y, value: Math.round(axis.value) };
  });

  const polygonPath = dataPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ') + ' Z';

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Concentric spider rings */}
        {rings.map((ringFactor, idx) => {
          const ringPoints = axes
            .map((_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const r = radius * ringFactor;
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
            })
            .join(' ');

          return (
            <polygon
              key={idx}
              points={ringPoints}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="1"
              strokeDasharray={idx < 3 ? '2 2' : 'none'}
            />
          );
        })}

        {/* Axis spokes */}
        {axes.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const endX = center + radius * Math.cos(angle);
          const endY = center + radius * Math.sin(angle);
          return <line key={i} x1={center} y1={center} x2={endX} y2={endY} stroke="#E2E8F0" strokeWidth="1" />;
        })}

        {/* Student data polygon */}
        <polygon
          points={dataPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="#8B5CF6"
          fillOpacity="0.25"
          stroke="#7C3AED"
          strokeWidth="2.5"
          className="transition-all duration-500 ease-out"
        />

        {/* Data points markers */}
        {dataPoints.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r="4" fill="#6D28D9" stroke="#FFFFFF" strokeWidth="1.5" />
        ))}

        {/* Axis Labels */}
        {axes.map((axis, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelDist = radius + 20;
          const x = center + labelDist * Math.cos(angle);
          const y = center + labelDist * Math.sin(angle);
          return (
            <text
              key={i}
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="600"
              fill="#475569"
            >
              {axis.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
