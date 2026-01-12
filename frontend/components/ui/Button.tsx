/**
 * Button Component
 * 
 * Reusable button component with Tailwind styling
 */

'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/helpers';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  isLoading?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  isLoading,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-button hover:shadow-buttonHover';
  
  const variants = {
    primary: 'bg-pastel-coral text-white hover:bg-pastel-coralLight active:translate-y-[2px]',
    secondary: 'bg-pastel-mint text-pastel-text hover:bg-pastel-mintLight active:translate-y-[2px]',
    outline: 'border-2 border-pastel-coral text-pastel-coral bg-white hover:bg-pastel-pinkLight active:translate-y-[2px]',
    ghost: 'text-pastel-text hover:bg-pastel-pinkLight/50 active:translate-y-[2px] shadow-none',
    danger: 'bg-red-400 text-white hover:bg-red-500 active:translate-y-[2px]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

