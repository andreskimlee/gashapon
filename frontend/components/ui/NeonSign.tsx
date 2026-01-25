/**
 * Neon Sign Component
 * 
 * Creates stylized text with optional color effects
 * Now supports pastel kawaii style
 */

'use client';

import { ReactNode } from 'react';
import { cn } from '@/utils/helpers';

interface NeonSignProps {
  children: ReactNode;
  color?: 'pink' | 'cyan' | 'yellow' | 'purple' | 'blue' | 'coral' | 'mint' | 'default';
  className?: string;
  flicker?: boolean;
}

export default function NeonSign({
  children,
  color = 'default',
  className,
}: NeonSignProps) {
  const colorClasses = {
    pink: 'text-pastel-pink',
    cyan: 'text-pastel-mint',
    yellow: 'text-pastel-yellow',
    purple: 'text-pastel-purple',
    blue: 'text-pastel-sky',
    coral: 'text-pastel-coral',
    mint: 'text-pastel-mint',
    default: 'text-pastel-text',
  };

  return (
    <div
      className={cn(
        'font-display font-bold',
        colorClasses[color],
        className
      )}
    >
      {children}
    </div>
  );
}

