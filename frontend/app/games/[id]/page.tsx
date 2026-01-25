/**
 * Game Detail Page
 *
 * Route: /games/[id]
 * Shows game details and a placeholder Play action.
 * Pastel kawaii style.
 */

"use client";

import ClawMachine3D from "@/components/game/ClawMachine3D";
import ArcadeCard from "@/components/ui/ArcadeCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Loading from "@/components/ui/Loading";
import PrizeDetailModal, { type Prize as PrizeModalData } from "@/components/ui/PrizeDetailModal";
import { toast } from "@/components/ui/Toast";
import { usePlayEvents } from "@/hooks/api/usePaymentVerification";
import { useTokenCost } from "@/hooks/useTokenCost";
import { gamesApi } from "@/services/api/games";
import type { Game } from "@/types/game/game";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
// claimPrize removed - NFTs are now auto-minted in finalize_play

// Time (ms) to wait after claw drops before showing win/lose screen
// Adjust this to sync with claw machine animation duration
const RESULT_SCREEN_DELAY_MS = 8000;

export default function GameDetailPage() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const gameId = Number(params?.id);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [playResult, setPlayResult] = useState<{
    status: "win" | "lose" | "pending";
    playSignature?: string;
    prize?: { id: number; prizeId: number; name: string; tier: string };
    message?: string;
  } | null>(null);
  const [playing, setPlaying] = useState<boolean>(false);
  // Store the claw outcome immediately when known (before tx confirms)
  const [clawOutcome, setClawOutcome] = useState<"win" | "lose" | null>(null);
  // Controls when to show the claw machine animation (after wallet approves)
  const [animationStarted, setAnimationStarted] = useState<boolean>(false);
  // Controls when to show the result screen (win/lose)
  const [showResultScreen, setShowResultScreen] = useState<boolean>(false);
  // Store won prize name for display
  const [wonPrizeName, setWonPrizeName] = useState<string | undefined>();
  const [wonNftMint, setWonNftMint] = useState<string | undefined>();
  const [wonPrizeImageUrl, setWonPrizeImageUrl] = useState<
    string | undefined
  >();
  const [pendingResult, setPendingResult] = useState<{
    status: "win" | "lose";
    playSignature?: string;
    message?: string;
  } | null>(null);
  // Store pending outcome until payment is verified
  const [pendingOutcome, setPendingOutcome] = useState<{
    isWin: boolean;
    prizeIndex: number | null;
    mint: Keypair;
    signature: string;
  } | null>(null);
  // Note: winSessionPda and claiming state removed - NFTs are now auto-minted
  const dropStartedRef = useRef(false);
  const resultTimerRef = useRef<NodeJS.Timeout | null>(null);
  const verificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { publicKey, connected, sendTransaction, signMessage } = useWallet();
  const { connection } = useConnection();
  
  // Prize detail modal state
  const [selectedPrize, setSelectedPrize] = useState<PrizeModalData | null>(null);

  // Handle payment verification events from indexer
  const handlePaymentVerified = useCallback(() => {
    if (!pendingOutcome) return;
    
    // Clear the fallback timeout since we got a response
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current);
      verificationTimeoutRef.current = null;
    }
    
    console.log("✅ Payment verified by indexer! Starting animation...");
    toast.success("Payment verified! Let's play!");
    
    // NOW start the animation with the known outcome
    setClawOutcome(pendingOutcome.isWin ? "win" : "lose");
    setAnimationStarted(true);
    
    // Set prize info if won
    if (
      pendingOutcome.isWin &&
      pendingOutcome.prizeIndex !== null &&
      game?.prizes?.[pendingOutcome.prizeIndex]
    ) {
      const prize = game.prizes[pendingOutcome.prizeIndex];
      setWonPrizeName(prize.name);
      setWonPrizeImageUrl(prize.imageUrl || undefined);
      setWonNftMint(pendingOutcome.mint.publicKey.toBase58());
    }
  }, [pendingOutcome, game?.prizes]);

  const handlePaymentRejected = useCallback((payload: { message: string }) => {
    // Clear the fallback timeout
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current);
      verificationTimeoutRef.current = null;
    }
    
    console.error("❌ Payment rejected by indexer:", payload.message);
    toast.error(`Payment rejected: ${payload.message}`);
    setError("Payment was insufficient. Your tokens were transferred but you cannot play.");
    setPlaying(false);
    setPlayResult(null);
    setPendingOutcome(null);
  }, []);

  const handleFinalized = useCallback((payload: {
    status: "completed" | "failed";
    prizeId: number | null;
    nftMint: string | null;
  }) => {
    if (!pendingOutcome) return;
    
    const isWin = payload.status === "completed" && payload.prizeId !== null;
    const result = {
      status: (isWin ? "win" : "lose") as "win" | "lose",
      playSignature: pendingOutcome.signature,
      message: isWin ? "You won! 🎉" : "Better luck next time!",
    };
    
    setPendingResult(result);
    if (payload.nftMint) {
      setWonNftMint(payload.nftMint);
    }
    
    if (dropStartedRef.current && !resultTimerRef.current) {
      resultTimerRef.current = setTimeout(() => {
        setPlayResult(result);
        setPlaying(false);
        setShowResultScreen(true);
        resultTimerRef.current = null;
      }, RESULT_SCREEN_DELAY_MS);
    }
  }, [pendingOutcome]);

  // Subscribe to play events when we have a pending signature
  usePlayEvents(
    pendingOutcome?.signature,
    {
      onPaymentVerified: handlePaymentVerified,
      onPaymentRejected: handlePaymentRejected,
      onFinalized: handleFinalized,
    },
    { timeoutMs: 60_000 }
  );

  // Fallback timeout: if indexer doesn't respond within 15 seconds, proceed optimistically
  useEffect(() => {
    if (!pendingOutcome || animationStarted) return;

    verificationTimeoutRef.current = setTimeout(() => {
      console.warn("⚠️ Payment verification timeout - proceeding optimistically");
      toast.warning("Verification taking longer than expected. Proceeding...");
      
      // Start animation with known outcome
      setClawOutcome(pendingOutcome.isWin ? "win" : "lose");
      setAnimationStarted(true);
      
      if (
        pendingOutcome.isWin &&
        pendingOutcome.prizeIndex !== null &&
        game?.prizes?.[pendingOutcome.prizeIndex]
      ) {
        const prize = game.prizes[pendingOutcome.prizeIndex];
        setWonPrizeName(prize.name);
        setWonPrizeImageUrl(prize.imageUrl || undefined);
        setWonNftMint(pendingOutcome.mint.publicKey.toBase58());
      }
    }, 15_000); // 15 second timeout

    return () => {
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
        verificationTimeoutRef.current = null;
      }
    };
  }, [pendingOutcome, animationStarted, game?.prizes]);

  // Dynamic token cost calculation from pump.fun price
  const costUsdCents = game?.costInUsd
    ? Number(game.costInUsd) * 100
    : undefined;
  const { tokenAmountFormatted, loading: priceLoading } = useTokenCost(
    game?.currencyTokenMintAddress,
    costUsdCents
  );

  // Handler for play action (used by both intro screen and sidebar button)
  const handlePlayOnChain = async () => {
    if (!connected || !publicKey) {
      setError("Connect your wallet first");
      return;
    }
    if (!game) {
      setError("Game data not loaded");
      return;
    }

    // Validate game has on-chain address
    const onChainAddress = (game as any).onChainAddress;
    if (!onChainAddress) {
      setError("This game is not configured for on-chain play yet");
      return;
    }

    // Clear any previous errors and reset states
    setError(null);
    setPlaying(true);
    setClawOutcome(null); // Reset for new play
    setAnimationStarted(false); // Reset animation state
    setShowResultScreen(false); // Hide result screen
    setWonPrizeName(undefined); // Clear previous prize
    setWonNftMint(undefined);
    setWonPrizeImageUrl(undefined);
    dropStartedRef.current = false;
    setPendingResult(null);
    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
    setPlayResult({ status: "pending", message: "Preparing transaction..." });

    try {
      // Step 1: Create play session and transfer tokens
      const { playOnChain } = await import("@/services/blockchain/play");

      setPlayResult({ status: "pending", message: "Fetching token price..." });

      // Use costInUsd (dollars) converted to cents for dynamic price calculation
      const playCostUsdCents = game.costInUsd ? Number(game.costInUsd) * 100 : undefined;

      if (playCostUsdCents === undefined) {
        setError("Game pricing is not configured");
        setPlaying(false);
        return;
      }

      const { tx, sessionPda, tokenAmountPaid } = await playOnChain({
        walletPublicKey: publicKey as PublicKey,
        gamePda: onChainAddress,
        costUsdCents: playCostUsdCents,
      });

      console.log(`Token amount: ${tokenAmountPaid} tokens for $${(playCostUsdCents / 100).toFixed(2)}`);
      console.log(`Session PDA: ${sessionPda.toString()}`);

      setPlayResult({
        status: "pending",
        message: "Please approve the transaction in your wallet...",
      });

      // Send the play transaction
      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
      });

      console.log("Play transaction sent:", signature);

      setPlayResult({
        status: "pending",
        playSignature: signature,
        message: "Transaction sent! Waiting for confirmation...",
      });

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, "confirmed");
      if (confirmation.value.err) {
        console.error("Transaction failed:", confirmation.value.err);
        setError(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        setPlaying(false);
        return;
      }

      console.log("Play transaction confirmed! Calling backend to finalize...");
      setPlayResult({
        status: "pending",
        playSignature: signature,
        message: "Payment confirmed! Determining outcome...",
      });

      // Step 2: Call backend to finalize play (generates randomness)
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const finalizeResponse = await fetch(`${backendUrl}/games/${game.id}/play/finalize`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-wallet-address": publicKey.toString(),
        },
        body: JSON.stringify({
          sessionPda: sessionPda.toString(),
          gamePda: onChainAddress,
        }),
      });

      if (!finalizeResponse.ok) {
        const errorData = await finalizeResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Backend finalize failed: ${finalizeResponse.status}`);
      }

      const finalizeResult = await finalizeResponse.json();
      console.log("Finalize result:", finalizeResult);

      const isWin = finalizeResult.prizeIndex !== null && finalizeResult.prizeIndex !== undefined;
      const prizeIndex = finalizeResult.prizeIndex;

      // Store pending outcome for animation
      setPendingOutcome({
        isWin,
        prizeIndex,
        mint: Keypair.generate(), // Placeholder - will be set after claim
        signature,
      });

      // Set pending result so the result screen shows after animation
      setPendingResult({
        status: isWin ? "win" : "lose",
        playSignature: signature,
        message: isWin ? "You won! 🎉" : "Better luck next time!",
      });

      // Start animation with the known outcome
      setClawOutcome(isWin ? "win" : "lose");
      setAnimationStarted(true);

      if (isWin && prizeIndex !== null && game?.prizes?.[prizeIndex]) {
        const prize = game.prizes[prizeIndex];
        setWonPrizeName(prize.name);
        setWonPrizeImageUrl(prize.imageUrl || undefined);
      }
    } catch (e: unknown) {
      console.error("Play error:", e);

      // Extract meaningful error message
      let errorMessage = "Play failed";
      if (e instanceof Error) {
        const msg = e.message.toLowerCase();
        // Handle wallet rejection/cancellation
        if (
          msg.includes("user rejected") ||
          msg.includes("cancelled") ||
          msg.includes("user denied")
        ) {
          errorMessage = "Transaction cancelled by user";
        } else if (msg.includes("unexpected error")) {
          errorMessage = "Wallet error - please try reconnecting your wallet";
        } else if (msg.includes("insufficient")) {
          errorMessage = "Insufficient funds for transaction";
        } else if (
          msg.includes("not configured") ||
          msg.includes("not active")
        ) {
          errorMessage = e.message;
        } else {
          errorMessage = e.message;
        }
      }

      setError(errorMessage);
      setPlayResult(null); // Clear pending result on error
      setPlaying(false);
    }
  };

  // Handle play again - reset everything and start over
  const handlePlayAgain = () => {
    setShowResultScreen(false);
    setAnimationStarted(false);
    setClawOutcome(null);
    setPlayResult(null);
    setWonPrizeName(undefined);
    setWonNftMint(undefined);
    setWonPrizeImageUrl(undefined);
    dropStartedRef.current = false;
    setPendingResult(null);
    setPendingOutcome(null);
    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current);
      verificationTimeoutRef.current = null;
    }
    // Small delay to reset the intro screen
    setTimeout(() => {
      // The intro screen will show again
    }, 100);
  };

  // Fetch game data (reusable for initial load and refresh)
  const fetchGameData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const data = await gamesApi.getGame(gameId);
      setGame(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load game");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(gameId)) {
      setError("Invalid game id");
      setLoading(false);
    } else {
      fetchGameData();
    }
  }, [gameId]);

  // Refetch game data when result screen shows (to update prize supply)
  useEffect(() => {
    if (showResultScreen && playResult?.status === "win") {
      // Small delay to allow indexer to process the transaction
      const refetchTimer = setTimeout(() => {
        fetchGameData(false); // Don't show loading spinner
      }, 2000);
      return () => clearTimeout(refetchTimer);
    }
  }, [showResultScreen, playResult?.status]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loading size="lg" />
          <p className="mt-4 text-pastel-text">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">
          <h1 className="font-display text-4xl text-pastel-coral mb-4">
            ERROR
          </h1>
          <p className="text-pastel-text mb-4">{error || "Game not found"}</p>
          <Button variant="outline" onClick={() => router.push("/games")}>
            Back to Games
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Main Game Area */}
        <div>
          {/* 3D Claw Machine with Intro Screen */}
          <div className="rounded-3xl overflow-hidden shadow-card">
            <ClawMachine3D
              key={`claw-${connected}`}
              gameOutcome={clawOutcome}
              onPlay={handlePlayOnChain}
              isPlaying={playing}
              isConnected={connected}
              isActive={game.isActive}
              costDisplay={
                priceLoading
                  ? "Loading..."
                  : tokenAmountFormatted
                    ? tokenAmountFormatted
                    : "Price unavailable"
              }
              gameName={game.name}
              showIntro={true}
              loadingMessage={playResult?.message}
              animationStarted={animationStarted}
              showResult={showResultScreen}
              prizeName={wonPrizeName}
              prizeImageUrl={wonPrizeImageUrl}
              prizeMint={wonNftMint}
              userWallet={publicKey?.toBase58()}
              signMessage={signMessage}
              onPlayAgain={handlePlayAgain}
              onViewCollection={() => router.push("/collection")}
              onDropStart={() => {
                dropStartedRef.current = true;
                if (pendingResult && !resultTimerRef.current) {
                  resultTimerRef.current = setTimeout(() => {
                    setPlayResult(pendingResult);
                    setPlaying(false);
                    setShowResultScreen(true);
                    resultTimerRef.current = null;
                  }, RESULT_SCREEN_DELAY_MS);
                }
              }}
            />
          </div>

          {/* Game Info Card */}
          <ArcadeCard color="lavender" className="mt-6">
            <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/60 to-pastel-pinkLight/40 pointer-events-none" />
            <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-pastel-yellow/40 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-6 h-24 w-24 rounded-full bg-pastel-mint/40 blur-2xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                {game.isActive ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="error">Inactive</Badge>
                )}
                {typeof game.totalPlays === "number" && (
                  <span className="text-pastel-textLight text-sm">
                    {game.totalPlays.toLocaleString()} plays
                  </span>
                )}
              </div>

              <h3 className="text-xl font-display text-pastel-coral mb-4 text-outline-xl">
                PRIZES
              </h3>
              {Array.isArray(game.prizes) && game.prizes.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {game.prizes.map((p) => (
                    <Card
                      key={p.prizeId}
                      variant="arcade"
                      shadowColor="mint"
                      borderColor="mint"
                      padding="sm"
                      className="bg-pastel-sky/10 cursor-pointer hover:scale-[1.02] transition-transform"
                      onClick={() => setSelectedPrize({
                        prizeId: p.prizeId,
                        name: p.name,
                        description: p.description,
                        imageUrl: p.imageUrl,
                        tier: p.tier,
                        probabilityBasisPoints: p.probabilityBasisPoints,
                        supplyRemaining: p.supplyRemaining,
                        supplyTotal: p.supplyTotal,
                      })}
                    >
                      <div className="flex gap-3 items-start">
                        <div className="h-20 w-20 rounded-xl border-2 border-pastel-pink/40 bg-pastel-pinkLight/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl">⭐</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-pastel-text font-semibold">
                              {p.name}
                            </span>
                            <Badge variant={p.tier as any} size="sm">
                              {p.tier}
                            </Badge>
                          </div>
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[11px] text-pastel-textLight">
                              <span>Remaining</span>
                              <span>
                                {p.supplyRemaining}/{p.supplyTotal}
                              </span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-pastel-pinkLight/70 border border-pastel-pink/30 overflow-hidden">
                              <div
                                className="h-full bg-pastel-mint"
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      (p.supplyRemaining / p.supplyTotal) * 100
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-pastel-textLight">No prizes found.</p>
              )}
              
              {/* Prize Detail Modal */}
              <PrizeDetailModal 
                prize={selectedPrize} 
                onClose={() => setSelectedPrize(null)} 
              />
            </div>
          </ArcadeCard>
        </div>
      </div>
    </div>
  );
}
