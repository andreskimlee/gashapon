/**
 * useGames Hook
 *
 * React hook for fetching games data
 */

"use client";

import { gamesApi } from "@/services/api/games";
import type { Game } from "@/types/game/game";
import { useEffect, useState } from "react";

interface UseGamesResult {
  games: Game[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGames(): UseGamesResult {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gamesApi.getGames();
      setGames(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch games";
      setError(errorMessage);
      console.error("Error fetching games:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  return {
    games,
    loading,
    error,
    refetch: fetchGames,
  };
}



