/**
 * Header Component
 *
 * Site header with:
 * - Logo
 * - Wallet connection button
 * - Token balance display
 */

"use client";

import Link from "next/link";
import WalletBalance from "../wallet/WalletBalance";

export default function Header() {
  return (
    <header className="relative bg-pastel-mint">
      <div className="container mx-auto px-4 py-4 flex items-center">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 mr-auto shrink-0">
          <img
            src="/images/logo.png"
            alt="Gashapon logo"
            width={45}
            height={45}
            className="h-45 w-45 object-contain"
          />
          <span className="text-5xl font-display text-pastel-coral tracking-wide text-outline-xl">
            GASHAPON
          </span>
        </Link>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-8 ml-10">
          <a
            href="/"
            className="text-pastel-text font-semibold hover:text-pastel-coral transition-colors"
          >
            Home
          </a>
          <a
            href="/collection"
            className="text-pastel-text font-semibold hover:text-pastel-coral transition-colors"
          >
            Collection
          </a>
          <a
            href="/marketplace"
            className="text-pastel-text font-semibold hover:text-pastel-coral transition-colors"
          >
            Marketplace
          </a>
        </nav>

        {/* Coin balance */}
        <div className="flex items-center gap-3 ml-auto shrink-0">
          <WalletBalance />
        </div>
      </div>
    </header>
  );
}
