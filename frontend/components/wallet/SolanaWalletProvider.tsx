"use client";

import { SOLANA_NETWORK, SOLANA_RPC_URL } from "@/utils/constants";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { ReactNode, useMemo } from "react";

export default function SolanaWalletProvider({
  children,
}: {
  children: ReactNode;
}) {
  const endpoint = useMemo(
    () =>
      SOLANA_RPC_URL ||
      clusterApiUrl(SOLANA_NETWORK as "devnet" | "mainnet-beta"),
    []
  );
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
