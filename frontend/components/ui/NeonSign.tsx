/**
 * Neon Sign Component
 * 
 * Creates a neon sign effect with glow and flicker animation
 */

'use client';

import { ReactNode } from 'react';
import { cn } from '@/utils/helpers';

interface NeonSignProps {
  children: ReactNode;
  color?: 'pink' | 'cyan' | 'yellow' | 'purple' | 'blue';
  className?: string;
  flicker?: boolean;
}

export default function NeonSign({
  children,
  color = 'cyan',
  className,
  flicker = true,
}: NeonSignProps) {
  const colorClasses = {
    pink: 'text-neon-pink neon-glow-pink',
    cyan: 'text-neon-cyan neon-glow-cyan',
    yellow: 'text-neon-yellow neon-glow-yellow',
    purple: 'text-neon-purple',
    blue: 'text-neon-blue',
  };

  return (
    <div
      className={cn(
        'font-display font-bold',
        colorClasses[color],
        flicker && 'neon-text',
        className
      )}
    >
      {children}
    </div>
  );
}

