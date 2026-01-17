/**
 * Card Component
 *
 * Reusable card component with multiple style variants:
 * - default: Simple white card with soft shadow
 * - arcade: 3D border effect with colored drop shadow (game card style)
 */

"use client";

import { HTMLAttributes, ReactNode, CSSProperties } from "react";
import { cn } from "@/utils/helpers";

type ShadowColor = "mint" | "pink" | "coral" | "purple" | "lavender" | "yellow";
type BorderColor = "dark" | "pink" | "coral" | "purple" | "mint";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Card style variant */
  variant?: "default" | "arcade";
  /** Enable hover lift effect */
  hover?: boolean;
  /** Padding size */
  padding?: "sm" | "md" | "lg" | "xl" | "none";
  /** Drop shadow color (arcade variant only) */
  shadowColor?: ShadowColor;
  /** Border color (arcade variant only) - defaults to dark */
  borderColor?: BorderColor;
}

const shadowColors: Record<ShadowColor, string> = {
  mint: "#8ECCC1",
  pink: "#F5C6D6",
  coral: "#F7ABAD",
  purple: "#D4B8E8",
  lavender: "#E0D4F7",
  yellow: "#FFE5A0",
};

const borderColors: Record<BorderColor, string> = {
  dark: "#111827",
  pink: "#C9909A",    // Darker pink
  coral: "#D4868A",   // Darker coral
  purple: "#9B7BA8",  // Darker purple
  mint: "#5BA898",    // Darker mint
};

const paddingStyles = {
  sm: "p-2",
  md: "p-4",
  lg: "p-6",
  xl: "p-8",
  none: "",
};

export default function Card({
  children,
  className,
  variant = "default",
  hover = false,
  padding = "md",
  shadowColor = "mint",
  borderColor = "dark",
  style,
  ...props
}: CardProps) {
  const borderHex = borderColors[borderColor];
  
  // Arcade style: 3D border with colored drop shadow
  const arcadeStyle: CSSProperties = {
    border: `2px solid ${borderHex}`,
    borderRight: `4px solid ${borderHex}`,
    borderBottom: `5px solid ${borderHex}`,
    boxShadow: `6px 8px 0 ${shadowColors[shadowColor]}`,
    ...style,
  };

  if (variant === "arcade") {
    return (
      <div
        className={cn(
          "bg-white rounded-2xl overflow-hidden",
          paddingStyles[padding],
          hover && "transition-all duration-200 hover:-translate-y-1",
          className
        )}
        style={arcadeStyle}
        {...props}
      >
        {children}
      </div>
    );
  }

  // Default style: Simple card with soft shadow
  return (
    <div
      className={cn(
        "rounded-2xl bg-white shadow-soft",
        paddingStyles[padding],
        hover && "hover:shadow-lg transition-shadow duration-200",
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}
