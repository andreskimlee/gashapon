/**
 * NFT Card Component
 * 
 * Displays an NFT card in collection or marketplace
 * Shows: image, name, tier, redeemable status
 */

'use client';

import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatWalletAddress } from '@/utils/helpers';

interface NFTCardProps {
  mintAddress: string;
  name: string;
  imageUrl?: string;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
  isRedeemed: boolean;
  isRedeemable: boolean;
  onClick?: () => void;
  onRedeem?: () => void;
}

export default function NFTCard({
  mintAddress,
  name,
  imageUrl,
  tier,
  isRedeemed,
  isRedeemable,
  onClick,
  onRedeem,
}: NFTCardProps) {
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
        {isRedeemed && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="error">Redeemed</Badge>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant={tier}>{tier}</Badge>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-display font-bold text-candy-dark mb-1 truncate">{name}</h3>
        <p className="text-xs text-candy-dark/60 font-mono mb-3">
          {formatWalletAddress(mintAddress)}
        </p>
        
        {isRedeemable && !isRedeemed && (
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onRedeem?.();
            }}
          >
            Redeem
          </Button>
        )}
      </div>
    </Card>
  );
}

