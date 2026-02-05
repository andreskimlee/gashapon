/**
 * useDomainContext Hook
 *
 * Detects the current domain and returns white-label context.
 * Used by components to adjust behavior based on the hosting domain.
 */

"use client";

import { useEffect, useState } from "react";

export type PartnerSlug = "store-fun" | null;

export interface DomainContext {
  /** Whether the current domain is a white-label partner domain */
  isWhitelabel: boolean;
  /** The partner slug if on a white-label domain */
  partner: PartnerSlug;
  /** The hostname (e.g., "games.store.fun" or "grabbit.fun") */
  hostname: string;
  /** Whether the context is still loading (client-side only) */
  loading: boolean;
}

// Map of hostnames to partner slugs
const WHITELABEL_DOMAINS: Record<string, PartnerSlug> = {
  "games.store.fun": "store-fun",
  // Add more partnerships here as needed
  // "games.partner.com": "partner-slug",
};

/**
 * Hook to detect the current domain context
 *
 * @returns Domain context with white-label information
 *
 * @example
 * const { isWhitelabel, partner } = useDomainContext();
 * if (isWhitelabel && partner === "store-fun") {
 *   // Show store.fun specific content
 * }
 */
export function useDomainContext(): DomainContext {
  const [context, setContext] = useState<DomainContext>({
    isWhitelabel: false,
    partner: null,
    hostname: "",
    loading: true,
  });

  useEffect(() => {
    // Only runs on client
    const hostname = window.location.hostname;
    const partner = WHITELABEL_DOMAINS[hostname] || null;

    setContext({
      isWhitelabel: partner !== null,
      partner,
      hostname,
      loading: false,
    });
  }, []);

  return context;
}

/**
 * Get partner configuration by slug
 */
export function getPartnerConfig(partner: PartnerSlug) {
  const configs: Record<
    NonNullable<PartnerSlug>,
    {
      name: string;
      gameId: number;
      primaryColor: string;
      logoUrl: string;
    }
  > = {
    "store-fun": {
      name: "store.fun",
      gameId: 24,
      primaryColor: "#4F46E5",
      logoUrl: "/images/coin-images/store.fun.avif",
    },
  };

  return partner ? configs[partner] : null;
}
