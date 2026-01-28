/**
 * Games Listing Page - Netflix Style
 * 
 * Displays games organized by categories with horizontal scrolling.
 * Categories are fetched from backend API.
 */

'use client';

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Sparkles, Layers, Gamepad2, Heart, Star, Coffee } from "lucide-react";
import Link from "next/link";

import Card from "@/components/ui/Card";
import CTAButton from "@/components/ui/CTAButton";
import GamesHero3D from "@/components/games/GamesHero3D";
import Loading from "@/components/ui/Loading";
import { useCategories } from "@/hooks/api/useCategories";
import { useGames } from "@/hooks/api/useGames";
import { cn } from "@/utils/helpers";
import type { Game } from "@/types/game/game";

// Category icons mapping (matches Lucide icon names stored in DB)
const CATEGORY_ICONS: Record<string, typeof Sparkles> = {
  "Sparkles": Sparkles,
  "Layers": Layers,
  "Gamepad2": Gamepad2,
  "Heart": Heart,
  "Star": Star,
  "Coffee": Coffee,
};

// Mock categories with game IDs (will be replaced with API call)
const MOCK_CATEGORIES: Record<string, number[]> = {
  "Featured": [1, 2, 3, 4, 5],
  "Trending": [2, 4, 1, 3],
  "New Arrivals": [5, 4, 3, 2, 1],
  "Top Rated": [1, 3, 5],
  "Hot Right Now": [2, 1, 4, 5, 3],
  "Limited Edition": [3, 5],
};

