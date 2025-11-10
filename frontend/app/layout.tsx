import type { Metadata } from "next";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import Header from "@/components/layout/Header";
import Navigation from "@/components/layout/Navigation";
import SolanaWalletProvider from "@/components/wallet/SolanaWalletProvider";

export const metadata: Metadata = {
  title: "Gachapon - Play Games, Win NFTs, Redeem Prizes",
  description: "A blockchain-based gachapon platform on Solana. Play games, win NFTs, and redeem physical prizes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-sans">
      <body className="font-sans antialiased relative min-h-screen bg-transparent">
        {/* Full-screen vaporwave gradient background - covers everything */}
        <div className="fixed inset-0 vaporwave-gradient -z-10" />
        
        {/* Scanline overlay for retro CRT effect */}
        <div className="fixed inset-0 scanlines pointer-events-none z-50" />
        
        <SolanaWalletProvider>
          <Header />
          <Navigation />
          <main className="relative z-10">{children}</main>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
