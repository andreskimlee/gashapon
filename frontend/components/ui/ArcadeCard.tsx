/**
 * Arcade Card Component
 * 
 * Card with pastel kawaii aesthetic - soft shadows
 */

'use client';

import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/helpers';

interface ArcadeCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  color?: 'pink' | 'mint' | 'lavender' | 'peach' | 'coral' | 'white';
  glow?: 'pink' | 'cyan' | 'purple' | 'blue' | 'none';
  ambient?: boolean;
}

export default function ArcadeCard({
  children,
  className,
  color = 'white',
  glow = 'none',
  ambient = false,
  ...props
}: ArcadeCardProps) {
  const colorStyles = {
    pink: 'bg-pastel-pinkLight border-pastel-pink/30',
    mint: 'bg-pastel-mintLight border-pastel-mint/30',
    lavender: 'bg-pastel-lavender border-pastel-purple/30',
    peach: 'bg-pastel-peach border-pastel-coral/30',
    coral: 'bg-pastel-coralLight border-pastel-coral/30',
    white: 'bg-white border-gray-100',
  };

  return (
    <div
      className={cn(
        'card-pastel rounded-3xl p-6 relative overflow-hidden border',
        colorStyles[color],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

