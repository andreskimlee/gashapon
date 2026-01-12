import type { Metadata } from "next";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import Header from "@/components/layout/Header";
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
      <body className="font-sans antialiased relative min-h-screen">
        {/* Pastel sky background with clouds */}
        <div className="fixed inset-0 bg-cloud-tile -z-10" />
        
        <SolanaWalletProvider>
          <Header />
          <main className="relative z-10">{children}</main>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
