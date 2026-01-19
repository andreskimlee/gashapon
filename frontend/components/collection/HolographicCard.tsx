"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useState } from "react";

interface HolographicCardProps {
  children: React.ReactNode;
  tier?: "common" | "uncommon" | "rare" | "legendary";
  isRedeemed?: boolean;
  onClick?: () => void;
  className?: string;
}

// Shadow colors matching the home cards
const tierShadowColors = {
  common: "#8ECCC1",     // Mint (like home cards)
  uncommon: "#8ECCC1",   // Mint
  rare: "#D4B8E8",       // Purple
  legendary: "#FFE5A0",  // Yellow/gold
};

export default function HolographicCard({
  children,
  tier = "common",
  isRedeemed = false,
  onClick,
  className = "",
}: HolographicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Mouse position for 3D effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring animation
  const springConfig = { stiffness: 150, damping: 15, mass: 0.1 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  const shadowColor = tierShadowColors[tier];

  return (
    <motion.div
      ref={cardRef}
      className={`relative cursor-pointer perspective-1000 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Card container with arcade-style border */}
      <div
        className="relative overflow-hidden rounded-2xl bg-white"
        style={{
          border: '2px solid #111827',
          borderRight: '4px solid #111827',
          borderBottom: '5px solid #111827',
          boxShadow: `6px 8px 0 ${shadowColor}`,
        }}
      >
        {/* Subtle holographic shine on hover */}
        {isHovered && !isRedeemed && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            style={{
              background: `
                linear-gradient(
                  ${135 + mouseX.get() * 45}deg,
                  rgba(255,255,255,0) 0%,
                  rgba(255,255,255,0.8) 50%,
                  rgba(255,255,255,0) 100%
                )
              `,
            }}
          />
        )}

        {/* Redeemed overlay - subtle grey tint, no blur */}
        {isRedeemed && (
          <div className="absolute inset-0 bg-gray-200/50 z-10" />
        )}

        {/* Card content */}
        <div className="relative z-0 p-4">
          {children}
        </div>

        {/* Tier indicator line at top */}
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{ 
            background: tier === 'legendary' 
              ? 'linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24)' 
              : tier === 'rare'
                ? 'linear-gradient(90deg, #a855f7, #7c3aed, #a855f7)'
                : tier === 'uncommon'
                  ? 'linear-gradient(90deg, #2dd4bf, #14b8a6, #2dd4bf)'
                  : 'transparent'
          }}
        />
      </div>
    </motion.div>
  );
}
