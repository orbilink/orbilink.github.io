import React from 'react';
import { cn } from '../utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'neutral' | 'amber' | 'rose' | 'blue';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'emerald',
  size = 'md',
  className,
}) => {
  const variants = {
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    neutral: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-[11px] leading-none',
    md: 'px-2.5 py-1 text-xs leading-none font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-sans tracking-wide whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};
