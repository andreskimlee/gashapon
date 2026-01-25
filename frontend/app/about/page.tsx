/**
 * About Page
 *
 * Interactive page explaining Grabbit:
 * - What it is
 * - How it works
 * - Tokenomics
 */

"use client";

import { motion } from "framer-motion";
import {
  Coins,
  Gamepad2,
  Gift,
  Package,
  Rocket,
  Shield,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";

import CTAButton from "@/components/ui/CTAButton";

const features = [
  {
    icon: Gamepad2,
    title: "PLAY TO WIN",
    description: "Control the claw machine in real-time. Time your grab perfectly to win exclusive prizes.",
    color: "bg-pastel-mint",
    borderColor: "border-emerald-400/50",
    iconColor: "text-emerald-700",
  },
  {
    icon: Gift,
    title: "REAL PRIZES",
    description: "Win actual physical items - hoodies, collectibles, plushies, and more. Shipped worldwide.",
    color: "bg-pastel-pink",
    borderColor: "border-pink-400/50",
    iconColor: "text-pink-600",
  },
  {
    icon: Shield,
    title: "ON-CHAIN FAIRNESS",
    description: "Every play is recorded on Solana. Provably fair RNG ensures transparent odds.",
    color: "bg-pastel-lavender",
    borderColor: "border-purple-400/50",
    iconColor: "text-purple-600",
  },
  {
    icon: Package,
    title: "NFT OWNERSHIP",
    description: "Win an NFT that represents your prize. Redeem it for physical delivery or trade it when our marketplace launches.",
    color: "bg-pastel-yellow",
    borderColor: "border-yellow-400/50",
    iconColor: "text-yellow-700",
  },
];

const steps = [
  { num: "01", title: "Connect Wallet", desc: "Link your Solana wallet to get started" },
  { num: "02", title: "Choose a Machine", desc: "Browse available games and their prizes" },
  { num: "03", title: "Play the Claw", desc: "Control the claw and grab your prize" },
  { num: "04", title: "Win & Redeem", desc: "Claim your NFT and ship the physical prize" },
];

const tokenomics = [
  { label: "Play-to-Earn", value: "70%", desc: "Distributed as prizes" },
  { label: "Treasury", value: "15%", desc: "Platform operations" },
  { label: "Development", value: "10%", desc: "Ongoing improvements" },
  { label: "Marketing", value: "5%", desc: "Growth & partnerships" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10 pointer-events-none bg-cloud-tile" />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <motion.div
          className="text-center max-w-3xl mx-auto"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border-2 border-[#111827] mb-6"
            style={{ boxShadow: "3px 4px 0 #8ECCC1" }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="w-4 h-4 text-pastel-coral" />
            <span className="text-sm font-bold text-[#111827]">THE FUTURE OF ARCADE GAMING</span>
            <Sparkles className="w-4 h-4 text-pastel-coral" />
          </motion.div>

          <h1 className="font-display text-5xl md:text-7xl text-pastel-coral text-outline-xl mb-6">
            WHAT IS GRABBIT?
          </h1>
          
          <p className="text-lg md:text-xl text-pastel-text leading-relaxed mb-8">
            Grabbit brings the excitement of claw machines to the blockchain.
            Play with your favorite tokens, win real physical prizes, and own your rewards as NFTs.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <CTAButton variant="orange" size="lg" href="/">
              PLAY NOW
            </CTAButton>
            <CTAButton variant="pink" size="lg" href="/partnership">
              BECOME A PARTNER
            </CTAButton>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-12">
        <motion.h2
          className="font-display text-3xl md:text-4xl text-center text-[#111827] mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          WHY GRABBIT?
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl overflow-hidden"
              style={{
                border: "2px solid #111827",
                borderRight: "4px solid #111827",
                borderBottom: "5px solid #111827",
              }}
            >
              <div className="p-6 flex gap-4">
                <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center border-2 ${feature.borderColor} shrink-0`}>
                  <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-display text-lg text-[#111827] mb-1">{feature.title}</h3>
                  <p className="text-sm text-pastel-textLight">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{
              border: "2px solid #111827",
              borderRight: "4px solid #111827",
              borderBottom: "5px solid #111827",
            }}
          >
            <div className="bg-pastel-mint px-6 py-4 border-b-2 border-[#111827] flex items-center gap-3">
              <Zap className="w-5 h-5 text-emerald-700" />
              <h2 className="font-display text-xl text-[#111827]">HOW IT WORKS</h2>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-4 gap-4">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.num}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="text-center"
                  >
                    <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-[#E9EEF2] border-2 border-[#111827] flex items-center justify-center">
                      <span className="font-display text-2xl text-pastel-coral">{step.num}</span>
                    </div>
                    <h4 className="font-bold text-[#111827] mb-1">{step.title}</h4>
                    <p className="text-xs text-pastel-textLight">{step.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Tokenomics */}
      <section className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{
              border: "2px solid #111827",
              borderRight: "4px solid #111827",
              borderBottom: "5px solid #111827",
            }}
          >
            <div className="bg-pastel-yellow px-6 py-4 border-b-2 border-[#111827] flex items-center gap-3">
              <Coins className="w-5 h-5 text-yellow-700" />
              <h2 className="font-display text-xl text-[#111827]">TOKENOMICS</h2>
            </div>

            <div className="p-6">
              <p className="text-pastel-text mb-6 text-center">
                Each game uses its own community token. Revenue is distributed back to the ecosystem.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tokenomics.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="text-center p-4 rounded-xl bg-[#E9EEF2] border-2 border-[#111827]"
                  >
                    <div className="font-display text-3xl text-pastel-coral mb-1">{item.value}</div>
                    <div className="font-bold text-sm text-[#111827]">{item.label}</div>
                    <div className="text-xs text-pastel-textLight mt-1">{item.desc}</div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-xl bg-pastel-mint/30 border border-pastel-mint">
                <div className="flex items-start gap-3">
                  <Trophy className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-[#111827]">Player-First Economy</p>
                    <p className="text-sm text-pastel-textLight">
                      70% of all revenue goes directly to prizes. The more people play, the bigger the prize pool grows.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <div
            className="bg-white rounded-2xl overflow-hidden p-8"
            style={{
              border: "2px solid #111827",
              borderRight: "4px solid #111827",
              borderBottom: "5px solid #111827",
            }}
          >
            <motion.div
              className="w-20 h-20 mx-auto mb-4 rounded-xl bg-pastel-coral border-2 border-[#111827] flex items-center justify-center"
              style={{ boxShadow: "4px 4px 0 #111827" }}
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Rocket className="w-10 h-10 text-white" />
            </motion.div>
            
            <h2 className="font-display text-3xl text-[#111827] mb-3">READY TO PLAY?</h2>
            <p className="text-pastel-textLight mb-6">
              Connect your wallet and try your luck at the claw machine. Real prizes await!
            </p>
            
            <CTAButton variant="orange" size="lg" href="/">
              START PLAYING
            </CTAButton>
          </div>
        </motion.div>
      </section>

      {/* Footer spacing */}
      <div className="h-12" />
    </div>
  );
}
