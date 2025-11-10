/**
 * Wallet Button Component
 * 
 * Button to connect/disconnect Solana wallet (Phantom, etc.)
 * Uses Solana wallet adapter
 */

'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function WalletButton() {
  return <WalletMultiButton className="!bg-neon-cyan !text-black hover:!opacity-90" />;
}
 
