/**
 * Game Detail Page
 *
 * Route: /games/[id]
 * Shows game details and a placeholder Play action.
 */

"use client";

import ArcadeCard from "@/components/ui/ArcadeCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Loading from "@/components/ui/Loading";
import NeonSign from "@/components/ui/NeonSign";
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
          <p className="mt-4 text-white/70">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">
          <NeonSign color="pink" className="text-4xl mb-4">
            ERROR
          </NeonSign>
          <p className="text-white/80 mb-4">{error || "Game not found"}</p>
          <Button variant="outline" onClick={() => router.push("/games")}>
            Back to Games
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <NeonSign color="cyan" className="text-4xl md:text-5xl" flicker={false}>
          {game.name}
        </NeonSign>
        <p className="text-white/70 mt-2">
          {game.description || "No description"}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <ArcadeCard className="md:col-span-2 overflow-hidden">
          {game.imageUrl ? (
            <img
              src={game.imageUrl}
              alt={game.name}
              className="w-full h-72 object-cover"
            />
          ) : (
            <div className="w-full h-72 arcade-gradient-soft flex items-center justify-center text-6xl">
              🎮
            </div>
          )}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              {game.isActive ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="error">Inactive</Badge>
              )}
              {typeof game.totalPlays === "number" && (
                <span className="text-white/60 text-sm">
                  {game.totalPlays.toLocaleString()} plays
                </span>
              )}
            </div>
            <h3 className="text-xl text-white mb-2">Prizes</h3>
            {Array.isArray(game.prizes) && game.prizes.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-3">
                {game.prizes.map((p) => (
                  <div
                    key={p.prizeId}
                    className="rounded-lg border border-white/10 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{p.name}</span>
                      <Badge variant={p.tier as any} size="sm">
                        {p.tier}
                      </Badge>
                    </div>
                    <div className="text-white/60 text-xs mt-1">
                      Odds: {(p.probabilityBasisPoints / 100).toFixed(2)}% ·
                      Remaining: {p.supplyRemaining}/{p.supplyTotal}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/60">No prizes found.</p>
            )}
          </div>
        </ArcadeCard>

        <ArcadeCard className="p-6 h-fit">
          <h3 className="text-xl text-white mb-2">Play</h3>
          <p className="text-white/70 text-sm mb-4">
            Playing from the UI will be enabled after integrating the on-chain
            flow or backend play API.
          </p>
          <div className="flex flex-col gap-2">
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
                  const pollSignature = await sendTransaction(tx, connection, {
                    skipPreflight: false,
                  });
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
              <div className="rounded-lg border border-white/10 p-3">
                <div className="text-white">
                  {(() => {
                    const status = playResult.status ?? "pending";
                    const color =
                      status === "win"
                        ? "text-green-400"
                        : status === "lose"
                          ? "text-red-400"
                          : "text-white/60";
                    return (
                      <>
                        Result:{" "}
                        <span className={color}>
                          {String(status).toUpperCase()}
                        </span>
                      </>
                    );
                  })()}
                </div>
                {playResult.playSignature && (
                  <div className="text-white/60 text-xs mt-1 break-all">
                    Tx: {playResult.playSignature}{" "}
                    <a
                      className="underline text-neon-cyan"
                      href={`https://explorer.solana.com/tx/${playResult.playSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      (view)
                    </a>
                  </div>
                )}
                {playResult.prize && (
                  <div className="text-white/80 text-sm mt-1">
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
                  <div className="text-white/60 text-sm mt-1">
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
  );
}
