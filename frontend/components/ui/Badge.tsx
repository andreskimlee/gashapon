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
    default: 'bg-pastel-pinkLight text-pastel-text',
    common: 'bg-pastel-pinkLight text-pastel-text',
    uncommon: 'bg-pastel-mint text-pastel-text',
    rare: 'bg-pastel-sky text-pastel-text',
    legendary: 'bg-pastel-lavender text-pastel-text',
    success: 'bg-pastel-mint text-green-700',
    warning: 'bg-pastel-yellow text-amber-700',
    error: 'bg-red-200 text-red-700',
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

