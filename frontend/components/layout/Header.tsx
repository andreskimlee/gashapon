/**
 * Header Component
 *
 * Site header with:
 * - Logo (responsive sizing)
 * - Wallet connection button
 * - Token balance display
 * - Mobile hamburger menu
 */

"use client";

import { useIsMobile } from "@/hooks/useIsMobile";
import { Grid3X3, Handshake, Home, Menu, Store, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import WalletBalance from "../wallet/WalletBalance";

export default function Header() {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="relative z-50 bg-pastel-mint border-b-4 border-[#111827]">
      <div className="container mx-auto px-3 md:px-4 py-2 md:py-4 flex items-center">
        {/* Brand - smaller on mobile */}
        <Link href="/" className="flex items-center gap-2 md:gap-3 shrink-0">
          <img
            src="/images/logo.png"
            alt="Gashapon logo"
            width={isMobile ? 32 : 45}
            height={isMobile ? 32 : 45}
            className="object-contain"
          />
          <span className="text-2xl md:text-5xl font-display text-pastel-coral tracking-wide text-outline-xl">
            {isMobile ? "GASHA" : "GASHAPON"}
          </span>
        </Link>

        {/* Navigation links - hidden on mobile */}
        <nav className="hidden md:flex items-center gap-8 ml-10">
          <Link
            href="/"
            className="text-pastel-text font-semibold hover:text-pastel-coral transition-colors"
          >
            Home
          </Link>
          <Link
            href="/collection"
            className="text-pastel-text font-semibold hover:text-pastel-coral transition-colors"
          >
            Collection
          </Link>
          <Link
            href="/partnership"
            className="text-pastel-text font-semibold hover:text-pastel-coral transition-colors"
          >
            Partnership
          </Link>
          <span className="text-pastel-text/50 font-semibold cursor-not-allowed">
            Marketplace
            <sup className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-pastel-coral text-white rounded-full align-super">
              SOON
            </sup>
          </span>
        </nav>

        {/* Coin balance + hamburger */}
        <div className="flex items-center gap-2 md:gap-3 ml-auto shrink-0">
          <WalletBalance />
          
          {/* Mobile hamburger menu button - matches wallet button style */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-full bg-pastel-mint border-2 border-emerald-400/50 hover:bg-emerald-200 hover:border-emerald-500 transition-all"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4 text-emerald-700" />
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile menu drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-72 bg-gradient-to-b from-pastel-mint to-pastel-sky border-l-4 border-[#111827] z-50 transform transition-transform duration-300 ease-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        style={{ boxShadow: "-4px 0 0 #111827" }}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b-2 border-[#111827]/20">
          <span className="font-display text-xl text-pastel-coral text-outline-xl">MENU</span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white border-2 border-pastel-coral/50 hover:bg-pastel-pinkLight transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4 text-pastel-coral" />
          </button>
        </div>

        {/* Menu links */}
        <nav className="flex flex-col p-4 gap-3">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-2 border-[#111827] font-bold text-[#111827] hover:translate-x-1 transition-transform"
            style={{ boxShadow: "3px 3px 0 #111827" }}
          >
            <div className="w-8 h-8 rounded-full bg-pastel-mint flex items-center justify-center border-2 border-emerald-400/50">
              <Home className="w-4 h-4 text-emerald-700" />
            </div>
            Home
          </Link>
          <Link
            href="/collection"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-2 border-[#111827] font-bold text-[#111827] hover:translate-x-1 transition-transform"
            style={{ boxShadow: "3px 3px 0 #111827" }}
          >
            <div className="w-8 h-8 rounded-full bg-pastel-pink flex items-center justify-center border-2 border-pink-400/50">
              <Grid3X3 className="w-4 h-4 text-pink-600" />
            </div>
            Collection
          </Link>
          <Link
            href="/partnership"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-2 border-[#111827] font-bold text-[#111827] hover:translate-x-1 transition-transform"
            style={{ boxShadow: "3px 3px 0 #111827" }}
          >
            <div className="w-8 h-8 rounded-full bg-pastel-lavender flex items-center justify-center border-2 border-purple-400/50">
              <Handshake className="w-4 h-4 text-purple-600" />
            </div>
            Partnership
          </Link>
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/60 border-2 border-[#111827]/40 font-bold text-[#111827]/40 cursor-not-allowed"
            style={{ boxShadow: "3px 3px 0 #11182740" }}
          >
            <div className="w-8 h-8 rounded-full bg-pastel-yellow/50 flex items-center justify-center border-2 border-yellow-400/30">
              <Store className="w-4 h-4 text-yellow-700/50" />
            </div>
            Marketplace
            <sup className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-pastel-coral text-white rounded-full">
              SOON
            </sup>
          </div>
        </nav>
      </div>
    </header>
  );
}
