/**
 * Collection Page
 *
 * Displays user's NFT collection (requires wallet connection).
 * Shows unredeemed and redeemed NFTs with actions to redeem or list.
 */

"use client";

import ArcadeCard from "@/components/ui/ArcadeCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { redemptionApi } from "@/services/api/redemption";
import { usersApi } from "@/services/api/users";
import type { NFT, RedemptionRequest } from "@/types/api/nfts";
import { encryptShippingData, type ShippingData } from "@/utils/encryption";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useMemo, useState } from "react";

export default function CollectionPage() {
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [redeemingMint, setRedeemingMint] = useState<string | null>(null);
  const [shipping, setShipping] = useState<ShippingData>({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    email: "",
  });
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);

  const unredeemed = useMemo(() => nfts.filter((n) => !n.isRedeemed), [nfts]);
  const redeemed = useMemo(() => nfts.filter((n) => n.isRedeemed), [nfts]);

  const fetchCollection = async () => {
    const walletAddress = publicKey?.toBase58();
    if (!walletAddress) {
      setError("Connect your wallet to view collection");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await usersApi.getCollection(walletAddress);
      setNfts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load collection");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected && publicKey) {
      fetchCollection();
    } else {
      setNfts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  const startRedeem = (mintAddress: string) => {
    setRedeemMessage(null);
    setRedeemingMint(mintAddress);
  };

  const cancelRedeem = () => {
    setRedeemingMint(null);
    setRedeemMessage(null);
  };

  const submitRedeem = async () => {
    const walletAddress = publicKey?.toBase58();
    if (!redeemingMint || !walletAddress) return;
    setRedeemMessage("Submitting redemption...");
    try {
      // For testing, signature verification on backend is a placeholder: send any string
      const signature = `redeem-${Date.now()}`;
      const encryptedShippingData = await encryptShippingData({
        name: shipping.name,
        address: shipping.address,
        city: shipping.city,
        state: shipping.state,
        zip: shipping.zip,
        country: shipping.country,
        email: shipping.email || undefined,
      });

      const payload: RedemptionRequest = {
        nftMint: redeemingMint,
        userWallet: walletAddress,
        signature,
        encryptedShippingData,
      };

      const res = await redemptionApi.redeemNft(payload);
      if (res.success) {
        setRedeemMessage(`Redeemed! Tracking ${res.trackingNumber || "TBD"}`);
        // Refresh collection
        await fetchCollection();
      } else {
        setRedeemMessage(res.error || "Redemption failed");
      }
    } catch (e) {
      setRedeemMessage(e instanceof Error ? e.message : "Redemption failed");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">My Collection</h1>

      {!connected && (
        <div className="mb-6">
          <p className="text-white/80">
            Connect your wallet to view your collection.
          </p>
        </div>
      )}

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {/* Redeem form (inline simple panel) */}
      {redeemingMint && (
        <div className="mb-8 p-4 rounded-xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-semibold text-white">Redeem NFT</h3>
            <Button variant="outline" size="sm" onClick={cancelRedeem}>
              Close
            </Button>
          </div>
          <p className="text-white/70 text-sm mb-4">Mint: {redeemingMint}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="rounded-md px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/40"
              placeholder="Full Name"
              value={shipping.name}
              onChange={(e) =>
                setShipping((s) => ({ ...s, name: e.target.value }))
              }
            />
            <input
              className="rounded-md px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/40"
              placeholder="Email (optional)"
              value={shipping.email}
              onChange={(e) =>
                setShipping((s) => ({ ...s, email: e.target.value }))
              }
            />
            <input
              className="rounded-md px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/40 md:col-span-2"
              placeholder="Address"
              value={shipping.address}
              onChange={(e) =>
                setShipping((s) => ({ ...s, address: e.target.value }))
              }
            />
            <input
              className="rounded-md px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/40"
              placeholder="City"
              value={shipping.city}
              onChange={(e) =>
                setShipping((s) => ({ ...s, city: e.target.value }))
              }
            />
            <input
              className="rounded-md px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/40"
              placeholder="State"
              value={shipping.state}
              onChange={(e) =>
                setShipping((s) => ({ ...s, state: e.target.value }))
              }
            />
            <input
              className="rounded-md px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/40"
              placeholder="ZIP"
              value={shipping.zip}
              onChange={(e) =>
                setShipping((s) => ({ ...s, zip: e.target.value }))
              }
            />
            <input
              className="rounded-md px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/40"
              placeholder="Country"
              value={shipping.country}
              onChange={(e) =>
                setShipping((s) => ({ ...s, country: e.target.value }))
              }
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={submitRedeem}>Submit Redemption</Button>
            {redeemMessage && (
              <span className="text-white/80">{redeemMessage}</span>
            )}
          </div>
        </div>
      )}

      {/* Unredeemed */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Unredeemed</h2>
        {unredeemed.length === 0 ? (
          <p className="text-white/60">No unredeemed NFTs found.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {unredeemed.map((nft) => (
              <ArcadeCard key={nft.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-semibold">
                    {nft.name || `Prize #${nft.prizeId}`}
                  </h3>
                  {nft.tier && <Badge variant="common">{nft.tier}</Badge>}
                </div>
                <p className="text-xs text-white/60 mb-4 break-all">
                  {nft.mintAddress}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => startRedeem(nft.mintAddress)}
                  >
                    Redeem
                  </Button>
                </div>
              </ArcadeCard>
            ))}
          </div>
        )}
      </section>

      {/* Redeemed */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Redeemed</h2>
        {redeemed.length === 0 ? (
          <p className="text-white/60">No redeemed NFTs.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {redeemed.map((nft) => (
              <ArcadeCard key={nft.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-semibold">
                    {nft.name || `Prize #${nft.prizeId}`}
                  </h3>
                  <Badge variant="success">Redeemed</Badge>
                </div>
                <p className="text-xs text-white/60 break-all">
                  {nft.mintAddress}
                </p>
                {nft.redeemedAt && (
                  <p className="text-xs text-white/40 mt-2">
                    Redeemed at: {new Date(nft.redeemedAt).toLocaleString()}
                  </p>
                )}
              </ArcadeCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
