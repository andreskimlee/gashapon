"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import HolographicCard from "@/components/collection/HolographicCard";
import RedeemModal from "@/components/collection/RedeemModal";
import Card from "@/components/ui/Card";
import CTAButton from "@/components/ui/CTAButton";
import { toast } from "@/components/ui/Toast";
import {
  useCollection,
  useInvalidateCollection,
} from "@/hooks/api/useCollection";
import { gamesApi } from "@/services/api/games";
import { claimPrize } from "@/services/blockchain/play";
import type { NFT } from "@/types/api/nfts";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

// Empty state component
function EmptyState() {
  return (
    <motion.div
      className="flex justify-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card variant="arcade" shadowColor="pink" padding="xl" className="max-w-md text-center">
        <motion.div
          className="h-[280px] relative mx-auto -mb-12"
          animate={{
            y: [0, -10, 0],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image
            src="/images/collections/empty-collection.png"
            alt="No prizes yet"
            fill
            className="object-contain"
          />
        </motion.div>
        <h3 className="font-display text-3xl text-pastel-coral text-outline-xl mb-3">
          NO PRIZES YET!
        </h3>
        <p className="text-pastel-textLight mb-6">
          Your collection is waiting to be filled with amazing prizes. Play the
          Grabbit machines to win exclusive collectibles!
        </p>
        <Link href="/">
          <CTAButton variant="orange" size="lg">
            PLAY NOW <ArrowRight className="w-5 h-5 ml-2 inline" />
          </CTAButton>
        </Link>
      </Card>
    </motion.div>
  );
}

// Connect wallet prompt
function ConnectWalletPrompt() {
  return (
    <motion.div
      className="flex justify-center py-8"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card variant="arcade" shadowColor="pink" padding="xl" className="max-w-md text-center">
        <motion.div
          className="h-[280px] relative mx-auto -mb-12"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image
            src="/images/collections/empty-collection.png"
            alt="Connect wallet"
            fill
            className="object-contain"
          />
        </motion.div>
        <h2 className="font-display text-3xl text-pastel-coral mb-4 text-outline-xl">
          CONNECT YOUR WALLET
        </h2>
        <p className="text-pastel-textLight">
          Connect your Solana wallet to view your prize collection and redeem for
          physical delivery.
        </p>
      </Card>
    </motion.div>
  );
}

// NFT Card content
function NFTCardContent({
  nft,
  onRedeem,
  onClaim,
  isClaiming,
}: {
  nft: NFT;
  onRedeem: () => void;
  onClaim?: () => void;
  isClaiming?: boolean;
}) {
  const isPending = nft.isPending === true;

  return (
    <div className="flex flex-col h-full">
      {/* Image */}
      <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-[#E9EEF2] border-2 border-[#111827] relative">
        {nft.imageUrl ? (
          <img
            src={nft.imageUrl}
            alt={nft.name || "Prize"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl">🎁</span>
          </div>
        )}
        {/* Pending badge */}
        {isPending && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full animate-pulse">
            NEW
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="font-display text-lg text-[#111827] mb-1 line-clamp-1">
        {nft.name?.toUpperCase() || `PRIZE #${nft.prizeId}`}
      </h3>

      {/* Tier badge */}
      {nft.tier && (
        <div className="mb-2">
          <span
            className={`
            inline-block px-2 py-0.5 rounded text-xs font-bold uppercase
            ${nft.tier === "legendary" ? "bg-amber-100 text-amber-700 border border-amber-300" : ""}
            ${nft.tier === "rare" ? "bg-purple-100 text-purple-700 border border-purple-300" : ""}
            ${nft.tier === "uncommon" ? "bg-teal-100 text-teal-700 border border-teal-300" : ""}
            ${nft.tier === "common" ? "bg-gray-100 text-gray-600 border border-gray-300" : ""}
          `}
          >
            {nft.tier}
          </span>
        </div>
      )}

      {/* Mint address - show "Pending claim" for unclaimed */}
      <p className="text-xs text-pastel-textLight mb-3 font-mono truncate">
        {isPending
          ? "Pending on-chain claim"
          : `${nft.mintAddress.slice(0, 8)}...${nft.mintAddress.slice(-6)}`}
      </p>

      {/* Action */}
      {isPending ? (
        <CTAButton
          variant="orange"
          size="sm"
          className="mt-auto w-full"
          disabled={isClaiming}
          onClick={(e) => {
            e.stopPropagation();
            onClaim?.();
          }}
        >
          {isClaiming ? "CLAIMING..." : "CLAIM NFT"}
        </CTAButton>
      ) : !nft.isRedeemed ? (
        <CTAButton
          variant="pink"
          size="sm"
          className="mt-auto w-full"
          onClick={(e) => {
            e.stopPropagation();
            onRedeem();
          }}
        >
          REDEEM
        </CTAButton>
      ) : (
        <div className="mt-auto">
          <div className="px-3 py-2 rounded-lg bg-pastel-mint/30 border border-pastel-mint text-center">
            <span className="text-xs font-bold text-emerald-600">
              ✓ REDEEMED
            </span>
          </div>
          {nft.redeemedAt && (
            <p className="mt-1 text-xs text-pastel-textLight text-center">
              {new Date(nft.redeemedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CollectionPage() {
  const { publicKey, connected, signMessage, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "unredeemed" | "redeemed">(
    "all",
  );
  const [claimingNft, setClaimingNft] = useState<string | null>(null);

  const walletAddress = publicKey?.toBase58();

  // Use React Query for caching and automatic state management
  const { data: nfts = [], isLoading: loading } = useCollection(walletAddress, {
    enabled: connected,
  });
  const { invalidateForWallet } = useInvalidateCollection();

  const unredeemed = useMemo(() => nfts.filter((n) => !n.isRedeemed), [nfts]);
  const redeemed = useMemo(() => nfts.filter((n) => n.isRedeemed), [nfts]);

  const filteredNFTs = useMemo(() => {
    switch (activeTab) {
      case "unredeemed":
        return unredeemed;
      case "redeemed":
        return redeemed;
      default:
        return nfts;
    }
  }, [activeTab, nfts, unredeemed, redeemed]);

  // Handle claiming a pending NFT
  const handleClaimNft = useCallback(
    async (nft: NFT) => {
      if (!publicKey || !nft.sessionPda) {
        toast.error("Cannot claim: missing wallet or session data");
        return;
      }

      const sessionPda = nft.sessionPda || nft.mintAddress.slice(8); // Extract from "pending:<sessionPda>"

      setClaimingNft(nft.mintAddress);
      toast.info("Preparing claim transaction...");

      try {
        // Fetch game data to get on-chain address and prize index
        const game = await gamesApi.getGame(nft.gameId);
        if (!game?.onChainAddress) {
          throw new Error("Game not found or not deployed on-chain");
        }

        // Find the prize to get its index
        const prize = game.prizes?.find((p) => p.prizeId === nft.prizeId);
        if (!prize) {
          throw new Error("Prize not found");
        }

        // Build and sign claim transaction
        const { tx, mint } = await claimPrize({
          walletPublicKey: publicKey,
          gamePda: game.onChainAddress,
          sessionPda: sessionPda,
          prizeIndex: prize.prizeId, // prizeId is used as the on-chain index
        });

        toast.info("Please approve the transaction in your wallet...");
        const signature = await sendTransaction(tx, connection);

        toast.info("Confirming transaction...");
        await connection.confirmTransaction(signature, "confirmed");

        toast.success(
          `NFT claimed! Mint: ${mint.publicKey.toBase58().slice(0, 8)}...`,
        );

        // Refresh collection after short delay for indexer to process
        setTimeout(() => {
          if (walletAddress) {
            invalidateForWallet(walletAddress);
          }
        }, 3000);
      } catch (error) {
        console.error("Claim error:", error);
        const message = error instanceof Error ? error.message : "Claim failed";
        if (message.includes("rejected") || message.includes("cancelled")) {
          toast.warning("Transaction cancelled");
        } else {
          toast.error(message);
        }
      } finally {
        setClaimingNft(null);
      }
    },
    [
      publicKey,
      connection,
      sendTransaction,
      walletAddress,
      invalidateForWallet,
    ],
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background - matches home page cloud tile */}
      <div className="absolute inset-0 -z-10 pointer-events-none bg-cloud-tile" />

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border-2 border-[#111827] mb-6"
            style={{ boxShadow: "3px 4px 0 #8ECCC1" }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="w-4 h-4 text-pastel-coral" />
            <span className="text-sm font-bold text-[#111827]">
              YOUR PRIZE VAULT
            </span>
            <Sparkles className="w-4 h-4 text-pastel-coral" />
          </motion.div>

          <h1 className="font-display text-5xl md:text-6xl text-pastel-coral text-outline-xl mb-4">
            MY COLLECTION
          </h1>
          <p className="text-pastel-text max-w-lg mx-auto">
            Your exclusive Grabbit prizes. Each one is a unique NFT that can be
            redeemed for physical delivery.
          </p>
        </motion.div>

        {!connected ? (
          <ConnectWalletPrompt />
        ) : (
          <>
            {/* Filter Tabs */}
            {nfts.length > 0 && (
              <motion.div
                className="flex justify-center gap-3 mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {(["all", "unredeemed", "redeemed"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      px-5 py-2 rounded-full font-bold text-sm transition-all duration-200
                      border-2 border-[#111827]
                      ${
                        activeTab === tab
                          ? "bg-pastel-coral text-white"
                          : "bg-white text-[#111827] hover:bg-pastel-pinkLight"
                      }
                    `}
                    style={{
                      boxShadow:
                        activeTab === tab
                          ? "3px 4px 0 #111827"
                          : "2px 3px 0 #111827",
                    }}
                  >
                    {tab === "all"
                      ? "ALL"
                      : tab === "unredeemed"
                        ? "UNREDEEMED"
                        : "REDEEMED"}
                    <span className="ml-1 opacity-70">
                      (
                      {tab === "all"
                        ? nfts.length
                        : tab === "unredeemed"
                          ? unredeemed.length
                          : redeemed.length}
                      )
                    </span>
                  </button>
                ))}
              </motion.div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <motion.div
                  className="w-12 h-12 rounded-full border-4 border-pastel-coral/30 border-t-pastel-coral"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
            )}

            {/* Empty State */}
            {!loading && nfts.length === 0 && <EmptyState />}

            {/* NFT Grid */}
            {!loading && filteredNFTs.length > 0 && (
              <motion.div
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <AnimatePresence mode="popLayout">
                  {filteredNFTs.map((nft, index) => (
                    <motion.div
                      key={nft.mintAddress}
                      layout
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -20 }}
                      transition={{
                        delay: index * 0.05,
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                    >
                      <HolographicCard
                        tier={nft.tier || "common"}
                        isRedeemed={nft.isRedeemed}
                      >
                        <NFTCardContent
                          nft={nft}
                          onRedeem={() => setSelectedNFT(nft)}
                          onClaim={() => handleClaimNft(nft)}
                          isClaiming={claimingNft === nft.mintAddress}
                        />
                      </HolographicCard>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Filtered empty state */}
            {!loading && nfts.length > 0 && filteredNFTs.length === 0 && (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-pastel-textLight">
                  No {activeTab === "unredeemed" ? "unredeemed" : "redeemed"}{" "}
                  prizes found.
                </p>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Redeem Modal */}
      <RedeemModal
        nft={selectedNFT}
        walletAddress={walletAddress || ""}
        signMessage={signMessage}
        onClose={() => setSelectedNFT(null)}
        onSuccess={() => {
          // Invalidate cache to trigger refetch
          if (walletAddress) {
            invalidateForWallet(walletAddress);
          }
          setSelectedNFT(null);
        }}
      />
    </div>
  );
}
