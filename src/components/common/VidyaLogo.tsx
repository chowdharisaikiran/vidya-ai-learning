import React from 'react';

export interface VidyaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'dark' | 'glass';
  showText?: boolean;
  showTagline?: boolean;
  tagline?: string;
  subtitle?: string;
  className?: string;
  iconOnly?: boolean;
}

/**
 * VIDYA Official Brand Logo
 * 
 * Concept:
 * - "The Wisdom Apex & Ascending Trajectory"
 * - Interlocking geometric wings forming an iconic 'V':
 *   - Left Wing: Foundational learning & academic progression (Royal Blue & Cyan gradient)
 *   - Right Wing: Predictive analytics & student elevation trajectory (Indigo & Violet gradient)
 *   - Central Beacon: The Spark of 'Vidya' (Enlightenment, Clarity & AI Data Intelligence)
 */
export const VidyaLogo: React.FC<VidyaLogoProps> = ({
  size = 'md',
  variant = 'default',
  showText = false,
  showTagline = false,
  tagline = 'Learn Smarter. Grow Better.',
  subtitle,
  className = '',
  iconOnly = false,
}) => {
  // Dimension tokens
  const sizeMap = {
    xs: {
      box: 'w-5 h-5',
      svg: 20,
      text: 'text-sm font-bold',
      sub: 'text-[9px]',
      badge: 'p-0.5 rounded-lg',
    },
    sm: {
      box: 'w-8 h-8',
      svg: 30,
      text: 'text-base font-bold',
      sub: 'text-[10px]',
      badge: 'p-1 rounded-xl',
    },
    md: {
      box: 'w-9 h-9',
      svg: 36,
      text: 'text-lg font-bold',
      sub: 'text-[11px]',
      badge: 'p-1.5 rounded-xl',
    },
    lg: {
      box: 'w-12 h-12',
      svg: 48,
      text: 'text-2xl font-extrabold',
      sub: 'text-xs',
      badge: 'p-2 rounded-2xl',
    },
    xl: {
      box: 'w-16 h-16',
      svg: 64,
      text: 'text-3xl font-black',
      sub: 'text-sm',
      badge: 'p-2.5 rounded-2xl',
    },
  }[size];

  // Visual variants for badge background and typography
  const textColor = variant === 'white' ? 'text-white' : 'text-slate-900';
  const tagColor = variant === 'white' ? 'text-blue-200' : 'text-slate-500';
  const subColor = variant === 'white' ? 'text-slate-300' : 'text-slate-400';
  const borderDivider = variant === 'white' ? 'border-white/20' : 'border-slate-200';

  // Badge container style
  const badgeContainerClass = (() => {
    switch (variant) {
      case 'white':
        return 'bg-white/10 backdrop-blur-md border border-white/20 shadow-lg shadow-black/20';
      case 'dark':
        return 'bg-slate-900 border border-slate-800 shadow-md shadow-slate-950/40';
      case 'glass':
        return 'bg-white/80 backdrop-blur-md border border-white/40 shadow-sm shadow-blue-900/5';
      case 'default':
      default:
        return 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-slate-800/80 shadow-md shadow-slate-950/20';
    }
  })();

  const markId = React.useId().replace(/:/g, '');

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* The Brand Emblem Mark */}
      <div
        className={`relative shrink-0 flex items-center justify-center transition-transform duration-300 hover:scale-105 ${sizeMap.box} ${badgeContainerClass} ${sizeMap.badge}`}
        title="VIDYA - Academic Intelligence"
      >
        <svg
          viewBox="0 0 128 128"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          <defs>
            {/* Left Wing Gradient */}
            <linearGradient id={`wingLeft-${markId}`} x1="18%" y1="12%" x2="82%" y2="88%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="40%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>

            {/* Right Wing Gradient */}
            <linearGradient id={`wingRight-${markId}`} x1="20%" y1="10%" x2="85%" y2="90%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="30%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#4338CA" />
            </linearGradient>

            {/* Inner Center Fold */}
            <linearGradient id={`centerFold-${markId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.3" />
            </linearGradient>

            {/* Wisdom Spark Gradient */}
            <linearGradient id={`sparkGrad-${markId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>

          {/* Right Wing (Predictive Trajectory) */}
          <path
            d="M64 104 L108 28 C109.2 26 107.5 23.5 105.2 24.2 L82 32 L64 68 L64 104 Z"
            fill={`url(#wingRight-${markId})`}
          />

          {/* Left Wing (Foundation & Academic Progression) */}
          <path
            d="M64 104 L20 28 C18.8 26 20.5 23.5 22.8 24.2 L46 32 L64 74 L64 104 Z"
            fill={`url(#wingLeft-${markId})`}
          />

          {/* Dimensional Inner Bevel Fold */}
          <path
            d="M64 74 L82 32 L68 37 L64 64 Z"
            fill={`url(#centerFold-${markId})`}
            opacity="0.85"
          />

          {/* Left Inner Facet Accent */}
          <path
            d="M64 74 L46 32 L60 37 L64 64 Z"
            fill="#BAE6FD"
            opacity="0.4"
          />

          {/* Center Apex Anchor Pin */}
          <circle cx="64" cy="103" r="3" fill="#1E3A8A" />

          {/* The Spark of 'Vidya' (Enlightenment, Wisdom & AI Clarity) */}
          <g>
            {/* Outer golden diamond spark */}
            <polygon
              points="64,12 68.5,23 79.5,27.5 68.5,32 64,43 59.5,32 48.5,27.5 59.5,23"
              fill={`url(#sparkGrad-${markId})`}
            />
            {/* Core brilliant white spark */}
            <polygon
              points="64,18 66.5,25 73.5,27.5 66.5,30 64,37 61.5,30 54.5,27.5 61.5,25"
              fill="#FFFFFF"
            />
            <circle cx="64" cy="27.5" r="2" fill="#FFFFFF" />
          </g>
        </svg>
      </div>

      {/* Brand Typography (when not iconOnly) */}
      {!iconOnly && (showText || showTagline || subtitle) && (
        <div className="leading-tight">
          <div className="flex items-baseline gap-2">
            {showText && (
              <span className={`tracking-[0.14em] font-sans ${sizeMap.text} ${textColor}`}>
                VIDYA
              </span>
            )}
            {showTagline && tagline && (
              <span
                className={`hidden sm:inline-block font-serif italic ${sizeMap.sub} ${tagColor} pl-2 border-l ${borderDivider}`}
              >
                {tagline}
              </span>
            )}
          </div>
          {subtitle && (
            <p className={`${sizeMap.sub} ${subColor} font-normal leading-normal mt-0.5`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
