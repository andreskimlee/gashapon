"use client";

import Card from "@/components/ui/Card";
import CTAButton from "@/components/ui/CTAButton";

export type SavedScreenProps = {
  prizeName?: string;
  onPlayAgain?: () => void;
};

export function SavedScreen({ prizeName, onPlayAgain }: SavedScreenProps) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-pastel-yellow via-pastel-pinkLight to-pastel-lavender" />
      <Card
        variant="arcade"
        shadowColor="coral"
        padding="xl"
        className="relative z-10 mx-4 max-w-md text-center"
      >
        <h2 className="font-display text-3xl text-pastel-coral mb-2 text-outline-xl">
          SAVED FOR LATER
        </h2>
        {prizeName && (
          <p className="text-pastel-text text-sm mb-4">
            Your prize is waiting in your collection.
          </p>
        )}
        {onPlayAgain && (
          <CTAButton
            variant="orange"
            size="sm"
            onClick={onPlayAgain}
            className="w-full"
          >
            PLAY AGAIN
          </CTAButton>
        )}
      </Card>
    </div>
  );
}
