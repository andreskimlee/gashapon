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
import Loading from "@/components/ui/Loading";
import { usePlayRealtime } from "@/hooks/api/usePlayRealtime";
import { gamesApi } from "@/services/api/games";
import type { Game } from "@/types/game/game";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();

  // Subscribe for realtime result when we have a play signature
  usePlayRealtime(playResult?.playSignature, (payload) => {
    if (!payload) return;
    if (payload.status === "completed") {
      const didWin = payload.prizeId !== null;
      setPlayResult((prev) => ({
        status: didWin ? "win" : "lose",
        playSignature: payload.transactionSignature,
        // Keep prize optional; details can be fetched separately if needed
        message: didWin ? "You won! 🎉" : "Better luck next time!",
      }));
      setPlaying(false);
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl md:text-4xl text-pastel-text mb-2">
          {game.name.toUpperCase()}
        </h1>
        <p className="text-pastel-textLight">
          {game.description || "No description"}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Game Area */}
        <div className="lg:col-span-2">
          {/* 3D Claw Machine */}
          <div className="rounded-3xl overflow-hidden shadow-card">
            <ClawMachine3D />
          </div>

          {/* Game Info Card */}
          <ArcadeCard color="white" className="mt-6">
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

            <h3 className="text-lg font-display text-pastel-text mb-3">
              PRIZES
            </h3>
            {Array.isArray(game.prizes) && game.prizes.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-3">
                {game.prizes.map((p) => (
                  <div
                    key={p.prizeId}
                    className="rounded-2xl border border-pastel-pink/30 bg-pastel-pinkLight/30 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-pastel-text font-medium">
                        {p.name}
                      </span>
                      <Badge variant={p.tier as any} size="sm">
                        {p.tier}
                      </Badge>
                    </div>
                    <div className="text-pastel-textLight text-xs mt-1">
                      Odds: {(p.probabilityBasisPoints / 100).toFixed(2)}% ·
                      Remaining: {p.supplyRemaining}/{p.supplyTotal}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-pastel-textLight">No prizes found.</p>
            )}
          </ArcadeCard>
        </div>

        {/* Sidebar - Play Controls */}
        <div>
          <ArcadeCard color="white" className="sticky top-4">
            <h3 className="text-lg font-display text-pastel-text mb-3">PLAY</h3>
            <p className="text-pastel-textLight text-sm mb-4">
              Playing from the UI will be enabled after integrating the on-chain
              flow or backend play API.
            </p>

            <div className="flex flex-col gap-3">
              <Button
                disabled={!game.isActive || !connected || playing}
                isLoading={playing}
                onClick={async () => {
                  if (!connected || !publicKey) {
                    setError("Connect your wallet first");
                    return;
                  }
                  try {
                    setPlaying(true);
                    setPlayResult({ status: "pending" });
                    // Build single-transaction play + finalize flow (one signature UX)
                    const { playAndFinalizeOnChain } = await import(
                      "@/services/blockchain/play"
                    );
                    const { tx, mint } = await playAndFinalizeOnChain({
                      walletPublicKey: publicKey as PublicKey,
                      gamePda: (game as any).onChainAddress || "",
                      tokenAmount: Number(game.costInTokens || 0),
                    });
                    const pollSignature = await sendTransaction(
                      tx,
                      connection,
                      {
                        skipPreflight: false,
                      }
                    );
                    setPlayResult({
                      status: "pending",
                      playSignature: pollSignature,
                      message: "Finalizing play... Listening for result.",
                    });
                    // Result will arrive via Supabase Realtime subscription
                  } catch (e) {
                    console.error("Play error:", e);
                    setError(e instanceof Error ? e.message : "Play failed");
                  } finally {
                    // keep loading until realtime message finalizes
                  }
                }}
              >
                🎮 Play On-Chain
              </Button>

              {playResult && (
                <div className="rounded-2xl border border-pastel-mint/50 bg-pastel-mintLight/30 p-3">
                  <div className="text-pastel-text text-sm">
                    {(() => {
                      const status = playResult.status ?? "pending";
                      const color =
                        status === "win"
                          ? "text-green-600"
                          : status === "lose"
                            ? "text-red-500"
                            : "text-pastel-textLight";
                      return (
                        <>
                          Result:{" "}
                          <span className={`${color} font-semibold`}>
                            {String(status).toUpperCase()}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  {playResult.playSignature && (
                    <div className="text-pastel-textLight text-xs mt-1 break-all">
                      Tx: {playResult.playSignature}{" "}
                      <a
                        className="underline text-pastel-coral hover:text-pastel-coralLight"
                        href={`https://explorer.solana.com/tx/${playResult.playSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        (view)
                      </a>
                    </div>
                  )}
                  {playResult.prize && (
                    <div className="text-pastel-text text-sm mt-1">
                      Prize: {playResult.prize.name} ({playResult.prize.tier})
                    </div>
                  )}
                  {playResult.status === "win" && (
                    <div className="mt-2">
                      <Button
                        variant="secondary"
                        onClick={() => router.push("/collection")}
                      >
                        View in My Collection
                      </Button>
                    </div>
                  )}
                  {playResult.status === "pending" && (
                    <div className="text-pastel-textLight text-sm mt-1">
                      {playResult.message || "Awaiting indexer result..."}
                    </div>
                  )}
                </div>
              )}

              <Link href="/games/test">
                <Button variant="outline" className="w-full">
                  Mint Tester (for winning plays)
                </Button>
              </Link>
              <Link href="/collection">
                <Button variant="secondary" className="w-full">
                  Go to My Collection
                </Button>
              </Link>
            </div>
          </ArcadeCard>
        </div>
      </div>
    </div>
  );
}
