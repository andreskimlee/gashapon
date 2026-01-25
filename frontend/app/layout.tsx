import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import SolanaWalletProvider from "@/components/wallet/SolanaWalletProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import "@solana/wallet-adapter-react-ui/styles.css";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grabbit - Play Games, Win NFTs, Redeem Prizes",
  description: "A blockchain-based gachapon platform on Solana. Play games, win NFTs, and redeem physical prizes.",
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
      <body className="font-sans antialiased min-h-screen bg-cloud-tile">
        <QueryProvider>
          <SolanaWalletProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="relative flex-1">{children}</main>
              <Footer />
            </div>
          </SolanaWalletProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
