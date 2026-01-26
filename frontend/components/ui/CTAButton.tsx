/**
 * CTA Button Component
 *
 * Call-to-action button with shimmer hover effect
 */

"use client";

import { cn } from "@/utils/helpers";
import { motion } from "framer-motion";
import Link from "next/link";
import { ReactNode, useState } from "react";

interface CTAButtonProps {
  children: ReactNode;
  href?: string;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "orange" | "pink";
  disabled?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
}

export default function CTAButton({
  children,
  className,
  href,
  size = "md",
  variant = "orange",
  disabled,
  onClick,
  type = "button",
}: CTAButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

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

  const hoverGradients = {
    orange: "linear-gradient(to bottom, #FFCC99 0%, #FFB366 50%, #FF9C45 100%)",
    pink: "linear-gradient(to bottom, #FFD4D8 0%, #FFB3B8 50%, #F8959E 100%)",
  };

  const buttonClasses = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-bold tracking-wide",
    "text-white relative overflow-hidden",
    "transition-all duration-200",
    "active:scale-95 active:brightness-95",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    sizes[size],
    className
  );

  const style = {
    background: isHovered && !disabled ? hoverGradients[variant] : gradients[variant],
    borderTop: "2px solid #374151",
    borderLeft: "2px solid #374151",
    borderRight: "4px solid #374151",
    borderBottom: "5px solid #374151",
    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
  };

  const content = (
    <>
      {/* Shimmer effect on hover */}
      {isHovered && !disabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </>
  );

  if (href) {
    return (
      <Link 
        href={href} 
        className={buttonClasses} 
        style={style}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      className={buttonClasses}
      style={style}
      disabled={disabled}
      onClick={onClick}
      type={type}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {content}
    </button>
  );
}
