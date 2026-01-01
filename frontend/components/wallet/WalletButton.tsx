/**
 * Wallet Button Component
 * 
 * Button to connect/disconnect Solana wallet (Phantom, etc.)
 * Uses Solana wallet adapter
 */

'use client';

import dynamic from 'next/dynamic';

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export default function WalletButton() {
  return <WalletMultiButton className="!bg-neon-cyan !text-black hover:!opacity-90" />;
}
