/**
 * useIsMobile Hook
 * 
 * Detects if the current viewport is mobile-sized.
 * Uses window.matchMedia for efficient, reactive detection.
 */

import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768; // md breakpoint in Tailwind

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // Set initial value
    setIsMobile(mediaQuery.matches);

    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isMobile;
}

export default useIsMobile;
