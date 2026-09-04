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
    <div className={`flex items-center gap-2.5 select-none ${className}`} id="orbilink-brand-logo">
      <div className={`relative flex items-center justify-center ${iconSizes[size]} rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 border border-[#25D366]/30 shadow-lg shadow-[#25D366]/10 group`}>
        {/* Minimalist Geometric ORBILINK SVG Icon */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-3/4 h-3/4 text-[#25D366] group-hover:text-[#25D366]/90 transition-colors"
        >
          {/* Orbital rings */}
          <ellipse
            cx="16"
            cy="16"
            rx="11"
            ry="5.5"
            transform="rotate(-25 16 16)"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="opacity-90"
          />
          <ellipse
            cx="16"
            cy="16"
            rx="11"
            ry="5.5"
            transform="rotate(35 16 16)"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeDasharray="2.5 1.5"
            className="opacity-60"
          />
          {/* Core Linked Nodes */}
          <circle cx="16" cy="16" r="3.2" fill="#25D366" />
          <circle cx="16" cy="16" r="1.3" fill="#075E54" />
          <circle cx="23" cy="12" r="1.5" fill="#25D366" />
          <circle cx="9" cy="20" r="1.5" fill="#25D366" />
        </svg>

        {/* Glow indicator dot */}
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#25D366] ring-2 ring-zinc-950 animate-pulse" />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizes[size]} text-zinc-100 flex items-center gap-1`}>
            ORBI<span className="text-[#25D366] font-extrabold tracking-wider">LINK</span>
          </span>
        </div>
      )}
    </div>
  );
};
