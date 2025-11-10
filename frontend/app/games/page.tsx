/**
 * Games Listing Page
 * 
 * Displays all available games that users can play.
 * Shows game details, pricing, prize tiers, and play button.
 */

'use client';

import { useGames } from '@/hooks/api/useGames';
import GameCard from '@/components/game/GameCard';
import NeonSign from '@/components/ui/NeonSign';
import Loading from '@/components/ui/Loading';

export default function GamesPage() {
  const { games, loading, error } = useGames();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loading size="lg" />
          <p className="mt-4 text-white/70">Loading games...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">
          <NeonSign color="pink" className="text-4xl mb-4">
            ERROR
          </NeonSign>
          <p className="text-white/80 mb-4">{error}</p>
          <p className="text-white/60 text-sm">
            Make sure the backend is running on {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Page Header */}
      <div className="text-center mb-12">
        <NeonSign color="cyan" className="text-5xl md:text-6xl mb-4" flicker={false}>
          AVAILABLE GAMES
        </NeonSign>
        <p className="text-white/70 text-lg">
          Choose your game and start playing
        </p>
      </div>

      {/* Games Grid */}
      {games.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-white/60 text-xl mb-4">No games available</p>
          <p className="text-white/40 text-sm">
            Check back later or contact support if you believe this is an error.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {games.map((game) => (
            <GameCard
              key={game.id}
              gameId={game.id.toString()}
              name={game.name}
              description={game.description || undefined}
              imageUrl={game.imageUrl || undefined}
              costInTokens={Number(game.costInTokens)}
              isActive={game.isActive}
              totalPlays={game.totalPlays}
            />
          ))}
        </div>
      )}
    </div>
  );
}


