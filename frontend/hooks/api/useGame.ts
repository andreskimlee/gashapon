/**
 * useGame Hook
 * 
 * React Query hook for fetching a single game by ID with caching
 */

'use client';

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { gamesApi } from '@/services/api/games';
import type { Game } from '@/types/game/game';
import { gamesKeys } from './useGames';

/**
 * Hook to fetch and cache a single game by ID
 * 
 * @param gameId - The game ID to fetch
 * @returns Query result with game data, loading state, and error
 */
export function useGame(gameId: number) {
  const query = useQuery({
    queryKey: gamesKeys.detail(gameId),
    queryFn: () => gamesApi.getGame(gameId),
    enabled: !!gameId && gameId > 0,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    game: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}

/**
 * Hook to manually invalidate/refetch a specific game
 */
export function useInvalidateGame() {
  const queryClient = useQueryClient();

  return {
    /** Invalidate a specific game by ID */
    invalidate: (gameId: number) => 
      queryClient.invalidateQueries({ queryKey: gamesKeys.detail(gameId) }),
    
    /** Refetch a specific game by ID */
    refetch: (gameId: number) =>
      queryClient.refetchQueries({ queryKey: gamesKeys.detail(gameId) }),
  };
}

