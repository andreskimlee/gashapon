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
  const baseStyles = 'font-semibold rounded-xl2 shadow-soft transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-candy-teal text-candy-dark hover:brightness-110 active:translate-y-[1px]',
    secondary: 'bg-candy-deepBlue text-candy-white hover:brightness-110 active:translate-y-[1px]',
    outline: 'border-2 border-candy-teal text-candy-teal hover:bg-candy-mint/20 active:translate-y-[1px]',
    ghost: 'text-candy-dark hover:bg-candy-lightPink/50 active:translate-y-[1px]',
    danger: 'bg-red-500 text-white hover:brightness-110 active:translate-y-[1px]',
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

