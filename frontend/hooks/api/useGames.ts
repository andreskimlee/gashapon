/**
 * useGames Hook
 *
 * React Query hook for fetching games data with caching and deduplication
 */

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { gamesApi } from "@/services/api/games";

// Query key factory for games queries
export const gamesKeys = {
  all: ["games"] as const,
  lists: () => [...gamesKeys.all, "list"] as const,
  detail: (id: number) => [...gamesKeys.all, "detail", id] as const,
};

/**
 * Hook to fetch and cache all games
 * 
 * @returns Query result with games array, loading state, and error
 */
export function useGames() {
  const query = useQuery({
    queryKey: gamesKeys.lists(),
    queryFn: () => gamesApi.getGames(),
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    games: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}

/**
 * Hook to manually invalidate/refetch games data
 */
export function useInvalidateGames() {
  const queryClient = useQueryClient();

  return {
    /** Invalidate all games queries */
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: gamesKeys.all }),
    
    /** Refetch games list */
    refetchList: () => queryClient.refetchQueries({ queryKey: gamesKeys.lists() }),
  };
}

