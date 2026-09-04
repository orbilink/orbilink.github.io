import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  };

  const textSizes = {
    sm: 'text-sm font-semibold tracking-tight',
    md: 'text-base font-bold tracking-tight',
    lg: 'text-xl font-bold tracking-tight',
    xl: 'text-2xl font-black tracking-tight',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`} id="rynox-brand-logo">
      <div className={`relative flex items-center justify-center ${iconSizes[size]} rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 border border-emerald-500/30 shadow-lg shadow-emerald-950/20 group`}>
        {/* Minimalist Geometric RYNOX SVG Icon */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-3/4 h-3/4 text-emerald-400 group-hover:text-emerald-300 transition-colors"
        >
          {/* Hexagonal Node Shell */}
          <path
            d="M16 3L27.25 9.5V22.5L16 29L4.75 22.5V9.5L16 3Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-90"
          />
          {/* Internal Mesh Lattice Lines */}
          <path
            d="M16 3V16M27.25 22.5L16 16M4.75 22.5L16 16"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeDasharray="2 1.5"
            className="opacity-60"
          />
          {/* Core Secure Node */}
          <circle cx="16" cy="16" r="3" fill="#10B981" />
          <circle cx="16" cy="16" r="1.2" fill="#022C22" />
        </svg>

        {/* Glow indicator dot */}
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-neutral-950 animate-pulse" />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizes[size]} text-neutral-100 flex items-center gap-1.5`}>
            RYN<span className="text-emerald-400 font-extrabold tracking-wider">OX</span>
          </span>
        </div>
      )}
    </div>
  );
};
