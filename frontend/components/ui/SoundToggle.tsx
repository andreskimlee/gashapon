"use client";

import { useSound } from "@/contexts/SoundContext";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

export default function SoundToggle() {
  const { isSoundEnabled, toggleSound, startBackgroundMusic } = useSound();

  const handleClick = () => {
    if (!isSoundEnabled) {
      // When enabling sound, also start background music
      startBackgroundMusic();
    }
    toggleSound();
  };

  return (
    <motion.button
      onClick={handleClick}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-[#111827] transition-colors"
      style={{ boxShadow: "2px 2px 0 #111827" }}
      whileHover={{
        y: -2,
        transition: { type: "spring", stiffness: 400 },
      }}
      whileTap={{ scale: 0.9, y: 1 }}
      aria-label={isSoundEnabled ? "Mute sound" : "Enable sound"}
      title={isSoundEnabled ? "Sound On" : "Sound Off"}
    >
      {isSoundEnabled ? (
        <Volume2 className="w-5 h-5 text-pastel-coral" />
      ) : (
        <VolumeX className="w-5 h-5 text-pastel-text/50" />
      )}
    </motion.button>
  );
}
