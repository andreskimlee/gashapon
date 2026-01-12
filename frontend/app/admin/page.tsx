/**
 * Admin Page - Game Creation & Deployment
 * 
 * Wallet-protected admin page for creating games.
 * Only the program authority wallet can access the admin panel.
 * 
 * Features:
 * - Wallet-based authentication (on-chain authority check)
 * - Game details form
 * - Dynamic prize management
 * - Auto-calculated odds for 80% profit margin
 * - Real-time profitability preview
 * - Backend API integration
 * - Optional on-chain deployment
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Idl } from '@coral-xyz/anchor';
import {
  PrizeInput,
  OddsCalculatorConfig,
  OddsCalculationResult,
  DEFAULT_CONFIG,
  calculateOdds,
  calculateOptimalPlayCost,
  generateSku,
  formatUsd,
  formatPercent,
  formatOddsRatio,
} from '@/utils/odds-calculator';
import {
  deployGame,
  checkGameExists,
  fetchIdl,
  getGamePda,
  checkWalletAuthorization,
  PrizeConfigInput,
} from '@/services/blockchain/deploy-game';

interface GameFormData {
  name: string;
  description: string;
  imageUrl: string;
  playCostUsd: number;
  tokenMint: string;      // Token mint address for payment
  treasury: string;       // Treasury wallet address
}

interface PrizeFormData extends PrizeInput {
  id: string;
}

interface DeployedGame {
  gameId: number;
  name: string;
  onChainAddress: string;
  signature: string;
  timestamp: Date;
}

const TIER_COLORS = {
  common: 'bg-gray-100 text-gray-700 border-gray-300',
  uncommon: 'bg-green-100 text-green-700 border-green-300',
  rare: 'bg-blue-100 text-blue-700 border-blue-300',
  legendary: 'bg-purple-100 text-purple-700 border-purple-300',
};

const TIER_GRADIENTS = {
  common: 'from-gray-50 to-gray-100',
  uncommon: 'from-green-50 to-green-100',
  rare: 'from-blue-50 to-blue-100',
  legendary: 'from-purple-50 to-purple-100',
};

export default function AdminPage() {
  // Mounted state to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  // Wallet connection
  const { connection } = useConnection();
  const wallet = useWallet();

  // Set mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Default token mint (pump.fun token or partner token)
  const DEFAULT_TOKEN_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
  // Default treasury wallet
  const DEFAULT_TREASURY = 'EgvbCzEZ1RvRKA1VdZEzPuJJKnEfB3jhG7S7mJVd6wzo';

  // Game form state
  const [gameData, setGameData] = useState<GameFormData>({
    name: '',
    description: '',
    imageUrl: '',
    playCostUsd: 5.00,
    tokenMint: DEFAULT_TOKEN_MINT,
    treasury: DEFAULT_TREASURY,
  });

  // Prizes state
  const [prizes, setPrizes] = useState<PrizeFormData[]>([]);
  const [oddsConfig, setOddsConfig] = useState<OddsCalculatorConfig>({
    ...DEFAULT_CONFIG,
    playCostUsd: 5.00,
  });
  const [calculationResult, setCalculationResult] = useState<OddsCalculationResult | null>(null);

  // Deployed games list (on-chain)
  const [deployedGames, setDeployedGames] = useState<DeployedGame[]>([]);

  // Next game ID (auto-incremented, starts at 1)
  const [nextGameId, setNextGameId] = useState<number>(1);

  // IDL for on-chain deployment
  const [idl, setIdl] = useState<Idl | null>(null);

  // Submission state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);

  // Wallet authorization state
  const [walletAuth, setWalletAuth] = useState<{
    isAuthorized: boolean;
    authorityAddress: string | null;
    walletAddress: string | null;
    message: string;
  }>({
    isAuthorized: false,
    authorityAddress: null,
    walletAddress: null,
    message: 'No wallet connected',
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  // Check wallet authorization when wallet changes
  useEffect(() => {
    async function checkAuth() {
      if (!wallet.publicKey) {
        setWalletAuth({
          isAuthorized: false,
          authorityAddress: null,
          walletAddress: null,
          message: 'No wallet connected',
        });
        return;
      }

      setIsCheckingAuth(true);
      try {
        const result = await checkWalletAuthorization(connection, wallet.publicKey);
        setWalletAuth(result);
      } catch (error) {
        console.error('Error checking authorization:', error);
        setWalletAuth({
          isAuthorized: false,
          authorityAddress: null,
          walletAddress: wallet.publicKey?.toString() || null,
          message: 'Error checking authorization',
        });
      } finally {
        setIsCheckingAuth(false);
      }
    }

    checkAuth();
  }, [wallet.publicKey, connection]);

  // Load IDL on mount
  useEffect(() => {
    fetchIdl().then(setIdl);
  }, []);

  // Find next available game ID on mount
  useEffect(() => {
    async function findNextGameId() {
      if (!mounted) return;
      
      // Check game IDs 1-100 to find the first available one
      for (let id = 1; id <= 100; id++) {
        const exists = await checkGameExists(connection, id);
        if (!exists) {
          setNextGameId(id);
          return;
        }
      }
      // If all 1-100 exist, start at 101
      setNextGameId(101);
    }
    findNextGameId();
  }, [mounted, connection]);

  // Recalculate odds whenever prizes or config changes
  useEffect(() => {
    const result = calculateOdds(prizes, oddsConfig);
    setCalculationResult(result);
  }, [prizes, oddsConfig]);

  // Inventory economics state
  const [inventoryStats, setInventoryStats] = useState<{
    playCostUsd: number;
    totalPrizeValue: number;
    totalSupply: number;
    requiredRevenue: number;
    totalPlaysNeeded: number;
    totalWinRate: number;
    psychologyFactors: {
      sessionPlays: number;
      perceivedMultiplier: string;
      winRateFeeling: string;
    };
  } | null>(null);

  // Auto-calculate optimal play cost when prizes or profit margin changes
  useEffect(() => {
    if (prizes.length === 0) {
      setInventoryStats(null);
      return;
    }
    
    const result = calculateOptimalPlayCost(prizes, {
      targetProfitMargin: oddsConfig.targetProfitMargin,
      priceSensitivity: oddsConfig.priceSensitivity,
      minimumWinRate: oddsConfig.minimumWinRate,
      maximumWinRate: oddsConfig.maximumWinRate,
    });
    
    setInventoryStats(result);
    
    // Update game data with calculated play cost
    setGameData(prev => ({ ...prev, playCostUsd: result.playCostUsd }));
  }, [prizes, oddsConfig.targetProfitMargin, oddsConfig.priceSensitivity, oddsConfig.minimumWinRate, oddsConfig.maximumWinRate]);

  // Update odds config when play cost changes (manual or auto)
  useEffect(() => {
    setOddsConfig(prev => ({ ...prev, playCostUsd: gameData.playCostUsd }));
  }, [gameData.playCostUsd]);

  // Add new prize
  const addPrize = useCallback(() => {
    const newPrize: PrizeFormData = {
      id: `prize-${Date.now()}`,
      name: '',
      description: '',
      imageUrl: '',
      metadataUri: '',
      physicalSku: '',
      costUsd: 1.00,
      supplyTotal: 100,
    };
    setPrizes(prev => [...prev, newPrize]);
  }, []);

  // Update prize
  const updatePrize = useCallback((id: string, updates: Partial<PrizeFormData>) => {
    setPrizes(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  // Remove prize
  const removePrize = useCallback((id: string) => {
    setPrizes(prev => prev.filter(p => p.id !== id));
  }, []);

  // Auto-generate SKUs
  const autoGenerateSkus = useCallback(() => {
    setPrizes(prev => prev.map((p, idx) => ({
      ...p,
      physicalSku: generateSku(gameData.name || 'GAME', p.name || 'PRIZE', idx),
    })));
  }, [gameData.name]);

  // Deploy game directly on-chain
  const handleDeployOnChain = async () => {
    if (!calculationResult || !calculationResult.isValid) {
      setDeployResult({ success: false, message: 'Please fix validation errors before deploying' });
      return;
    }

    if (!wallet.publicKey) {
      setDeployResult({ success: false, message: 'Please connect your wallet first' });
      return;
    }

    // Check wallet authorization
    if (!walletAuth.isAuthorized) {
      setDeployResult({ 
        success: false, 
        message: `Unauthorized: Only the program authority can deploy games. ${walletAuth.message}` 
      });
      return;
    }

    if (!idl) {
      setDeployResult({ success: false, message: 'IDL not loaded. Please refresh the page.' });
      return;
    }

    if (!gameData.name.trim()) {
      setDeployResult({ success: false, message: 'Please enter a game name' });
      return;
    }

    if (prizes.length === 0) {
      setDeployResult({ success: false, message: 'Please add at least one prize' });
      return;
    }

    // Validate token mint address format (Solana base58, 32-44 chars)
    if (!gameData.tokenMint.trim() || gameData.tokenMint.trim().length < 32 || gameData.tokenMint.trim().length > 44) {
      setDeployResult({ success: false, message: 'Invalid token mint address format' });
      return;
    }

    // Validate treasury address format
    if (gameData.treasury.trim() && (gameData.treasury.trim().length < 32 || gameData.treasury.trim().length > 44)) {
      setDeployResult({ success: false, message: 'Invalid treasury address format' });
      return;
    }

    const invalidPrizes = prizes.filter(p => !p.name.trim());
    if (invalidPrizes.length > 0) {
      setDeployResult({ success: false, message: 'All prizes must have names' });
      return;
    }

    // Validate string lengths (on-chain limits)
    if (gameData.name.length > 50) {
      setDeployResult({ success: false, message: 'Game name must be 50 characters or less' });
      return;
    }
    if (gameData.description.length > 150) {
      setDeployResult({ success: false, message: 'Game description must be 150 characters or less' });
      return;
    }
    if (gameData.imageUrl.length > 150) {
      setDeployResult({ success: false, message: 'Game image URL must be 150 characters or less' });
      return;
    }

    // Max 15 prizes (on-chain limit due to account size)
    if (prizes.length > 15) {
      setDeployResult({ success: false, message: 'Maximum 15 prizes allowed per game (account size limit)' });
      return;
    }

    // Validate prize string lengths
    for (const prize of prizes) {
      if (prize.name.length > 50) {
        setDeployResult({ success: false, message: `Prize "${prize.name.slice(0, 20)}..." name too long (max 50 chars)` });
        return;
      }
      if (prize.description && prize.description.length > 100) {
        setDeployResult({ success: false, message: `Prize "${prize.name}" description too long (max 100 chars)` });
        return;
      }
      if (prize.imageUrl && prize.imageUrl.length > 150) {
        setDeployResult({ success: false, message: `Prize "${prize.name}" image URL too long (max 150 chars)` });
        return;
      }
    }

    setIsDeploying(true);
    setDeployResult(null);

    try {
      // Check if game already exists on-chain
      const exists = await checkGameExists(connection, nextGameId);
      if (exists) {
        setDeployResult({
          success: false,
          message: `Game ID ${nextGameId} already exists on-chain. Finding next available ID...`,
        });
        // Find next available
        for (let id = nextGameId + 1; id <= nextGameId + 100; id++) {
          const ex = await checkGameExists(connection, id);
          if (!ex) {
            setNextGameId(id);
            break;
          }
        }
        return;
      }

      // Build prize configs for on-chain deployment
      const prizeConfigs: PrizeConfigInput[] = calculationResult.prizes.map((prize, idx) => ({
        prizeId: idx + 1,
        name: prize.name.trim(),
        description: prize.description?.trim() || '',
        imageUrl: prize.imageUrl?.trim() || '',
        metadataUri: prize.metadataUri?.trim() || '',
        physicalSku: prize.physicalSku || generateSku(gameData.name, prize.name, idx),
        tier: prize.tier,
        probabilityBp: prize.probabilityBasisPoints,
        costUsd: Math.round(prize.costUsd * 100), // Convert to cents
        supplyTotal: prize.supplyTotal,
        supplyRemaining: prize.supplyTotal, // Start with full supply
      }));

      // Deploy on-chain
      const result = await deployGame(
        connection,
        wallet,
        {
          gameId: nextGameId,
          name: gameData.name.trim(),
          description: gameData.description.trim(),
          imageUrl: gameData.imageUrl.trim(),
          costUsdCents: Math.round(gameData.playCostUsd * 100), // Convert to cents
          tokenMint: gameData.tokenMint.trim() || undefined,
          treasury: gameData.treasury.trim() || undefined,
          prizes: prizeConfigs,
        },
        idl
      );

      if (!result.success) {
        setDeployResult({
          success: false,
          message: result.error || 'Failed to deploy game on-chain',
        });
        return;
      }

      // Add to deployed games list
      const newGame: DeployedGame = {
        gameId: nextGameId,
        name: gameData.name.trim(),
        onChainAddress: result.gamePda!,
        signature: result.signature!,
        timestamp: new Date(),
      };
      setDeployedGames(prev => [newGame, ...prev]);

      setDeployResult({
        success: true,
        message: `🎮 Game "${gameData.name}" deployed on-chain! Game ID: ${nextGameId}. The indexer will pick it up and add it to the database.`,
      });

      // Reset form and increment game ID
      setGameData({
        name: '',
        description: '',
        imageUrl: '',
        playCostUsd: 5.00,
        tokenMint: DEFAULT_TOKEN_MINT,
        treasury: DEFAULT_TREASURY,
      });
      setPrizes([]);
      setNextGameId(prev => prev + 1);

    } catch (error) {
      console.error('Error deploying game:', error);
      setDeployResult({
        success: false,
        message: `Error deploying: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsDeploying(false);
    }
  };

  // Loading state - prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card bg-white/95 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-6xl mb-4">🎮</div>
              <h1 className="text-3xl font-display text-pastel-text mb-2">Admin Panel</h1>
              <p className="text-pastel-textLight">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 1: Not connected - prompt to connect wallet
  if (!wallet.publicKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card bg-white/95 backdrop-blur-sm">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🔐</div>
              <h1 className="text-3xl font-display text-pastel-text mb-2">Admin Access</h1>
              <p className="text-pastel-textLight">Connect your wallet to continue</p>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <WalletMultiButton />
              <p className="text-xs text-pastel-textLight text-center">
                Only the program authority wallet can access the admin panel
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 2: Checking authorization
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card bg-white/95 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">🔍</div>
              <h1 className="text-3xl font-display text-pastel-text mb-2">Verifying Access</h1>
              <p className="text-pastel-textLight">Checking wallet authorization...</p>
              <div className="mt-6">
                <svg className="animate-spin h-8 w-8 mx-auto text-pastel-coral" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 3: Not authorized - wrong wallet
  if (!walletAuth.isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card bg-white/95 backdrop-blur-sm">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⛔</div>
              <h1 className="text-3xl font-display text-pastel-text mb-2">Access Denied</h1>
              <p className="text-pastel-textLight">Your wallet is not authorized for admin access</p>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="text-sm text-red-700 space-y-2">
                <div>
                  <span className="font-medium">Your wallet:</span>
                  <code className="ml-2 bg-red-100 px-2 py-0.5 rounded text-xs">
                    {walletAuth.walletAddress?.slice(0, 12)}...{walletAuth.walletAddress?.slice(-8)}
                  </code>
                </div>
                {walletAuth.authorityAddress && (
                  <div>
                    <span className="font-medium">Required authority:</span>
                    <code className="ml-2 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                      {walletAuth.authorityAddress.slice(0, 12)}...{walletAuth.authorityAddress.slice(-8)}
                    </code>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <WalletMultiButton />
              <p className="text-xs text-pastel-textLight text-center">
                Connect with the authorized wallet to access admin features
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin panel
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="card bg-white/95 backdrop-blur-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-display text-pastel-text">🎮 Game Admin</h1>
              <p className="text-pastel-textLight mt-1">Create and manage gashapon games</p>
            </div>
            <div className="flex items-center gap-3">
              <WalletMultiButton />
            </div>
          </div>
          
          {/* Authorized Status */}
          <div className="mt-4 p-3 rounded-xl text-sm bg-green-100 text-green-700 border border-green-200">
            <div className="flex items-center justify-between">
              <span className="font-medium flex items-center gap-2">
                <span className="text-lg">✓</span>
                Authorized as Program Authority
              </span>
              <div className="text-xs text-green-600">
                <code className="bg-green-200/50 px-2 py-0.5 rounded">
                  {wallet.publicKey?.toString().slice(0, 8)}...{wallet.publicKey?.toString().slice(-4)}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Deploy Result Message */}
        {deployResult && (
          <div className={`card ${
            deployResult.success 
              ? 'bg-green-100 border-2 border-green-300' 
              : 'bg-yellow-100 border-2 border-yellow-300'
          }`}>
            <p className={`text-sm ${deployResult.success ? 'text-green-700' : 'text-yellow-700'}`}>
              {deployResult.message}
            </p>
          </div>
        )}

        {/* Deployed Games Section */}
        {deployedGames.length > 0 && (
          <div className="card bg-white/95 backdrop-blur-sm">
            <h2 className="text-xl font-display text-pastel-text mb-4">🚀 Deployed Games (On-Chain)</h2>
            
            <div className="space-y-3">
              {deployedGames.map((game) => (
                <div
                  key={game.gameId}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div>
                    <div className="font-medium text-pastel-text">{game.name}</div>
                    <div className="text-xs text-pastel-textLight">
                      Game ID: {game.gameId} • {game.timestamp.toLocaleTimeString()}
                    </div>
                    <div className="text-xs text-green-600 font-mono mt-1">
                      PDA: {game.onChainAddress.slice(0, 16)}...{game.onChainAddress.slice(-8)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://explorer.solana.com/tx/${game.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
                    >
                      View TX ↗
                    </a>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      ✓ On-Chain
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-xs text-pastel-textLight mt-4">
              💡 Games deployed on-chain will be picked up by the indexer and added to the database automatically.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Game Details & Prizes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game Details */}
            <div className="card bg-white/95 backdrop-blur-sm">
              <h2 className="text-xl font-display text-pastel-text mb-4">📋 Game Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-pastel-text mb-1">Game Name *</label>
                  <input
                    type="text"
                    value={gameData.name}
                    onChange={(e) => setGameData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Anime Figure Collection"
                    className="w-full px-4 py-2 rounded-xl border-2 border-pastel-pink/30 focus:border-pastel-coral focus:outline-none transition-colors bg-white text-pastel-text"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-pastel-text mb-1">Description</label>
                  <textarea
                    value={gameData.description}
                    onChange={(e) => setGameData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what prizes are in this game..."
                    rows={2}
                    className="w-full px-4 py-2 rounded-xl border-2 border-pastel-pink/30 focus:border-pastel-coral focus:outline-none transition-colors resize-none bg-white text-pastel-text"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-pastel-text">Play Cost (USD) *</label>
                    <span className="text-xs text-green-600 font-medium">
                      {prizes.length > 0 ? '✨ Auto-calculated' : ''}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.50"
                      value={gameData.playCostUsd}
                      onChange={(e) => setGameData(prev => ({ ...prev, playCostUsd: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 rounded-xl border-2 border-pastel-pink/30 focus:border-pastel-coral focus:outline-none transition-colors bg-white text-pastel-text pr-20"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-2xl font-bold text-pastel-coral">
                      ${gameData.playCostUsd.toFixed(2)}
                    </div>
                  </div>
                  <p className="text-xs text-pastel-textLight mt-1">
                    💡 Auto-calculated from prizes to achieve {(oddsConfig.targetProfitMargin * 100).toFixed(0)}% profit margin. Token amount calculated at play time from pump.fun price.
                  </p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-pastel-text mb-1">Token Mint Address *</label>
                  <input
                    type="text"
                    value={gameData.tokenMint}
                    onChange={(e) => setGameData(prev => ({ ...prev, tokenMint: e.target.value }))}
                    placeholder="Pump.fun token mint address"
                    className="w-full px-4 py-2 rounded-xl border-2 border-pastel-pink/30 focus:border-pastel-coral focus:outline-none transition-colors bg-white text-pastel-text font-mono text-sm"
                  />
                  <p className="text-xs text-pastel-textLight mt-1">
                    🪙 The SPL token users will pay with (e.g., pump.fun meme coin)
                  </p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-pastel-text mb-1">Treasury Wallet</label>
                  <input
                    type="text"
                    value={gameData.treasury}
                    onChange={(e) => setGameData(prev => ({ ...prev, treasury: e.target.value }))}
                    placeholder="Treasury wallet address"
                    className="w-full px-4 py-2 rounded-xl border-2 border-pastel-pink/30 focus:border-pastel-coral focus:outline-none transition-colors bg-white text-pastel-text font-mono text-sm"
                  />
                  <p className="text-xs text-pastel-textLight mt-1">
                    💰 Where payments are sent (leave default or set custom per game)
                  </p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-pastel-text mb-1">Image URL</label>
                  <input
                    type="url"
                    value={gameData.imageUrl}
                    onChange={(e) => setGameData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://example.com/game-image.png"
                    className="w-full px-4 py-2 rounded-xl border-2 border-pastel-pink/30 focus:border-pastel-coral focus:outline-none transition-colors bg-white text-pastel-text"
                  />
                </div>
              </div>
            </div>

            {/* Prizes Section */}
            <div className="card bg-white/95 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display text-pastel-text">🎁 Prizes</h2>
                <div className="flex gap-2">
                  <button
                    onClick={autoGenerateSkus}
                    className="btn btn-secondary text-sm py-2"
                    disabled={prizes.length === 0}
                  >
                    Auto SKUs
                  </button>
                  <button
                    onClick={addPrize}
                    className="btn btn-primary text-sm py-2"
                  >
                    + Add Prize
                  </button>
                </div>
              </div>

              {prizes.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-pastel-pink/30 rounded-xl">
                  <div className="text-4xl mb-2">🎁</div>
                  <p className="text-pastel-textLight">No prizes added yet</p>
                  <button
                    onClick={addPrize}
                    className="btn btn-primary mt-4"
                  >
                    Add Your First Prize
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {prizes.map((prize, idx) => {
                    const calculated = calculationResult?.prizes.find(p => p.id === prize.id);
                    const tier = calculated?.tier || 'common';
                    
                    return (
                      <div
                        key={prize.id}
                        className={`p-4 rounded-xl border-2 bg-gradient-to-r ${TIER_GRADIENTS[tier]} border-l-4 ${TIER_COLORS[tier].split(' ')[2]}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-pastel-text">#{idx + 1}</span>
                            {calculated && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[tier]}`}>
                                {tier.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => removePrize(prize.id)}
                            className="text-red-400 hover:text-red-600 transition-colors p-1"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-pastel-textLight mb-1">Prize Name *</label>
                            <input
                              type="text"
                              value={prize.name}
                              onChange={(e) => updatePrize(prize.id, { name: e.target.value })}
                              placeholder="e.g., Pikachu Plush"
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-pastel-coral focus:outline-none text-sm bg-white text-pastel-text"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-pastel-textLight mb-1">Cost (USD) *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={prize.costUsd}
                              onChange={(e) => updatePrize(prize.id, { costUsd: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-pastel-coral focus:outline-none text-sm bg-white text-pastel-text"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-pastel-textLight mb-1">Supply</label>
                            <input
                              type="number"
                              min="1"
                              value={prize.supplyTotal}
                              onChange={(e) => updatePrize(prize.id, { supplyTotal: parseInt(e.target.value) || 1 })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-pastel-coral focus:outline-none text-sm bg-white text-pastel-text"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-pastel-textLight mb-1">SKU</label>
                            <input
                              type="text"
                              value={prize.physicalSku}
                              onChange={(e) => updatePrize(prize.id, { physicalSku: e.target.value })}
                              placeholder="Auto-generated or custom"
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-pastel-coral focus:outline-none text-sm bg-white text-pastel-text"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-pastel-textLight mb-1">Image URL</label>
                            <input
                              type="url"
                              value={prize.imageUrl || ''}
                              onChange={(e) => updatePrize(prize.id, { imageUrl: e.target.value })}
                              placeholder="https://..."
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-pastel-coral focus:outline-none text-sm bg-white text-pastel-text"
                            />
                          </div>
                        </div>

                        {/* Calculated stats */}
                        {calculated && (
                          <div className="mt-3 pt-3 border-t border-gray-200/50 flex items-center gap-4 text-xs">
                            <span className="text-pastel-textLight">
                              <strong className="text-pastel-text">{formatPercent(calculated.probabilityPercent)}</strong> chance
                            </span>
                            <span className="text-pastel-textLight">
                              EV: <strong className="text-pastel-text">{formatUsd(calculated.expectedValueUsd)}</strong>
                            </span>
                            <span className="text-pastel-textLight">
                              {calculated.probabilityBasisPoints} bp
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Odds Preview & Submit */}
          <div className="space-y-6">
            {/* Odds Configuration */}
            <div className="card bg-white/95 backdrop-blur-sm">
              <h2 className="text-xl font-display text-pastel-text mb-4">⚙️ Odds Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-pastel-text mb-1">
                    Target Profit Margin
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="50"
                      max="95"
                      value={oddsConfig.targetProfitMargin * 100}
                      onChange={(e) => setOddsConfig(prev => ({ 
                        ...prev, 
                        targetProfitMargin: parseInt(e.target.value) / 100 
                      }))}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold text-pastel-coral w-16 text-right">
                      {(oddsConfig.targetProfitMargin * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-pastel-text mb-1">
                    Price Sensitivity
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="50"
                      max="250"
                      value={oddsConfig.priceSensitivity * 100}
                      onChange={(e) => setOddsConfig(prev => ({ 
                        ...prev, 
                        priceSensitivity: parseInt(e.target.value) / 100 
                      }))}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold text-pastel-text w-16 text-right">
                      {oddsConfig.priceSensitivity.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-pastel-textLight mt-1">
                    Higher = more difference between cheap & expensive prize odds
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-pastel-text mb-1">Min Win %</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={Math.round(oddsConfig.minimumWinRate * 100)}
                      onChange={(e) => setOddsConfig(prev => ({ 
                        ...prev, 
                        minimumWinRate: parseInt(e.target.value) / 100 
                      }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-pastel-text"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-pastel-text mb-1">Max Win %</label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={Math.round(oddsConfig.maximumWinRate * 100)}
                      onChange={(e) => setOddsConfig(prev => ({ 
                        ...prev, 
                        maximumWinRate: parseInt(e.target.value) / 100 
                      }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-pastel-text"
                    />
                  </div>
                </div>
                <p className="text-xs text-pastel-textLight mt-2">
                  🎯 Claw machine style: Low win rate (5-25%) = accessible play cost
                </p>
              </div>
            </div>

            {/* Inventory Economics */}
            {inventoryStats && inventoryStats.totalSupply > 0 && (
              <div className="card bg-gradient-to-br from-blue-50 to-indigo-100 backdrop-blur-sm border-2 border-blue-200">
                <h2 className="text-xl font-display text-pastel-text mb-4">📦 Inventory Economics</h2>
                
                <div className="space-y-3">
                  {/* Total Inventory */}
                  <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                    <span className="text-sm text-pastel-textLight">Total Prizes</span>
                    <span className="font-bold text-pastel-text">{inventoryStats.totalSupply.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                    <span className="text-sm text-pastel-textLight">Inventory Value</span>
                    <span className="font-bold text-pastel-text">{formatUsd(inventoryStats.totalPrizeValue)}</span>
                  </div>
                  
                  {/* Revenue Target */}
                  <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                    <span className="text-sm text-pastel-textLight">Target Revenue</span>
                    <span className="font-bold text-green-600">{formatUsd(inventoryStats.requiredRevenue)}</span>
                  </div>
                  
                  {/* Expected Plays */}
                  <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                    <span className="text-sm text-pastel-textLight">Expected Plays</span>
                    <span className="font-bold text-pastel-text">{inventoryStats.totalPlaysNeeded.toLocaleString()}</span>
                  </div>
                  
                  {/* Profit breakdown */}
                  <div className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl mt-2">
                    <div className="text-xs text-green-700 mb-1">Total Expected Profit</div>
                    <div className="text-2xl font-bold text-green-700">
                      {formatUsd(inventoryStats.requiredRevenue - inventoryStats.totalPrizeValue)}
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-blue-600 mt-3">
                  💡 {inventoryStats.totalPlaysNeeded.toLocaleString()} plays × ${gameData.playCostUsd.toFixed(2)} = ${inventoryStats.requiredRevenue.toLocaleString()} revenue for {(oddsConfig.targetProfitMargin * 100).toFixed(0)}% profit
                </p>
              </div>
            )}

            {/* Player Psychology Insights */}
            {inventoryStats && inventoryStats.psychologyFactors && inventoryStats.totalSupply > 0 && (
              <div className="card bg-gradient-to-br from-purple-50 to-pink-100 backdrop-blur-sm border-2 border-purple-200">
                <h2 className="text-xl font-display text-pastel-text mb-4">🧠 Player Psychology</h2>
                
                <div className="space-y-3">
                  {/* Perceived Value */}
                  <div className="p-3 bg-white/60 rounded-lg">
                    <div className="text-xs text-purple-600 mb-1">Perceived Return</div>
                    <div className="text-2xl font-bold text-purple-700">
                      {inventoryStats.psychologyFactors.perceivedMultiplier}
                    </div>
                    <div className="text-xs text-purple-500">
                      &quot;${gameData.playCostUsd.toFixed(2)} for a chance at big prizes!&quot;
                    </div>
                  </div>
                  
                  {/* Win Rate Feeling */}
                  <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                    <span className="text-sm text-pastel-textLight">Win Odds</span>
                    <span className="font-bold text-pastel-text">{inventoryStats.psychologyFactors.winRateFeeling}</span>
                  </div>
                  
                  {/* Session Plays */}
                  <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                    <span className="text-sm text-pastel-textLight">$20 Session</span>
                    <span className="font-bold text-pastel-text">{inventoryStats.psychologyFactors.sessionPlays} plays</span>
                  </div>
                  
                  {/* Psychology Tips */}
                  <div className="p-3 bg-purple-100/50 rounded-lg border border-purple-200">
                    <div className="text-xs text-purple-700 space-y-1">
                      <div>✓ Charm pricing ($X.99) increases conversion</div>
                      <div>✓ Low entry = more trials (sunk cost effect)</div>
                      <div>✓ High multiplier anchors perceived value</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Profitability Preview */}
            <div className="card bg-white/95 backdrop-blur-sm">
              <h2 className="text-xl font-display text-pastel-text mb-4">🎰 Per-Play Stats</h2>
              
              {calculationResult ? (
                <div className="space-y-4">
                  {/* Status indicator */}
                  <div className={`p-3 rounded-xl text-sm font-medium ${
                    calculationResult.isValid 
                      ? 'bg-green-100 text-green-700 border border-green-200' 
                      : 'bg-red-100 text-red-700 border border-red-200'
                  }`}>
                    {calculationResult.validationMessage}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-pastel-sky/30 rounded-xl">
                      <div className="text-xs text-pastel-textLight">Play Cost</div>
                      <div className="text-xl font-bold text-pastel-text">{formatUsd(gameData.playCostUsd)}</div>
                    </div>
                    <div className="p-3 bg-pastel-pink/30 rounded-xl">
                      <div className="text-xs text-pastel-textLight">Win Rate</div>
                      <div className="text-xl font-bold text-pastel-text">{calculationResult.totalProbabilityPercent.toFixed(1)}%</div>
                    </div>
                    <div className="p-3 bg-pastel-mint/30 rounded-xl">
                      <div className="text-xs text-pastel-textLight">Exp. Payout</div>
                      <div className="text-xl font-bold text-pastel-text">{formatUsd(calculationResult.expectedValuePerPlay)}</div>
                    </div>
                    <div className={`p-3 rounded-xl ${
                      calculationResult.profitMarginPercent >= oddsConfig.targetProfitMargin * 100
                        ? 'bg-green-100'
                        : 'bg-yellow-100'
                    }`}>
                      <div className="text-xs text-pastel-textLight">Profit/Play</div>
                      <div className="text-xl font-bold text-pastel-text">{formatUsd(calculationResult.profitPerPlay)}</div>
                    </div>
                  </div>

                  {/* Prize breakdown */}
                  {calculationResult.prizes.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-pastel-text mb-2">Prize Odds</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {calculationResult.prizes.map((prize, idx) => (
                          <div key={prize.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
                            <span className="font-medium text-pastel-text truncate flex-1">
                              {prize.name || `Prize #${idx + 1}`}
                            </span>
                            <div className="flex items-center gap-3 ml-2">
                              <span className="text-pastel-textLight">
                                ×{prize.supplyTotal}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${TIER_COLORS[prize.tier]}`}>
                                {prize.tier.slice(0, 1).toUpperCase()}
                              </span>
                              {/* Show % for common items, odds ratio for rare items */}
                              {prize.probabilityPercent >= 1 ? (
                                <span className="text-pastel-textLight w-16 text-right font-mono">
                                  {formatPercent(prize.probabilityPercent)}
                                </span>
                              ) : (
                                <span className="text-pastel-textLight w-20 text-right font-mono text-[10px]">
                                  {formatOddsRatio(prize.probabilityPercent)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-pastel-textLight">
                  Add prizes to see profitability calculations
                </div>
              )}
            </div>

            {/* Deploy Button */}
            <div className="card bg-white/95 backdrop-blur-sm">
              {/* Next Game ID indicator */}
              <div className="mb-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
                <span className="font-medium">Next Game ID:</span> {nextGameId}
                {!idl && <span className="ml-2 text-yellow-600">(Loading IDL...)</span>}
              </div>
              
              <button
                onClick={handleDeployOnChain}
                disabled={isDeploying || !calculationResult?.isValid || prizes.length === 0 || !idl || !walletAuth.isAuthorized}
                className={`w-full btn py-4 text-lg transition-all ${
                  isDeploying || !calculationResult?.isValid || prizes.length === 0 || !idl || !walletAuth.isAuthorized
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'btn-primary'
                }`}
              >
                {isDeploying ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deploying On-Chain...
                  </span>
                ) : !walletAuth.isAuthorized ? (
                  '🔒 Not Authorized'
                ) : (
                  '🚀 Deploy Game On-Chain'
                )}
              </button>
              
              <p className="text-xs text-pastel-textLight text-center mt-3">
                Game will be deployed directly to Solana. The indexer will pick it up and add it to the database.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
