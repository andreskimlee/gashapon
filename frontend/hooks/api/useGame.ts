/**
 * useGame Hook
 * 
 * React hook for fetching a single game by ID
 */

'use client';

import { useState, useEffect } from 'react';
import { gamesApi } from '@/services/api/games';
import type { Game } from '@/types/game/game';

interface UseGameResult {
  game: Game | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGame(gameId: number): UseGameResult {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGame = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gamesApi.getGame(gameId);
      setGame(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch game';
      setError(errorMessage);
      console.error('Error fetching game:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gameId) {
      fetchGame();
    }
  }, [gameId]);

  return {
    game,
    loading,
    error,
    refetch: fetchGame,
  };
}


