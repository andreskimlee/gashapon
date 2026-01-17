/**
 * CTA Button Component
 *
 * Call-to-action button with box shadow - supports orange and pink variants
 */

"use client";

import { cn } from "@/utils/helpers";
import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface CTAButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  href?: string;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "orange" | "pink";
}

export default function CTAButton({
  children,
  className,
  href,
  size = "md",
  variant = "orange",
  ...props
}: CTAButtonProps) {
  const sizes = {
    xs: "px-3 py-1.5 text-base",
    sm: "px-2 py-2 text-xl",
    md: "px-2 py-3 text-2xl",
    lg: "px-4 py-2 text-2xl",
  };

  const gradients = {
    orange: "linear-gradient(to bottom, #FFB366 0%, #FF9C45 50%, #FF8A2B 100%)",
    pink: "linear-gradient(to bottom, #FFB3B8 0%, #F8959E 50%, #F07A84 100%)",
  };

  const buttonClasses = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-bold tracking-wide",
    "text-white",
    "transition-all duration-150",
    "hover:brightness-105",
    "active:translate-y-0.5",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    sizes[size],
    className
  );

  const style = {
    background: gradients[variant],
    borderTop: "2px solid #374151",
    borderLeft: "2px solid #374151",
    borderRight: "4px solid #374151",
    borderBottom: "5px solid #374151",
    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
  };

  if (href) {
    return (
      <Link href={href} className={buttonClasses} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button className={buttonClasses} style={style} {...props}>
      {children}
    </button>
  );
}
