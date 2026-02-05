/**
 * White-label Layout for store.fun
 *
 * Dark theme with kawaii accents - matching store.fun's vibe
 * Note: This is a nested layout - html/body come from root layout.
 */

"use client";

import WalletBalance from "@/components/wallet/WalletBalance";
import Image from "next/image";
import Link from "next/link";

function WhitelabelHeader() {
  return (
    <header className="relative z-50 bg-[#0f1219]/95 backdrop-blur-xl border-b border-gray-800 h-[72px]">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        {/* store.fun Logo/Brand */}
        <Link href="/store-fun" className="flex items-center gap-3 group">
          <div className="relative h-9 w-9 md:h-10 md:w-10 rounded-full overflow-hidden ring-2 ring-blue-500/30 group-hover:ring-blue-500/60 transition-all">
            <Image
              src="/images/coin-images/store.fun.avif"
              alt="store.fun"
              fill
              className="object-cover"
            />
          </div>
          <span className="font-display text-lg md:text-xl text-white tracking-wide group-hover:text-blue-300 transition-colors">
            STORE.FUN
          </span>
          <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            Games
          </span>
        </Link>

        {/* Wallet Balance */}
        <div className="flex items-center gap-3">
          <WalletBalance />
        </div>
      </div>
    </header>
  );
}

function WhitelabelFooter() {
  return (
    <footer className="bg-[#0a0c10] py-6 text-center border-t border-gray-800/50">
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <span>Powered by</span>
        <a
          href="https://grabbit.fun"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
        >
          Grabbit.fun
        </a>
      </div>
    </footer>
  );
}

export default function StoreFunLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gradient-to-b from-[#0a0d14] via-[#0f1420] to-[#0a0d14] min-h-screen">
      <WhitelabelHeader />
      <main className="relative flex-1">{children}</main>
      <WhitelabelFooter />
    </div>
  );
}
