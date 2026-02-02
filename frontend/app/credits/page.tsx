"use client";

import Card from "@/components/ui/Card";
import { ExternalLink, Music } from "lucide-react";
import Link from "next/link";

export default function CreditsPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl md:text-5xl text-pastel-coral text-outline-xl mb-4">
            CREDITS
          </h1>
          <p className="text-pastel-textLight">
            Attributions and acknowledgments for resources used in Grabbit
          </p>
        </div>

        {/* Credits Content */}
        <Card variant="arcade" shadowColor="mint" padding="lg">
          {/* Music Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-pastel-lavender flex items-center justify-center border-2 border-purple-300">
                <Music className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="font-display text-xl text-[#111827]">MUSIC</h2>
            </div>

            <div className="bg-pastel-lavender/20 rounded-xl p-4 border-2 border-pastel-lavender/40">
              <p className="font-bold text-[#111827] mb-2">Background Music</p>
              <p className="text-pastel-textLight mb-3">
                &quot;Pixel Drift&quot; by Pecan Pie
              </p>
              <p className="text-sm text-pastel-textLight mb-3">
                Music from{" "}
                <a
                  href="https://uppbeat.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pastel-coral hover:underline"
                >
                  Uppbeat
                </a>{" "}
                (free for Creators!)
              </p>
              <a
                href="https://uppbeat.io/t/pecan-pie/pixel-drift"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border-2 border-[#111827] text-sm font-bold text-[#111827] hover:bg-pastel-lavender/30 transition-colors"
                style={{ boxShadow: "2px 2px 0 #111827" }}
              >
                <span>View on Uppbeat</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-dashed border-pastel-pink/30 my-6" />

          {/* Additional Credits Section - placeholder for future */}
          <div className="text-center text-pastel-textLight text-sm">
            <p>More credits will be added as we grow!</p>
            <p className="mt-2">
              Thank you to all the creators whose work makes Grabbit possible.
              💕
            </p>
          </div>
        </Card>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-pastel-coral hover:underline font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
