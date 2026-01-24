/**
 * Home Hero Section (reference-inspired)
 *
 * Uses layered static images (no Three.js):
 * - cloud.png as the repeating background
 * - hero_machine.png as a full-height hero illustration (edge-to-edge vertically)
 */

"use client";

import CTAButton from "@/components/ui/CTAButton";
import { cn } from "@/utils/helpers";
import Image from "next/image";

export default function HeroSection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "relative w-full overflow-hidden",
        "border-b-4 border-[#111827]",
        "bg-[#BFEFFF]",
        // Fixed hero height - increased to fit larger machine
        "h-[500px] md:h-[480px] lg:h-[520px]",
        className
      )}
    >
      {/* Cloud background (tiled) */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundColor: "#BFEFFF",
          backgroundImage: "url('/images/cloud.png')",
          backgroundRepeat: "repeat",
          // Scale down the tile so it feels like a pattern instead of a single giant image
          backgroundSize: "768px 512px",
          backgroundPosition: "center top",
        }}
      />

      {/* Machine art - positioned behind text on mobile, beside on desktop */}
      <div
        className={cn(
          "absolute pointer-events-none",
          // Mobile: centered, behind text
          "left-1/2 -translate-x-1/2 w-[340px] h-[520px]",
          // Desktop: left-aligned, larger
          "md:left-8 md:translate-x-0 md:w-[480px] md:h-[680px]",
          "lg:left-12 lg:w-[550px] lg:h-[750px]",
          // Push down so it gets clipped at bottom
          "-bottom-24 md:-bottom-48 lg:-bottom-56",
          "z-0" // Behind the text
        )}
        aria-hidden="true"
      >
        <Image
          src="/images/hero-machine.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 550px, (min-width: 768px) 480px, 340px"
          className="select-none object-contain object-bottom"
        />
      </div>

      {/* Content container - text floats above machine on mobile */}
      <div className="relative z-10 h-full">
        <div className="container mx-auto h-full px-4">
          <div className="max-w-4xl mx-auto h-full flex items-center justify-center md:justify-end">
            {/* Text content - centered on mobile, right on desktop */}
            <div className="text-center md:text-right max-w-md">
              <h1 className="font-display uppercase text-[36px] md:text-[48px] lg:text-[56px] leading-[0.92] tracking-wide text-outline-xl text-white drop-shadow-lg">
                <span className="text-white">WIN </span>
                <span className="text-[#F59E0B]">REAL </span>
                <span className="text-white">PRIZES ONLINE!</span>
              </h1>
              <div className="mt-6">
                <CTAButton href="/games" size="lg">
                  PLAY NOW
                </CTAButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
