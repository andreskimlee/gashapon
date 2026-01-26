/**
 * Header Component
 *
 * Claw machine themed animated header with:
 * - Grab & release hover effects
 * - Bouncy spring physics
 * - Swinging animations
 */

"use client";

import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Gamepad2, Grid3X3, Handshake, Home, Menu, Store, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import TokenLogo from "../ui/TokenLogo";
import WalletBalance from "../wallet/WalletBalance";

// Claw grab animation for nav links
function GrabLink({ href, children }: { href: string; children: React.ReactNode }) {
  const controls = useAnimation();
  
  const handleHoverStart = async () => {
    // Grab effect: pull up and squeeze
    await controls.start({
      y: -8,
      scale: 0.95,
      transition: { type: "spring", stiffness: 400, damping: 10 }
    });
  };
  
  const handleHoverEnd = async () => {
    // Release effect: drop with bounce
    await controls.start({
      y: [null, 4, -2, 0],
      scale: [null, 1.05, 0.98, 1],
      transition: { 
        duration: 0.5,
        times: [0, 0.4, 0.7, 1],
        ease: "easeOut"
      }
    });
  };

  return (
    <Link href={href}>
      <motion.span
        className="relative block text-pastel-text font-bold cursor-pointer"
        animate={controls}
        onHoverStart={handleHoverStart}
        onHoverEnd={handleHoverEnd}
        whileTap={{ scale: 0.9, y: 2 }}
      >
        {/* Claw "string" effect on hover */}
        <motion.span
          className="absolute -top-3 left-1/2 w-0.5 bg-gradient-to-b from-[#111827] to-transparent origin-bottom"
          initial={{ height: 0, x: "-50%" }}
          whileHover={{ height: 12 }}
          transition={{ duration: 0.15 }}
        />
        <span className="relative z-10 px-3 py-1.5 rounded-xl bg-white/80 border-2 border-[#111827] inline-block"
          style={{ boxShadow: "2px 2px 0 #111827" }}
        >
          {children}
        </span>
      </motion.span>
    </Link>
  );
}

