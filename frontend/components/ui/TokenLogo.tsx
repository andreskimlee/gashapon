/**
 * TokenLogo Component
 *
 * Reusable component for displaying token logos.
 * Supports the default $GRAB token and custom partnership tokens.
 * Supports multiple preset sizes and custom className overrides.
 */

import { cn } from "@/utils/helpers";
import Image from "next/image";

type TokenLogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface TokenLogoProps {
  /** Preset size of the logo */
  size?: TokenLogoSize;
  /** Additional CSS classes */
  className?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Token mint address - used to look up custom token images */
  tokenMint?: string | null;
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

// Map token mint addresses to their custom images
const TOKEN_IMAGES: Record<string, string> = {
  // store.fun token
  G849nDx4r1vwjibbmpjkZ6pbDWwaMouhkWLq1o8Z5FUN:
    "/images/coin-images/store.fun.avif",
};

// Default token image
const DEFAULT_TOKEN_IMAGE = "/grabbit-coin-image.png";

/**
 * Get the token image URL for a given mint address
 */
export function getTokenImageUrl(tokenMint?: string | null): string {
  if (tokenMint && TOKEN_IMAGES[tokenMint]) {
    return TOKEN_IMAGES[tokenMint];
  }
  return DEFAULT_TOKEN_IMAGE;
}

export default function TokenLogo({
  size = "md",
  className,
  alt = "Token",
  tokenMint,
}: TokenLogoProps) {
  const imageUrl = getTokenImageUrl(tokenMint);

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={sizeDimensions[size]}
      height={sizeDimensions[size]}
      className={cn(sizeClasses[size], "rounded-full", className)}
    />
  );
}
