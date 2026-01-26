/**
 * Marketplace Listing Card Component
 *
 * Displays a marketplace listing card
 * Shows: NFT image, name, tier, price, seller info
 */

"use client";

import { formatTokenAmount, formatWalletAddress } from "@/utils/helpers";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";

interface ListingCardProps {
  listingId: string;
  nftMint: string;
  name: string;
  imageUrl?: string;
  tier: "common" | "uncommon" | "rare" | "legendary";
  priceInTokens: number;
  sellerWallet: string;
  onClick?: () => void;
  onBuy?: () => void;
}

export default function ListingCard({
  name,
  imageUrl,
  tier,
  priceInTokens,
  sellerWallet,
  onClick,
  onBuy,
}: ListingCardProps) {
  return (
    <Card hover className="overflow-hidden cursor-pointer" onClick={onClick}>
      <div className="aspect-square arcade-gradient-soft relative overflow-hidden rounded-t-2xl">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-candy-dark/30">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant={tier}>{tier}</Badge>
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-display font-bold text-candy-dark truncate flex-1">
            {name}
          </h3>
        </div>

        <div className="mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-candy-teal">
              {formatTokenAmount(priceInTokens)}
            </span>
            <img
              src="/grabbit-coin-image.png"
              alt=""
              className="w-7 h-7 rounded-full"
            />
          </div>
        </div>

        <div className="text-xs text-candy-dark/60 mb-3">
          Seller:{" "}
          <span className="font-mono">{formatWalletAddress(sellerWallet)}</span>
        </div>

        <Button
          variant="primary"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onBuy?.();
          }}
        >
          Buy Now
        </Button>
      </div>
    </Card>
  );
}
