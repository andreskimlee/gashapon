/**
 * TokenLogo Component
 *
 * Reusable component for displaying the $GRAB token logo.
 * Supports multiple preset sizes and custom className overrides.
 */

import { cn } from "@/utils/helpers";

type TokenLogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface TokenLogoProps {
  /** Preset size of the logo */
  size?: TokenLogoSize;
  /** Additional CSS classes */
  className?: string;
  /** Alt text for accessibility */
  alt?: string;
}

const sizeClasses: Record<TokenLogoSize, string> = {
  xs: "w-4 h-4",
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-7 h-7",
  xl: "w-8 h-8",
};

export default function TokenLogo({
  size = "md",
  className,
  alt = "$GRAB token",
}: TokenLogoProps) {
  return (
    <img
      src="/grabbit-coin-image.png"
      alt={alt}
      className={cn(sizeClasses[size], "rounded-full", className)}
    />
  );
}
