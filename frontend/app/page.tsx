/**
 * Home Page
 * 
 * Pastel kawaii landing page with:
 * - Sky background with fluffy clouds
 * - 3D claw machine in hero section
 * - Game cards grid in pastel style (real data)
 * - Staggered entrance animations
 */

'use client';

import { motion } from "framer-motion";

import GameCard from '@/components/home/GameCard';
import HeroSection from '@/components/home/HeroSection';
import Loading from '@/components/ui/Loading';
import { useGames } from '@/hooks/api/useGames';

export default function Home() {
  const { games, loading, error } = useGames();

  return (
    <div className="relative min-h-screen">
      <HeroSection />

      {/* Games Grid Section */}
      <section className="relative py-12 px-4">
        <div className="container mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loading size="lg" />
              <p className="mt-4 text-pastel-text">Loading games...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-pastel-coral text-xl mb-4">Failed to load games</p>
              <p className="text-pastel-textLight text-sm">{error}</p>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-pastel-text text-xl mb-4">No games available</p>
              <p className="text-pastel-textLight text-sm">
                Check back later for new games!
              </p>
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8 max-w-2xl xl:max-w-7xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {games.map((game, index) => (
                <motion.div
                  key={game.id}
                  className="h-full"
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  }}
                >
                  <GameCard
                    game={{
                      id: game.id,
                      name: game.name,
                      image: game.imageUrl || '🎮',
                      prizeImage:
                        game.prizes?.find((prize) => prize.imageUrl)?.imageUrl ||
                        undefined,
                      room: `#${game.id}`,
                      cost: Number(game.costInTokens) || 0,
                      costUsdCents: game.costInUsd ? Number(game.costInUsd) * 100 : undefined,
                      currencyTokenMintAddress: game.currencyTokenMintAddress || undefined,
                      isActive: game.isActive,
                      totalPlays: game.totalPlays,
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
