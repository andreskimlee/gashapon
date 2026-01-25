/**
 * Application Constants
 * Last rebuild: 2026-01-25
 */

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || '';

// Solana Configuration
export const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Program IDs (to be configured)
export const GAME_PROGRAM_ID = process.env.NEXT_PUBLIC_GAME_PROGRAM_ID || '';
export const MARKETPLACE_PROGRAM_ID = process.env.NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID || '';
export const TOKEN_MINT = process.env.NEXT_PUBLIC_TOKEN_MINT || '';
export const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || '';

// Prize Tiers
export const PRIZE_TIERS = ['common', 'uncommon', 'rare', 'legendary'] as const;

// Marketplace Configuration
export const PLATFORM_FEE_BASIS_POINTS = 200; // 2%
export const MIN_LISTING_PRICE = 1; // Minimum tokens for listing

// UI Constants
export const ITEMS_PER_PAGE = 20;
export const ANIMATION_DURATION = 3000; // Prize reveal animation duration (ms)

// Routes
export const ROUTES = {
  HOME: '/',
  GAMES: '/games',
  COLLECTION: '/collection',
  MARKETPLACE: '/marketplace',
} as const;

