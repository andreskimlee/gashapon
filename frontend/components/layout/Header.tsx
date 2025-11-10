/**
 * Header Component
 * 
 * Site header with:
 * - Logo
 * - Wallet connection button
 * - Token balance display
 */

'use client';

import WalletButton from '../wallet/WalletButton';
import WalletBalance from '../wallet/WalletBalance';

export default function Header() {
  return (
    <header className="relative border-b border-neon-cyan/30 bg-white/5 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-display neon-glow-cyan">GACHAPON</h1>
        </div>
        <div className="flex items-center gap-4">
          <WalletBalance />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

