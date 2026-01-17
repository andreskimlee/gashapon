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
import { usePlayRealtime } from "@/hooks/api/usePlayRealtime";
import { useTokenCost } from "@/hooks/useTokenCost";
import { gamesApi } from "@/services/api/games";
import type { Game } from "@/types/game/game";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const dropStartedRef = useRef(false);
  const resultTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();

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
      // Build full play + finalize transaction
      // This handles token transfer + NFT minting in one transaction
      const { playAndFinalizeOnChain } = await import(
        "@/services/blockchain/play"
      );

      setPlayResult({ status: "pending", message: "Fetching token price..." });

      // Use costInUsd (cents) for dynamic price calculation via pump.fun API
      // Falls back to costInTokens if costInUsd is not available
      const costUsdCents = game.costInUsd ? Number(game.costInUsd) : undefined;

      if (costUsdCents === undefined) {
        setError("Game pricing is not configured");
        setPlaying(false);
        return;
      }

      const { tx, mint, isWin, prizeIndex, tokenAmountPaid } =
        await playAndFinalizeOnChain({
          walletPublicKey: publicKey as PublicKey,
          gamePda: onChainAddress,
          costUsdCents,
        });

      console.log(
        `Token amount calculated: ${tokenAmountPaid} tokens for $${((costUsdCents || 0) / 100).toFixed(2)}`
      );

      setPlayResult({
        status: "pending",
        message: "Please approve the transaction in your wallet...",
      });

      // Send the transaction (mint keypair already signed)
      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true, // Skip preflight to avoid simulation issues with partially signed tx
      });

      // AFTER wallet approves, set the claw outcome and start animation
      setClawOutcome(isWin ? "win" : "lose");
      setAnimationStarted(true);
      console.log("Wallet approved! Claw outcome set:", isWin ? "win" : "lose");

      setPlayResult({
        status: "pending",
        playSignature: signature,
        message: `Transaction sent! ${isWin ? "You won! 🎉" : "Better luck next time!"} Confirming...`,
      });

      // Wait for confirmation
      try {
        const confirmation = await connection.confirmTransaction(
          signature,
          "confirmed"
        );
        if (confirmation.value.err) {
          console.error("Transaction failed on-chain:", confirmation.value.err);
          setError(
            `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
          );
          setPlayResult({
            status: "pending",
            playSignature: signature,
            message: "Transaction failed on-chain. Check explorer for details.",
          });
          setPlaying(false);
          return;
        }

        // Transaction confirmed! Set the result based on actual outcome
        // Get prize name if won
        if (
          isWin &&
          prizeIndex !== undefined &&
          prizeIndex !== null &&
          game.prizes?.[prizeIndex]
        ) {
          const prize = game.prizes[prizeIndex];
          setWonPrizeName(prize.name);
          setWonPrizeImageUrl(prize.imageUrl || undefined);
          setWonNftMint(mint.publicKey.toBase58());
        }

        // Brief delay to show the claw animation, then show result screen
        // Animation takes ~12-15 seconds total, plus 2 seconds after ball drops
        const result = {
          status: (isWin ? "win" : "lose") as "win" | "lose",
          playSignature: signature,
          message: isWin
            ? `You won prize #${(prizeIndex ?? 0) + 1}! 🎉 NFT minted: ${mint.publicKey.toBase58().slice(0, 8)}...`
            : "Better luck next time!",
        };
        setPendingResult(result);
        if (dropStartedRef.current && !resultTimerRef.current) {
          resultTimerRef.current = setTimeout(() => {
            setPlayResult(result);
            setPlaying(false);
            setShowResultScreen(true);
            resultTimerRef.current = null;
          }, 11000);
        }
      } catch (confirmError) {
        console.error("Error confirming transaction:", confirmError);
        // Still set the expected result - tx may have succeeded
        if (
          isWin &&
          prizeIndex !== undefined &&
          prizeIndex !== null &&
          game.prizes?.[prizeIndex]
        ) {
          const prize = game.prizes[prizeIndex];
          setWonPrizeName(prize.name);
          setWonPrizeImageUrl(prize.imageUrl || undefined);
          setWonNftMint(mint.publicKey.toBase58());
        }
        const result = {
          status: (isWin ? "win" : "lose") as "win" | "lose",
          playSignature: signature,
          message: isWin ? "You won! 🎉" : "Better luck next time!",
        };
        setPendingResult(result);
        if (dropStartedRef.current && !resultTimerRef.current) {
          resultTimerRef.current = setTimeout(() => {
            setPlayResult(result);
            setPlaying(false);
            setShowResultScreen(true);
            resultTimerRef.current = null;
          }, 11000);
        }
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
    dropStartedRef.current = false;
    setPendingResult(null);
    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
    // Small delay to reset the intro screen
    setTimeout(() => {
      // The intro screen will show again
    }, 100);
  };

  // Subscribe for realtime result when we have a play signature
  usePlayRealtime(playResult?.playSignature, (payload) => {
    if (!payload) return;
    if (payload.status === "completed") {
      const didWin = payload.prizeId !== null;
      const result = {
        status: (didWin ? "win" : "lose") as "win" | "lose",
        playSignature: payload.transactionSignature,
        message: didWin ? "You won! 🎉" : "Better luck next time!",
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
        }, 11000);
      }
    } else if (payload.status === "failed") {
      setPlayResult((prev) => ({
        status: "pending",
        playSignature: payload.transactionSignature,
        message: "Play failed. Please try again.",
      }));
      setPlaying(false);
    }
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await gamesApi.getGame(gameId);
        setGame(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load game");
      } finally {
        setLoading(false);
      }
    };
    if (!Number.isFinite(gameId)) {
      setError("Invalid game id");
      setLoading(false);
    } else {
      load();
    }
  }, [gameId]);

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
              gameOutcome={clawOutcome}
              onPlay={handlePlayOnChain}
              isPlaying={playing}
              isConnected={connected}
              isActive={game.isActive}
              costDisplay={
                priceLoading
                  ? "Loading..."
                  : tokenAmountFormatted
                    ? `${tokenAmountFormatted} TOKENS`
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
                  }, 11000);
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
                      className="bg-pastel-sky/10"
                    >
                      <div className="flex gap-3 items-start">
                        <div className="h-20 w-20 rounded-xl border-2 border-pastel-pink/40 bg-pastel-pinkLight/50 flex items-center justify-center overflow-hidden">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="h-full w-full object-contain p-2"
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
                          <div className="text-pastel-textLight text-xs mt-1">
                            Odds: {(p.probabilityBasisPoints / 100).toFixed(2)}%
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
            </div>
          </ArcadeCard>
        </div>
      </div>
    </div>
  );
}