// Mock games for when real games aren't available
const MOCK_GAMES: Game[] = [
  {
    id: 1,
    onChainAddress: "mock1",
    name: "Kawaii Plushies",
    description: "Win adorable plush toys from Japan!",
    imageUrl: "/images/title.png",
    costInTokens: 100,
    costInUsd: 0.99,
    isActive: true,
    totalPlays: 15420,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    onChainAddress: "mock2",
    name: "Anime Figures",
    description: "Premium collectible figures await!",
    imageUrl: "/images/title.png",
    costInTokens: 250,
    costInUsd: 2.49,
    isActive: true,
    totalPlays: 8930,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    onChainAddress: "mock3",
    name: "Snack Attack",
    description: "Japanese candy and snacks!",
    imageUrl: "/images/title.png",
    costInTokens: 75,
    costInUsd: 0.75,
    isActive: true,
    totalPlays: 22100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    onChainAddress: "mock4",
    name: "Tech Gadgets",
    description: "Electronics and accessories!",
    imageUrl: "/images/title.png",
    costInTokens: 500,
    costInUsd: 4.99,
    isActive: true,
    totalPlays: 5670,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 5,
    onChainAddress: "mock5",
    name: "Mystery Box",
    description: "What will you get? Find out!",
    imageUrl: "/images/title.png",
    costInTokens: 150,
    costInUsd: 1.49,
    isActive: true,
    totalPlays: 31500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Game Card for the category rows - optimized for mobile
function CategoryGameCard({ game }: { game: Game }) {
  // Get the first prize with an image, or fall back to game image
  const prizeImage = game.prizes?.find(p => p.imageUrl)?.imageUrl;
  const displayImage = prizeImage || game.imageUrl;

  return (
    <Link href={`/games/${game.id}`}>
      <div
        className="relative flex-shrink-0 w-[200px] md:w-[280px] cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-98"
      >
        <Card variant="arcade" shadowColor="mint" padding="none" className="overflow-hidden">
          {/* Prize/Game Image */}
          <div className="relative aspect-[4/3] bg-gradient-to-br from-pastel-mint to-pastel-sky overflow-hidden group/card">
            {displayImage ? (
              <img
                src={displayImage}
                alt={game.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl">🎮</span>
              </div>
            )}
            
            {/* Hover Overlay - CSS only, hidden on mobile */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex-col justify-end p-3 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 hidden md:flex"
            >
              <CTAButton size="sm" variant="orange" className="w-full">
                PLAY NOW
              </CTAButton>
            </div>

            {/* Plays Badge */}
            <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-white/90 border-2 border-[#111827] text-[10px] md:text-xs font-bold text-[#111827]">
              {game.totalPlays.toLocaleString()} plays
            </div>

            {/* Price Badge */}
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-pastel-yellow border-2 border-yellow-400/50 text-[10px] md:text-xs font-bold text-[#111827]">
              ${(Number(game.costInUsd) || Number(game.costInTokens) / 100).toFixed(2)}
            </div>
          </div>

          {/* Game Info */}
          <div className="p-3">
            <h3 className="font-display text-sm md:text-base text-[#111827] truncate">
              {game.name.toUpperCase()}
            </h3>
            {game.description && (
              <p className="text-xs text-pastel-text/70 mt-1 line-clamp-1">
                {game.description}
              </p>
            )}
          </div>
        </Card>
      </div>
    </Link>
  );
}

// Horizontal scrolling category row with Embla Carousel - optimized
function CategoryRow({ 
  name, 
  icon,
  games 
}: { 
  name: string; 
  icon: string | null;
  games: Game[];
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });
  
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const Icon = (icon && CATEGORY_ICONS[icon]) || Sparkles;

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (games.length === 0) return null;

  return (
    <div className="mb-8 md:mb-12">
      {/* Category Header */}
      <div className="flex items-center gap-3 mb-5 px-4 md:px-8">
        {/* Icon - no hover animation on mobile */}
        <div 
          className="relative w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-pastel-coral to-pastel-pink flex items-center justify-center border-2 border-[#111827] md:hover:scale-110 md:hover:rotate-3 transition-transform duration-200"
          style={{ boxShadow: "2px 2px 0 #111827" }}
        >
          <Icon className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md" />
        </div>
        
        {/* Title */}
        <h2 className="font-display text-lg md:text-2xl text-[#111827]">
          {name.toUpperCase()}
        </h2>
      </div>

      {/* Carousel */}
      <div className="relative group">
        {/* Left Arrow - CSS only, hidden on mobile */}
        <button
          className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border-2 border-[#111827] items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-90",
            "hidden md:flex",
            !canScrollPrev && "!opacity-0 pointer-events-none"
          )}
          style={{ boxShadow: "3px 3px 0 #111827" }}
          onClick={scrollPrev}
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-[#111827]" />
        </button>

        {/* Embla Viewport */}
        <div className="overflow-hidden px-4 md:px-8" ref={emblaRef}>
          <div className="flex gap-4 py-2">
            {games.map((game) => (
              <div key={`${name}-${game.id}`} className="flex-none">
                <CategoryGameCard game={game} />
              </div>
            ))}
          </div>
        </div>

        {/* Right Arrow - CSS only, hidden on mobile */}
        <button
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border-2 border-[#111827] items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-90",
            "hidden md:flex",
            !canScrollNext && "!opacity-0 pointer-events-none"
          )}
          style={{ boxShadow: "3px 3px 0 #111827" }}
          onClick={scrollNext}
        >
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-[#111827]" />
        </button>
      </div>
    </div>
  );
}

export default function GamesPage() {
  const { games: apiGames, loading: gamesLoading, error: gamesError } = useGames();
  const { categories: apiCategories, loading: categoriesLoading, error: categoriesError } = useCategories();

  const loading = gamesLoading || categoriesLoading;
  const isDev = process.env.NODE_ENV === 'development';

  // Use API games if available, fall back to mock data only in development
  const allGames = apiGames.length > 0 ? apiGames : (isDev ? MOCK_GAMES : []);

  // Use API categories if available, fall back to mock categories only in development
  const categoryRows = apiCategories.length > 0
    ? apiCategories.map(cat => ({
        name: cat.name,
        icon: cat.icon,
        games: cat.games.length > 0 ? cat.games : 
          // If no games in category, try to populate from allGames using mock IDs (dev only)
          isDev 
            ? (MOCK_CATEGORIES[cat.name] || [])
                .map(id => allGames.find(g => g.id === id))
                .filter((g): g is Game => g !== undefined)
            : []
      }))
    : isDev 
      ? Object.entries(MOCK_CATEGORIES).map(([categoryName, gameIds]) => {
          const categoryGames = gameIds
            .map(id => allGames.find(g => g.id === id))
            .filter((g): g is Game => g !== undefined);
          return { name: categoryName, icon: null, games: categoryGames };
        })
      : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pastel-sky via-pastel-mint to-pastel-coral/30">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loading size="lg" />
          <p className="mt-4 text-pastel-text font-bold">Loading games...</p>
        </div>
      </div>
    );
  }

  if ((gamesError || categoriesError) && apiGames.length === 0) {
    // Log API errors
    console.warn("API error:", gamesError || categoriesError);
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Static gradient background - no animations for performance */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-pastel-sky via-pastel-mint to-pastel-coral/30">
        {/* Static decorative blobs - only on desktop */}
        <div className="hidden md:block absolute w-[800px] h-[800px] rounded-full bg-white/10 blur-3xl -top-[200px] -right-[200px]" />
        <div className="hidden md:block absolute w-[600px] h-[600px] rounded-full bg-pastel-mint/20 blur-3xl bottom-[10%] -left-[150px]" />
        <div className="hidden md:block absolute w-[500px] h-[500px] rounded-full bg-pastel-coral/15 blur-3xl top-[40%] right-[10%]" />
      </div>

      <div className="relative pb-12">
        {/* 3D Hero Section */}
        <GamesHero3D />

        {/* Category Rows */}
        <div className="mt-8 md:mt-12">
          {categoryRows.map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <CategoryRow name={category.name} icon={category.icon} games={category.games} />
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {categoryRows.every(c => c.games.length === 0) && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="font-display text-2xl text-[#111827] mb-2">NO GAMES AVAILABLE</h2>
            <p className="text-pastel-text">Check back soon for new games!</p>
          </div>
        )}
      </div>
    </div>
  );
}
