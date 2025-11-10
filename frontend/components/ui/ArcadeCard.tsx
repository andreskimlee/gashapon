/**
 * Arcade Card Component
 * 
 * Card with retro arcade aesthetic - glassmorphism + neon glow
 */

'use client';

import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/helpers';

interface ArcadeCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glow?: 'pink' | 'cyan' | 'purple' | 'blue' | 'none';
  ambient?: boolean;
}

export default function ArcadeCard({
  children,
  className,
  glow = 'cyan',
  ambient = false,
  ...props
}: ArcadeCardProps) {
  const glowStyles = {
    pink: 'shadow-glow-pink border-neon-pink/30',
    cyan: 'shadow-glow-cyan border-neon-cyan/30',
    purple: 'shadow-neon-purple border-neon-purple/30',
    blue: 'shadow-neon-blue border-neon-blue/30',
    none: '',
  };

  return (
    <div
      className={cn(
        'card-neon rounded-2xl p-6 relative overflow-hidden',
        glow !== 'none' && glowStyles[glow],
        ambient && 'ambient-light',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

