/**
 * Games Listing Page - Netflix Style
 * 
 * Displays games organized by categories with horizontal scrolling.
 * Categories are fetched from backend API.
 */

'use client';

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, TrendingUp, Clock, Star, Flame, Gift } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import Card from "@/components/ui/Card";
import CTAButton from "@/components/ui/CTAButton";
import GamesHero3D from "@/components/games/GamesHero3D";
import Loading from "@/components/ui/Loading";
import { useCategories } from "@/hooks/api/useCategories";
import { useGames } from "@/hooks/api/useGames";
import { cn } from "@/utils/helpers";
import type { Game } from "@/types/game/game";

// Category icons mapping
const CATEGORY_ICONS: Record<string, typeof Sparkles> = {
  "Featured": Sparkles,
  "Trending": TrendingUp,
  "New Arrivals": Clock,
  "Top Rated": Star,
  "Hot Right Now": Flame,
  "Limited Edition": Gift,
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

// Game Card for the category rows
function CategoryGameCard({ game }: { game: Game }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link href={`/games/${game.id}`}>
      <motion.div
        className="relative flex-shrink-0 w-[200px] md:w-[280px] cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.05, zIndex: 10 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Card variant="arcade" shadowColor="mint" padding="none" className="overflow-hidden">
          {/* Game Image */}
          <div className="relative aspect-[4/3] bg-gradient-to-br from-pastel-mint to-pastel-sky overflow-hidden">
            {game.imageUrl ? (
              <img
                src={game.imageUrl}
                alt={game.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl">🎮</span>
              </div>
            )}
            
            {/* Hover Overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <CTAButton size="sm" variant="orange" className="w-full">
                PLAY NOW
              </CTAButton>
            </motion.div>

            {/* Plays Badge */}
            <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm border-2 border-[#111827] text-[10px] md:text-xs font-bold text-[#111827]">
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
      </motion.div>
    </Link>
  );
}

// Horizontal scrolling category row
function CategoryRow({ 
  name, 
  games 
}: { 
  name: string; 
  games: Game[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);

  const Icon = CATEGORY_ICONS[name] || Sparkles;

  // Check if content is scrollable and update arrow visibility
  const updateScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const canScroll = scrollWidth > clientWidth;
    setIsScrollable(canScroll);
    setShowLeftArrow(canScroll && scrollLeft > 0);
    setShowRightArrow(canScroll && scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Check on mount and window resize
  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [games]);

  const handleScroll = () => {
    updateScrollState();
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === "left" ? -400 : 400;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  if (games.length === 0) return null;

  return (
    <div className="mb-8 md:mb-12">
      {/* Category Header */}
      <div className="flex items-center gap-3 mb-5 px-4 md:px-8">
        {/* Animated Icon */}
        <motion.div 
          className="relative w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-pastel-coral to-pastel-pink flex items-center justify-center border-2 border-[#111827]"
          style={{ boxShadow: "2px 2px 0 #111827" }}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Icon className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md" />
        </motion.div>
        
        {/* Title */}
        <h2 className="font-display text-lg md:text-2xl text-[#111827]">
          {name.toUpperCase()}
        </h2>
      </div>

      {/* Scrollable Games Row */}
      <div className="relative group">
        {/* Left Arrow - only show when scrollable */}
        {isScrollable && (
          <motion.button
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/90 border-2 border-[#111827] flex items-center justify-center shadow-lg",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              !showLeftArrow && "!opacity-0 pointer-events-none"
            )}
            style={{ boxShadow: "3px 3px 0 #111827" }}
            onClick={() => scroll("left")}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft className="w-6 h-6 text-[#111827]" />
          </motion.button>
        )}

        {/* Games Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-8 py-2"
          onScroll={handleScroll}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {games.map((game) => (
            <CategoryGameCard key={`${name}-${game.id}`} game={game} />
          ))}
        </div>

        {/* Right Arrow - only show when scrollable */}
        {isScrollable && (
          <motion.button
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/90 border-2 border-[#111827] flex items-center justify-center shadow-lg",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              !showRightArrow && "!opacity-0 pointer-events-none"
            )}
            style={{ boxShadow: "3px 3px 0 #111827" }}
            onClick={() => scroll("right")}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight className="w-6 h-6 text-[#111827]" />
          </motion.button>
        )}

        {/* Gradient Fades - only show when scrollable */}
        {isScrollable && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/30 to-transparent pointer-events-none z-10 backdrop-blur-[2px]" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/30 to-transparent pointer-events-none z-10 backdrop-blur-[2px]" />
          </>
        )}
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
          return { name: categoryName, games: categoryGames };
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
      {/* Animated gradient background matching hero */}
      <div className="fixed inset-0 -z-10">
        <motion.div 
          className="absolute inset-0"
          animate={{
            background: [
              "linear-gradient(180deg, #B8E4F0 0%, #A1E5CC 30%, #DDA0DD 60%, #F7ABAD 100%)",
              "linear-gradient(180deg, #A1E5CC 0%, #B8E4F0 30%, #F7ABAD 60%, #DDA0DD 100%)",
              "linear-gradient(180deg, #DDA0DD 0%, #F7ABAD 30%, #B8E4F0 60%, #A1E5CC 100%)",
              "linear-gradient(180deg, #B8E4F0 0%, #A1E5CC 30%, #DDA0DD 60%, #F7ABAD 100%)",
            ]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Subtle floating blobs */}
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full bg-white/10 blur-3xl"
          style={{ top: "-200px", right: "-200px" }}
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full bg-pastel-mint/20 blur-3xl"
          style={{ bottom: "10%", left: "-150px" }}
          animate={{
            x: [0, 80, 0],
            y: [0, -60, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full bg-pastel-coral/15 blur-3xl"
          style={{ top: "40%", right: "10%" }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
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
              <CategoryRow name={category.name} games={category.games} />
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
