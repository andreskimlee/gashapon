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
        "border-y-4 border-[#111827]",
        "bg-[#BFEFFF]",
        // Fixed hero height so the machine art can be edge-to-edge vertically
        "h-[450px] md:h-[370px] lg:h-[410px]",
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

      {/* Machine art (edge-to-edge vertically) */}
      <div
        className={cn(
          "absolute inset-y-0 left-1/2 -translate-x-1/2",
          "w-[520px] md:left-0 md:translate-x-0 md:w-[420px] lg:w-[480px]",
          "pointer-events-none z-0"
        )}
        aria-hidden="true"
      >
        <Image
          src="/images/hero_machine.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 480px, (min-width: 768px) 420px, 520px"
          className="select-none object-contain object-left-bottom origin-bottom-left scale-[1.12] translate-y-[12px] md:translate-y-[14px] lg:translate-y-[16px]"
        />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 h-full">
        <div className="container mx-auto h-full px-4">
          <div className="max-w-6xl mx-auto h-full flex items-center">
            <div className="w-full md:pl-[420px] lg:pl-[480px]">
              <div className="max-w-xl ml-auto text-center md:text-left">
                <h1 className="font-display uppercase text-[42px] md:text-[56px] lg:text-[60px] leading-[0.92] tracking-wide text-outline-xl text-white">
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
      </div>
    </section>
  );
}
