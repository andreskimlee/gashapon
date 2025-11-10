/**
 * Play Mint Tester
 *
 * Minimal utility page to mint an NFT for a winning play using its transaction signature.
 * This lets you test the win path end-to-end: play off-chain (CLI), indexer writes play,
 * then mint NFT via backend and see it in Collection, then redeem it.
 */

'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import ArcadeCard from '@/components/ui/ArcadeCard';
import { nftsApi } from '@/services/api/nfts';

export default function PlayMintTesterPage() {
  const [wallet, setWallet] = useState('');
  const [playSignature, setPlaySignature] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setResult(null);
    if (!wallet || !playSignature) {
      setError('Provide wallet and play transaction signature');
      return;
    }
    try {
      setLoading(true);
      const res = await nftsApi.mintFromPlay(playSignature, wallet);
      setResult(`Minted NFT: ${res?.mintAddress || 'Unknown mint'}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mint failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold mb-6">Play Mint Tester</h1>
      <p className="text-white/70 mb-4">
        Use this to mint an NFT for a winning play. Paste the transaction signature from a devnet play.
      </p>
      <ArcadeCard className="p-4">
        <div className="grid gap-3">
          <div>
            <label className="block text-sm text-white/70 mb-1">Wallet Address</label>
            <input
              className="w-full rounded-md px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/40"
              placeholder="Your wallet address"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Play Transaction Signature</label>
            <input
              className="w-full rounded-md px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/40"
              placeholder="Play tx signature (only for winning plays)"
              value={playSignature}
              onChange={(e) => setPlaySignature(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={submit} isLoading={loading}>Mint NFT</Button>
            {error && <span className="text-red-400">{error}</span>}
            {result && <span className="text-green-400">{result}</span>}
          </div>
        </div>
      </ArcadeCard>
    </div>
  );
}


