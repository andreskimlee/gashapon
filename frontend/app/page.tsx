/**
 * Home Page
 * 
 * Retro-futuristic arcade landing page with:
 * - Dark vaporwave hero section with neon signs
 * - Featured games with glassmorphism cards
 * - How it works section with neon effects
 * - Floating decorative elements
 */

'use client';

import Link from 'next/link';
import NeonSign from '@/components/ui/NeonSign';
import ArcadeCard from '@/components/ui/ArcadeCard';

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-16">
        {/* Ambient floating lights */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-neon-cyan/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-neon-pink/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-neon-purple/20 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }} />
        
        {/* Floating coins */}
        <div className="absolute top-32 right-20 text-6xl animate-float" style={{ animationDelay: '0.5s' }}>
          ⭐
        </div>
        <div className="absolute bottom-32 left-20 text-5xl animate-float" style={{ animationDelay: '1.5s' }}>
          💰
        </div>
        
        <div className="relative z-10 max-w-5xl text-center">
          {/* Main Neon Title */}
          <NeonSign color="cyan" className="text-7xl md:text-8xl mb-6" flicker={true}>
            GACHAPON
          </NeonSign>
          
          {/* Subtitle with glow */}
          <p className="text-2xl md:text-3xl mb-4 neon-glow-yellow font-display">
            RETRO ARCADE • BLOCKCHAIN PRIZES
          </p>
          
          <p className="text-lg md:text-xl mb-12 text-white/90 max-w-2xl mx-auto">
            Play games, win NFTs, redeem physical prizes
            <br />
            <span className="text-neon-cyan">Experience the future of arcade gaming</span>
          </p>
          
          {/* CTA Button */}
          <Link
            href="/games"
            className="btn btn-neon text-xl px-10 py-5 inline-block"
          >
            🎮 PLAY NOW
          </Link>
          
          {/* Decorative neon arrows */}
          <div className="mt-16 flex justify-center gap-8">
            <div className="text-4xl neon-glow-cyan animate-float">↓</div>
            <div className="text-4xl neon-glow-pink animate-float" style={{ animationDelay: '0.3s' }}>↓</div>
            <div className="text-4xl neon-glow-yellow animate-float" style={{ animationDelay: '0.6s' }}>↓</div>
          </div>
        </div>
      </section>

      {/* Featured Games Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <NeonSign color="pink" className="text-5xl md:text-6xl mb-4" flicker={false}>
              FEATURED GAMES
            </NeonSign>
            <p className="text-white/70 text-lg">Choose your adventure</p>
          </div>
          
          {/* Placeholder for game cards - will be replaced with actual games */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <ArcadeCard glow="cyan" ambient={true} className="text-center">
              <div className="text-6xl mb-4">🎰</div>
              <h3 className="text-2xl font-display mb-3 neon-glow-cyan">Classic Gacha</h3>
              <p className="text-white/80 mb-4">Traditional arcade experience</p>
              <div className="text-neon-cyan font-bold text-xl">100 tokens</div>
            </ArcadeCard>
            
            <ArcadeCard glow="pink" ambient={true} className="text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-2xl font-display mb-3 neon-glow-pink">Premium Prize</h3>
              <p className="text-white/80 mb-4">Higher stakes, better rewards</p>
              <div className="text-neon-pink font-bold text-xl">500 tokens</div>
            </ArcadeCard>
            
            <ArcadeCard glow="purple" ambient={true} className="text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-2xl font-display mb-3 neon-glow-yellow">Legendary Box</h3>
              <p className="text-white/80 mb-4">Ultra rare prizes await</p>
              <div className="text-neon-yellow font-bold text-xl">1000 tokens</div>
            </ArcadeCard>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 px-4">
        
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <NeonSign color="yellow" className="text-5xl md:text-6xl mb-4" flicker={false}>
              HOW IT WORKS
            </NeonSign>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <ArcadeCard glow="cyan" className="text-center relative">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <div className="text-5xl neon-glow-cyan">🎮</div>
              </div>
              <div className="pt-8">
                <h3 className="text-xl font-display mb-3 text-white">1. Play Games</h3>
                <p className="text-white/70">Use tokens to play and win prizes</p>
              </div>
            </ArcadeCard>
            
            <ArcadeCard glow="pink" className="text-center relative">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <div className="text-5xl neon-glow-pink">🎁</div>
              </div>
              <div className="pt-8">
                <h3 className="text-xl font-display mb-3 text-white">2. Win NFTs</h3>
                <p className="text-white/70">Collect rare prize NFTs</p>
              </div>
            </ArcadeCard>
            
            <ArcadeCard glow="purple" className="text-center relative">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <div className="text-5xl neon-glow-yellow">📦</div>
              </div>
              <div className="pt-8">
                <h3 className="text-xl font-display mb-3 text-white">3. Redeem Prizes</h3>
                <p className="text-white/70">Trade NFTs for physical items</p>
              </div>
            </ArcadeCard>
          </div>
        </div>
      </section>

      {/* Call to Action Footer */}
      <section className="relative py-16 px-4 border-t border-neon-cyan/30">
        <div className="container mx-auto text-center">
          <NeonSign color="cyan" className="text-4xl mb-6" flicker={true}>
            READY TO PLAY?
          </NeonSign>
          <Link
            href="/games"
            className="btn btn-neon text-lg px-8 py-4 inline-block"
          >
            EXPLORE GAMES →
          </Link>
        </div>
      </section>
    </div>
  );
}
