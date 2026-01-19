"use client";

import Card from "@/components/ui/Card";
import CTAButton from "@/components/ui/CTAButton";
import { motion } from "framer-motion";

export type RedemptionSuccessScreenProps = {
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  estimatedDelivery?: string;
  onPlayAgain?: () => void;
  onViewCollection?: () => void;
};

export function RedemptionSuccessScreen({
  trackingNumber,
  trackingUrl,
  carrier,
  estimatedDelivery,
  onPlayAgain,
  onViewCollection,
}: RedemptionSuccessScreenProps) {
  // Format estimated delivery date
  const formattedDelivery = estimatedDelivery
    ? new Date(estimatedDelivery).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null;

  // Confetti particles
  const confetti = Array.from({ length: 30 }).map((_, i) => (
    <motion.div
      key={i}
      initial={{
        y: -50,
        x: Math.random() * 300 - 150,
        opacity: 0,
        rotate: Math.random() * 360,
      }}
      animate={{
        y: 600,
        x: Math.random() * 300 - 150,
        opacity: [0, 1, 1, 0],
        rotate: Math.random() * 720 + 360,
      }}
      transition={{
        duration: 4 + Math.random() * 2,
        delay: Math.random() * 0.5,
        repeat: Infinity,
        ease: "linear",
      }}
      className="absolute w-2 h-2 rounded-full"
      style={{
        backgroundColor: ["#F7ABAD", "#A1E5CC", "#FFE5A0", "#B8E4F0", "#E8D5F2"][
          Math.floor(Math.random() * 5)
        ],
        left: `${Math.random() * 100}%`,
      }}
    />
  ));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-pastel-mint via-pastel-sky to-pastel-lavender" />

      {/* Confetti */}
      {confetti}

      {/* Success card */}
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
      >
        <Card
          variant="arcade"
          shadowColor="mint"
          padding="xl"
          className="relative z-10 mx-4 w-full max-w-md text-center"
        >
          {/* Success icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
            className="mx-auto mb-4 w-20 h-20 rounded-full bg-pastel-mint flex items-center justify-center border-4 border-white shadow-lg"
          >
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="font-display text-3xl text-pastel-coral mb-2 text-outline-xl"
          >
            ORDER CONFIRMED
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-pastel-text text-sm mb-6"
          >
            Your prize is on its way! 🎉
          </motion.p>

          {/* Shipping info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white/60 rounded-xl p-4 mb-6 text-left space-y-3"
          >
            {trackingNumber && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-pastel-textLight">Tracking #</span>
                <span className="text-sm font-bold text-pastel-text font-mono">
                  {trackingNumber}
                </span>
              </div>
            )}

            {carrier && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-pastel-textLight">Carrier</span>
                <span className="text-sm font-bold text-pastel-text uppercase">
                  {carrier.replace(/_/g, " ")}
                </span>
              </div>
            )}

            {formattedDelivery && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-pastel-textLight">
                  Est. Delivery
                </span>
                <span className="text-sm font-bold text-pastel-text">
                  {formattedDelivery}
                </span>
              </div>
            )}
          </motion.div>

          {/* Track button */}
          {trackingUrl && (
            <motion.a
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block mb-4"
            >
              <CTAButton variant="orange" size="sm" className="w-full">
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  TRACK ON UPS
                </span>
              </CTAButton>
            </motion.a>
          )}

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="grid grid-cols-2 gap-2"
          >
            {onPlayAgain && (
              <CTAButton variant="pink" size="xs" onClick={onPlayAgain}>
                PLAY AGAIN
              </CTAButton>
            )}
            {onViewCollection && (
              <CTAButton variant="pink" size="xs" onClick={onViewCollection}>
                MY COLLECTION
              </CTAButton>
            )}
          </motion.div>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-4 text-xs text-pastel-textLight"
          >
            You&apos;ll receive an email when your package ships
          </motion.p>
        </Card>
      </motion.div>
    </motion.div>
  );
}
