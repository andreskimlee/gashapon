/**
 * Game Card Component
 *
 * Displays a game card in the games listing
 * Shows: name, image, cost, prize tiers, supply remaining
 */

"use client";

import { formatTokenAmount } from "@/utils/helpers";
import Link from "next/link";
import ArcadeCard from "../ui/ArcadeCard";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

interface GameCardProps {
  gameId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  costInTokens: number;
  isActive: boolean;
  totalPlays?: number;
}

export default function GameCard({
  gameId,
  name,
  description,
  imageUrl,
  costInTokens,
  isActive,
  totalPlays,
}: GameCardProps) {
  // Determine glow color based on game status
  const glowColor = isActive ? "cyan" : "none";

  return (
    <ArcadeCard
      glow={glowColor}
      ambient={isActive}
      className="overflow-hidden h-full flex flex-col"
    >
      {imageUrl ? (
        <div className="aspect-video relative overflow-hidden rounded-t-2xl mb-4">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
          {!isActive && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Badge variant="error">Inactive</Badge>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-video arcade-gradient-soft relative overflow-hidden rounded-t-2xl mb-4 flex items-center justify-center">
          <div className="text-6xl">🎮</div>
          {!isActive && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Badge variant="error">Inactive</Badge>
            </div>
          )}
        </div>
      )}

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-display text-white neon-glow-cyan flex-1">
            {name}
          </h3>
          {isActive && (
            <Badge variant="success" size="sm">
              Active
            </Badge>
          )}
        </div>

        {description && (
          <p className="text-white/70 text-sm mb-4 line-clamp-2 flex-1">
            {description}
          </p>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-neon-cyan neon-glow-cyan">
              {formatTokenAmount(costInTokens)}
            </span>
            <img
              src="/grabbit-coin-image.png"
              alt=""
              className="w-7 h-7 rounded-full"
            />
          </div>
          {totalPlays !== undefined && (
            <span className="text-sm text-white/60">
              {totalPlays.toLocaleString()} plays
            </span>
          )}
        </div>

        <Link href={`/games/${gameId}`} className="block mt-auto">
          <Button variant="primary" className="w-full" disabled={!isActive}>
            {isActive ? "🎮 Play Now" : "View Details"}
          </Button>
        </Link>
      </div>
    </ArcadeCard>
  );
}