// Mobile menu item with grab effect
function MobileMenuItem({ 
  href, 
  icon: Icon, 
  iconBg, 
  iconColor, 
  borderColor,
  children, 
  index,
  onClick 
}: { 
  href: string; 
  icon: typeof Home;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  children: React.ReactNode;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100, rotate: 5 }}
      animate={{ 
        opacity: 1, 
        x: 0, 
        rotate: 0,
        transition: { 
          delay: index * 0.08, 
          type: "spring", 
          stiffness: 200, 
          damping: 20 
        }
      }}
      whileHover={{ 
        x: 8,
        rotate: -1,
        transition: { type: "spring", stiffness: 400, damping: 10 }
      }}
      whileTap={{ 
        scale: 0.95,
        rotate: 0,
        transition: { type: "spring", stiffness: 400, damping: 10 }
      }}
    >
      <Link
        href={href}
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-2 border-[#111827] font-bold text-[#111827]"
        style={{ boxShadow: "3px 3px 0 #111827" }}
      >
        <motion.div 
          className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center border-2 ${borderColor}`}
          whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.3 } }}
        >
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </motion.div>
        {children}
      </Link>
    </motion.div>
  );
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="relative z-50 bg-pastel-mint border-b-4 border-[#111827] h-[72px] md:h-24 overflow-visible">
      <div className="container mx-auto px-3 md:px-4 h-full flex items-center">
        {/* Brand */}
        <div className="shrink-0 -my-4">
          <Link href="/">
            <img
              src="/images/title.png"
              alt="Grabbit.fun"
              className="h-20 md:h-24 w-auto object-contain hover:scale-105 transition-transform"
            />
          </Link>
        </div>

        {/* Navigation links - hidden on mobile */}
        <nav className="hidden md:flex items-center gap-4 ml-10">
          <GrabLink href="/">Home</GrabLink>
          <GrabLink href="/games">Games</GrabLink>
          <GrabLink href="/collection">Collection</GrabLink>
          <GrabLink href="/partnership">Partnership</GrabLink>
          
          {/* Marketplace - disabled with swing */}
          <motion.span 
            className="relative px-3 py-1.5 rounded-xl bg-white/50 border-2 border-[#111827]/30 text-pastel-text/50 font-bold cursor-not-allowed"
            style={{ boxShadow: "2px 2px 0 #11182730" }}
            animate={{ rotate: [-0.5, 0.5, -0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            Marketplace
            <motion.sup 
              className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-pastel-coral text-white rounded-full align-super"
              animate={{ 
                scale: [1, 1.15, 1],
                y: [0, -2, 0]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              SOON
            </motion.sup>
          </motion.span>
        </nav>

        {/* Buy $GRAB + Wallet balance + hamburger */}
        <div className="flex items-center gap-2 md:gap-3 ml-auto shrink-0">
          {/* Buy button */}
          <a
            href={`https://pump.fun/coin/${process.env.NEXT_PUBLIC_TOKEN_MINT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 border-2 border-amber-600 font-bold text-white text-sm items-center gap-2 hover:scale-105 transition-transform"
          >
            <TokenLogo size="lg" />
            <span>BUY</span>
          </a>
          
          <WalletBalance />

          {/* Mobile hamburger - claw grip animation */}
          <motion.button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-[#111827]"
            style={{ boxShadow: "2px 2px 0 #111827" }}
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            whileHover={{ 
              y: -4,
              transition: { type: "spring", stiffness: 400 }
            }}
            whileTap={{ 
              scale: 0.85,
              y: 2
            }}
          >
            <Menu className="w-5 h-5 text-[#111827]" />
          </motion.button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile menu drawer - drops in like a prize */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed top-0 right-0 h-full w-72 bg-gradient-to-b from-pastel-mint to-pastel-sky border-l-4 border-[#111827] z-50 md:hidden overflow-hidden"
            initial={{ x: "100%", rotate: 3 }}
            animate={{ x: 0, rotate: 0 }}
            exit={{ x: "110%", rotate: -3 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Header with close button */}
            <div className="flex items-center justify-between p-4 border-b-2 border-[#111827]/20">
              <motion.span 
                className="font-display text-xl text-pastel-coral text-outline-xl"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                MENU
              </motion.span>
              <motion.button
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-[#111827]"
                style={{ boxShadow: "2px 2px 0 #111827" }}
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.85 }}
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-[#111827]" />
              </motion.button>
            </div>

            {/* Menu links with staggered grab animation */}
            <nav className="flex flex-col p-4 gap-3">
              <MobileMenuItem
                href="/"
                icon={Home}
                iconBg="bg-pastel-mint"
                iconColor="text-emerald-700"
                borderColor="border-emerald-400/50"
                index={0}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </MobileMenuItem>
              
              <MobileMenuItem
                href="/games"
                icon={Gamepad2}
                iconBg="bg-pastel-sky"
                iconColor="text-cyan-600"
                borderColor="border-cyan-400/50"
                index={1}
                onClick={() => setMobileMenuOpen(false)}
              >
                Games
              </MobileMenuItem>
              
              <MobileMenuItem
                href="/collection"
                icon={Grid3X3}
                iconBg="bg-pastel-pink"
                iconColor="text-pink-600"
                borderColor="border-pink-400/50"
                index={2}
                onClick={() => setMobileMenuOpen(false)}
              >
                Collection
              </MobileMenuItem>
              
              <MobileMenuItem
                href="/partnership"
                icon={Handshake}
                iconBg="bg-pastel-lavender"
                iconColor="text-purple-600"
                borderColor="border-purple-400/50"
                index={3}
                onClick={() => setMobileMenuOpen(false)}
              >
                Partnership
              </MobileMenuItem>
              
              {/* Marketplace - disabled */}
              <motion.div
                initial={{ opacity: 0, x: 100, rotate: 5 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  rotate: 0,
                  transition: { delay: 0.32, type: "spring", stiffness: 200, damping: 20 }
                }}
              >
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/60 border-2 border-[#111827]/40 font-bold text-[#111827]/40 cursor-not-allowed"
                  style={{ boxShadow: "3px 3px 0 #11182740" }}
                >
                  <div className="w-8 h-8 rounded-full bg-pastel-yellow/50 flex items-center justify-center border-2 border-yellow-400/30">
                    <Store className="w-4 h-4 text-yellow-700/50" />
                  </div>
                  Marketplace
                  <motion.sup 
                    className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-pastel-coral text-white rounded-full"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    SOON
                  </motion.sup>
                </div>
              </motion.div>

              {/* Buy CTA */}
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  transition: { delay: 0.40, type: "spring", stiffness: 200, damping: 20 }
                }}
              >
                <a
                  href={`https://pump.fun/coin/${process.env.NEXT_PUBLIC_TOKEN_MINT}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 border-2 border-amber-600 font-bold text-white active:scale-95 transition-transform"
                  style={{ boxShadow: "3px 3px 0 #b45309" }}
                >
                  <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center border-2 border-white/50">
                    <TokenLogo size="sm" />
                  </div>
                  <span>BUY</span>
                </a>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
