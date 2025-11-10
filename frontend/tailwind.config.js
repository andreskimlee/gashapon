/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Pastel arcade palette (from the claw machine)
        candy: {
          pink: "#F9C7CF",
          lightPink: "#FFDCE5",
          mint: "#B3F1E5",
          teal: "#80D3C4",
          cream: "#FFF5E1",
          yellow: "#FFD88D",
          lavender: "#E1D7FF",
          deepBlue: "#5076D1",
          white: "#FFFFFF",
          dark: "#2E2E3A",
        },
        // Neon arcade colors for glow effects
        neon: {
          pink: "#FF10F0",
          cyan: "#00FFFF",
          yellow: "#FFFF00",
          purple: "#9D4EDD",
          blue: "#4CC9F0",
          orange: "#FF6B35",
        },
        // Dark background colors
        arcade: {
          dark: "#1A0B2E",
          purple: "#2D1B4E",
          blue: "#16213E",
        },
      },
      boxShadow: {
        soft: "0 8px 24px rgba(0,0,0,0.08)",
        pill: "0 6px 0 rgba(0,0,0,0.12)",
        neon: {
          pink: "0 0 20px rgba(255, 16, 240, 0.5), 0 0 40px rgba(255, 16, 240, 0.3)",
          cyan: "0 0 20px rgba(0, 255, 255, 0.5), 0 0 40px rgba(0, 255, 255, 0.3)",
          yellow: "0 0 20px rgba(255, 255, 0, 0.5), 0 0 40px rgba(255, 255, 0, 0.3)",
          purple: "0 0 20px rgba(157, 78, 221, 0.5), 0 0 40px rgba(157, 78, 221, 0.3)",
          blue: "0 0 20px rgba(76, 201, 240, 0.5), 0 0 40px rgba(76, 201, 240, 0.3)",
        },
        glow: {
          pink: "0 0 10px rgba(255, 16, 240, 0.8), 0 0 20px rgba(255, 16, 240, 0.6), 0 0 30px rgba(255, 16, 240, 0.4)",
          cyan: "0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.6), 0 0 30px rgba(0, 255, 255, 0.4)",
        },
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "button-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        "press": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(2px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { 
            opacity: "1",
            filter: "brightness(1)",
          },
          "50%": { 
            opacity: "0.8",
            filter: "brightness(1.2)",
          },
        },
        "neon-flicker": {
          "0%, 100%": { opacity: "1" },
          "41.99%": { opacity: "1" },
          "42%": { opacity: "0" },
          "43%": { opacity: "0" },
          "43.01%": { opacity: "1" },
          "45.99%": { opacity: "1" },
          "46%": { opacity: "0" },
          "46.01%": { opacity: "1" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "button-bounce": "button-bounce .8s ease-in-out infinite",
        press: "press .08s linear forwards",
        shimmer: "shimmer 2.5s linear infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "neon-flicker": "neon-flicker 3s linear infinite",
        float: "float 3s ease-in-out infinite",
      },
      gradientColorStops: ({ theme }) => ({
        ...theme("colors"),
      }),
    },
  },
  // ensure gradient utilities are always available in first builds
  safelist: [
    { pattern: /(from|via|to)-(candy)-(pink|mint|teal|yellow|lavender|cream|deepBlue)/ },
  ],
  plugins: [],
};

