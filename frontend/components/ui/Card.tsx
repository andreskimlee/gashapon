/**
 * Card Component
 * 
 * Reusable card component with Tailwind styling
 */

'use client';

import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/helpers';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

export default function Card({
  children,
  className,
  hover = false,
  padding = 'md',
  ...props
}: CardProps) {
  const paddingStyles = {
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    none: '',
  };

  return (
    <div
      className={cn(
        'rounded-2xl bg-candy-white shadow-soft',
        paddingStyles[padding],
        hover && 'hover:shadow-lg transition-shadow duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

