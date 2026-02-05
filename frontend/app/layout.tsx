import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { Toaster } from "@/components/ui/Toast/Toaster";
import SolanaWalletProvider from "@/components/wallet/SolanaWalletProvider";
import { SoundProvider } from "@/contexts/SoundContext";
import { QueryProvider } from "@/providers/QueryProvider";
import "@solana/wallet-adapter-react-ui/styles.css";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grabbit - Play Games, Win NFTs, Redeem Prizes",
  description:
    "A blockchain-based gachapon platform on Solana. Play games, win NFTs, and redeem physical prizes.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-sans">
      <head>
        {/* Preload audio files for faster playback */}
        <link
          rel="preload"
          href="/sound/background_music.mp3"
          as="audio"
          type="audio/mpeg"
        />
        <link
          rel="preload"
          href="/sound/button_press.wav"
          as="audio"
          type="audio/wav"
        />
        <link
          rel="preload"
          href="/sound/nav_press.wav"
          as="audio"
          type="audio/wav"
        />
      </head>
      <body className="font-sans antialiased min-h-screen bg-cloud-tile">
        <QueryProvider>
          <SolanaWalletProvider>
            <SoundProvider>
              <LayoutWrapper>{children}</LayoutWrapper>
              <Toaster />
            </SoundProvider>
          </SolanaWalletProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
