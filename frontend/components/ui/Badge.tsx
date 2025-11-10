/**
 * Badge Component
 * 
 * Badge/tag component for displaying tiers, status, etc.
 */

'use client';

import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/helpers';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: 'default' | 'common' | 'uncommon' | 'rare' | 'legendary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

export default function Badge({
  children,
  className,
  variant = 'default',
  size = 'md',
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-candy-lightPink text-candy-dark',
    common: 'bg-candy-lightPink text-candy-dark',
    uncommon: 'bg-candy-mint text-candy-dark',
    rare: 'bg-candy-teal text-candy-dark',
    legendary: 'bg-candy-lavender text-candy-dark',
    success: 'bg-candy-mint text-candy-dark',
    warning: 'bg-candy-yellow text-candy-dark',
    error: 'bg-red-400 text-white',
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

