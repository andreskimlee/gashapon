/**
 * TokenLogo Component
 *
 * Reusable component for displaying the $GRAB token logo.
 * Supports multiple preset sizes and custom className overrides.
 */

import Image from "next/image";
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

const sizeDimensions: Record<TokenLogoSize, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
};

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
    <Image
      src="/grabbit-coin-image.png"
      alt={alt}
      width={sizeDimensions[size]}
      height={sizeDimensions[size]}
      className={cn(sizeClasses[size], "rounded-full", className)}
    />
  );
}
