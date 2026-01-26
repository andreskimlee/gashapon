/**
 * CTA Button Component
 *
 * Call-to-action button with claw machine grab & release hover effect
 */

"use client";

import { cn } from "@/utils/helpers";
import { motion, useAnimation } from "framer-motion";
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
  disabled,
  ...props
}: CTAButtonProps) {
  const controls = useAnimation();

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

  // Claw grab effect
  const handleHoverStart = async () => {
    if (disabled) return;
    await controls.start({
      y: -6,
      scale: 0.97,
      transition: { type: "spring", stiffness: 500, damping: 15 }
    });
  };

  // Release with bounce
  const handleHoverEnd = async () => {
    if (disabled) return;
    await controls.start({
      y: [null, 3, -1, 0],
      scale: [null, 1.03, 0.99, 1],
      transition: {
        duration: 0.4,
        times: [0, 0.4, 0.7, 1],
        ease: "easeOut"
      }
    });
  };

  const motionProps = {
    animate: controls,
    onHoverStart: handleHoverStart,
    onHoverEnd: handleHoverEnd,
    whileTap: disabled ? {} : { scale: 0.95, y: 2 },
  };

  if (href) {
    return (
      <motion.div {...motionProps} className="inline-block">
        <Link href={href} className={buttonClasses} style={style}>
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      className={buttonClasses}
      style={style}
      disabled={disabled}
      {...motionProps}
      {...props}
    >
      {children}
    </motion.button>
  );
}
