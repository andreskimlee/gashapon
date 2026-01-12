/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Pastel kawaii palette (Claw & Catch style)
        pastel: {
          sky: "#B8E4F0", // Light sky blue background
          skyLight: "#D4EEF7", // Lighter sky
          cloud: "#FFFFFF", // White clouds
          coral: "#F7ABAD", // Coral/salmon pink for buttons
          coralLight: "#F9B4AE", // Lighter coral
          pink: "#F5C6D6", // Soft pink
          pinkLight: "#FCE4EC", // Very light pink
          mint: "#A1E5CC", // Mint green
          mintLight: "#D4F0E7", // Light mint
          cream: "#FFF8E7", // Cream/off-white
          yellow: "#FFE5A0", // Soft yellow
          peach: "#FFD4B8", // Peach
          lavender: "#E0D4F7", // Soft lavender
          purple: "#D4B8E8", // Light purple
          text: "#5A5A6E", // Dark gray text
          textLight: "#8B8B9E", // Light gray text
        },
        // Keep some candy colors for compatibility
        candy: {
          pink: "#F5C6D6",
          lightPink: "#FCE4EC",
          mint: "#A1E5CC",
          teal: "#80D3C4",
          cream: "#FFF8E7",
          yellow: "#FFE5A0",
          lavender: "#E0D4F7",
          deepBlue: "#5076D1",
          white: "#FFFFFF",
          dark: "#5A5A6E",
        },
      },
      boxShadow: {
        soft: "0 4px 12px rgba(0,0,0,0.08)",
        card: "0 8px 24px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
        button: "0 4px 0 rgba(0,0,0,0.1)",
        buttonHover: "0 2px 0 rgba(0,0,0,0.1)",
        pill: "0 3px 0 rgba(0,0,0,0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      keyframes: {
        "button-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        press: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(2px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "cloud-drift": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100vw)" },
        },
      },
      animation: {
        "button-bounce": "button-bounce .8s ease-in-out infinite",
        press: "press .08s linear forwards",
        shimmer: "shimmer 2.5s linear infinite",
        float: "float 3s ease-in-out infinite",
        "cloud-drift": "cloud-drift 60s linear infinite",
      },
    },
  },
  safelist: [
    {
      pattern:
        /(from|via|to)-(pastel|candy)-(sky|coral|pink|mint|cream|yellow|lavender|peach|purple)/,
    },
    {
      pattern:
        /bg-(pastel|candy)-(sky|coral|pink|mint|cream|yellow|lavender|peach|purple)/,
    },
  ],
  plugins: [],
};
