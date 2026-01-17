/**
 * Home GameCard (reference-inspired)
 *
 * Matches the sample layout:
 * - White card container with black border
 * - Right-biased mint drop shadow (#8ECCC1)
 * - Full-height left image panel (placeholder)
 * - Right content column with prize preview squircle and CTA
 */

"use client";

import Card from "@/components/ui/Card";
import CTAButton from "@/components/ui/CTAButton";
import { useTokenCost } from "@/hooks/useTokenCost";
import { formatCompact } from "@/utils/format";
import { cn } from "@/utils/helpers";
import Link from "next/link";

export type HomeGameCardModel = {
  id: number | string;
  name: string;
  image: string; // URL or emoji fallback
  prizeImage?: string; // URL or emoji fallback
  room: string;
  cost: number; // Legacy: token amount (fallback)
  costUsdCents?: number; // Cost in USD cents (e.g., 99 = $0.99)
  currencyTokenMintAddress?: string; // Token mint for price lookup
  isActive?: boolean;
  totalPlays?: number;
};

export default function GameCard({
  game,
  className,
}: {
  game: HomeGameCardModel;
  className?: string;
}) {
  // Dynamic token cost calculation
  const { tokenAmountFormatted, loading: priceLoading } = useTokenCost(
    game.currencyTokenMintAddress,
    game.costUsdCents
  );

  const isImageUrl = (value: string) =>
    value.startsWith("http") || value.startsWith("/");

  const renderImage = (image: string, size: "large" | "small" | "preview") => {
    if (isImageUrl(image)) {
      return (
        <img
          src={image}
          alt={game.name}
          className={cn(
            "object-cover rounded-lg",
            size === "large"
              ? "w-full h-full"
              : size === "preview"
                ? "w-full h-full"
                : "w-16 h-16"
          )}
        />
      );
    }
    return (
      <span
        className={cn(
          "select-none",
          size === "large"
            ? "text-6xl"
            : size === "preview"
              ? "text-4xl"
              : "text-3xl"
        )}
      >
        {image}
      </span>
    );
  };

  const prizePreviewImage = game.prizeImage || game.image;

  return (
    <Link href={`/games/${game.id}`} className="block">
      <Card
        variant="arcade"
        shadowColor="mint"
        hover
        padding="none"
        className={cn("cursor-pointer", className)}
      >
        <div className="flex">
          {/* Left image panel */}
          <div className="w-[320px] shrink-0 bg-[#CFEFEA] m-4 rounded-2xl overflow-hidden">
            <div className="h-full min-h-[360px] flex items-center justify-center">
              {renderImage(game.image, "large")}
            </div>
          </div>

          {/* Right content */}
          <div className="flex-1 p-5 flex flex-col overflow-hidden">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-2xl leading-tight text-[#111827]">
                {game.name.toUpperCase()}
              </h3>
              {game.isActive === false && (
                <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-600 rounded-full shrink-0">
                  INACTIVE
                </span>
              )}
            </div>

            <div className="mt-4">
              <div className="text-sm font-bold text-[#111827] uppercase tracking-wide text-center">
                PRIZE PREVIEW
              </div>
              <div className="mt-2 w-full h-32 rounded-xl border-2 border-[#111827] bg-[#E9EEF2] flex items-center justify-center overflow-hidden">
                {renderImage(prizePreviewImage, "preview")}
              </div>
            </div>

            <div className="mt-5 text-base text-[#111827] leading-tight">
              <div className="font-bold">
                ROOM: <span className="font-extrabold">{game.room}</span>
              </div>
              <div className="mt-2 font-bold flex items-center gap-2 flex-wrap">
                <span>COST:</span>
                <span className="px-3 py-1 rounded-md bg-[#FFE39A] border border-[#111827]/20 font-extrabold">
                  {priceLoading
                    ? "..."
                    : tokenAmountFormatted
                      ? `${tokenAmountFormatted} TOKENS`
                      : `${formatCompact(game.cost)} TOKENS`}
                </span>
              </div>
              {typeof game.totalPlays === "number" && (
                <div className="mt-2 text-sm text-pastel-textLight">
                  {game.totalPlays.toLocaleString()} plays
                </div>
              )}
            </div>

            <div className="mt-auto pt-5">
              <CTAButton
                size="md"
                variant="pink"
                className="w-full"
                disabled={game.isActive === false}
              >
                {game.isActive === false ? "UNAVAILABLE" : "ENTER ROOM"}
              </CTAButton>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
