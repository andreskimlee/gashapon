"use client";

/**
 * Toaster Component
 *
 * Custom styled Sonner toaster matching the kawaii pastel theme.
 * Place this in your root layout to enable toasts app-wide.
 */

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      expand={false}
      richColors={false}
      gap={12}
      offset={16}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group flex items-center gap-3 w-full max-w-md p-4 rounded-2xl shadow-card border-2 backdrop-blur-sm font-sans",
          title: "font-semibold text-sm",
          description: "text-xs opacity-90",
          actionButton:
            "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95",
          cancelButton:
            "px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95",
          closeButton:
            "!bg-white/80 !border-2 !border-current/20 hover:!bg-white transition-colors",
          // Type-specific styles
          success:
            "bg-pastel-mintLight border-pastel-mint text-pastel-text [&_[data-icon]]:text-emerald-500",
          error:
            "bg-pastel-pinkLight border-pastel-coral text-pastel-text [&_[data-icon]]:text-rose-500",
          warning:
            "bg-pastel-yellow/30 border-pastel-yellow text-pastel-text [&_[data-icon]]:text-amber-500",
          info: "bg-pastel-skyLight border-pastel-sky text-pastel-text [&_[data-icon]]:text-sky-500",
          loading:
            "bg-pastel-lavender/30 border-pastel-lavender text-pastel-text",
        },
      }}
    />
  );
}

export default Toaster;
