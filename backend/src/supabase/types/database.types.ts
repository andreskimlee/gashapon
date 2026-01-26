/**
 * Supabase Database Types
 * 
 * This file should be generated using Supabase CLI:
 * npx supabase gen types typescript --project-id <project-id> > src/supabase/types/database.types.ts
 * 
 * For now, this is a placeholder that matches our TypeORM entities
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: number
          on_chain_address: string
          game_id: number
          name: string
          description: string | null
          image_url: string | null
          cost_in_tokens: number
          cost_in_usd: number | null
          is_active: boolean
          total_plays: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          on_chain_address: string
          game_id: number
          name: string
          description?: string | null
          image_url?: string | null
          cost_in_tokens: number
          cost_in_usd?: number | null
          is_active?: boolean
          total_plays?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          on_chain_address?: string
          game_id?: number
          name?: string
          description?: string | null
          image_url?: string | null
          cost_in_tokens?: number
          cost_in_usd?: number | null
          is_active?: boolean
          total_plays?: number
          created_at?: string
          updated_at?: string
        }
      }
      prizes: {
        Row: {
          id: number
          game_id: number
          prize_id: number
          name: string
          description: string | null
          image_url: string | null
          physical_item_sku: string
          tier: 'common' | 'uncommon' | 'rare' | 'legendary'
          probability_basis_points: number
          supply_total: number
          supply_remaining: number
          metadata_uri: string | null
          created_at: string
        }
        Insert: {
          id?: number
          game_id: number
          prize_id: number
          name: string
          description?: string | null
          image_url?: string | null
          physical_item_sku: string
          tier: 'common' | 'uncommon' | 'rare' | 'legendary'
          probability_basis_points: number
          supply_total: number
          supply_remaining: number
          metadata_uri?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          game_id?: number
          prize_id?: number
          name?: string
          description?: string | null
          image_url?: string | null
          physical_item_sku?: string
          tier?: 'common' | 'uncommon' | 'rare' | 'legendary'
          probability_basis_points?: number
          supply_total?: number
          supply_remaining?: number
          metadata_uri?: string | null
          created_at?: string
        }
      }
      nfts: {
        Row: {
          id: number
          mint_address: string
          prize_id: number
          game_id: number
          current_owner: string
          is_redeemed: boolean
          redemption_tx: string | null
          minted_at: string
          redeemed_at: string | null
        }
        Insert: {
          id?: number
          mint_address: string
          prize_id: number
          game_id: number
          current_owner: string
          is_redeemed?: boolean
          redemption_tx?: string | null
          minted_at?: string
          redeemed_at?: string | null
        }
        Update: {
          id?: number
          mint_address?: string
          prize_id?: number
          game_id?: number
          current_owner?: string
          is_redeemed?: boolean
          redemption_tx?: string | null
          minted_at?: string
          redeemed_at?: string | null
        }
      }
      redemptions: {
        Row: {
          id: number
          nft_mint: string
          user_wallet: string
          prize_id: number
          shipment_provider: string
          shipment_id: string
          tracking_number: string | null
          carrier: string | null
          status: 'processing' | 'shipped' | 'delivered' | 'failed'
          estimated_delivery: string | null
          redeemed_at: string
          shipped_at: string | null
          delivered_at: string | null
          failure_reason: string | null
          retry_count: number
          data_deletion_scheduled_at: string | null
        }
        Insert: {
          id?: number
          nft_mint: string
          user_wallet: string
          prize_id: number
          shipment_provider: string
          shipment_id: string
          tracking_number?: string | null
          carrier?: string | null
          status?: 'processing' | 'shipped' | 'delivered' | 'failed'
          estimated_delivery?: string | null
          redeemed_at?: string
          shipped_at?: string | null
          delivered_at?: string | null
          failure_reason?: string | null
          retry_count?: number
          data_deletion_scheduled_at?: string | null
        }
        Update: {
          id?: number
          nft_mint?: string
          user_wallet?: string
          prize_id?: number
          shipment_provider?: string
          shipment_id?: string
          tracking_number?: string | null
          carrier?: string | null
          status?: 'processing' | 'shipped' | 'delivered' | 'failed'
          estimated_delivery?: string | null
          redeemed_at?: string
          shipped_at?: string | null
          delivered_at?: string | null
          failure_reason?: string | null
          retry_count?: number
          data_deletion_scheduled_at?: string | null
        }
      }
      plays: {
        Row: {
          id: number
          game_id: number
          user_wallet: string
          prize_id: number | null
          nft_mint: string | null
          transaction_signature: string
          random_value: string | null
          token_amount_paid: number | null
          status: 'pending' | 'completed' | 'failed'
          played_at: string
        }
        Insert: {
          id?: number
          game_id: number
          user_wallet: string
          prize_id?: number | null
          nft_mint?: string | null
          transaction_signature: string
          random_value?: string | null
          token_amount_paid?: number | null
          status?: 'pending' | 'completed' | 'failed'
          played_at?: string
        }
        Update: {
          id?: number
          game_id?: number
          user_wallet?: string
          prize_id?: number | null
          nft_mint?: string | null
          transaction_signature?: string
          random_value?: string | null
          token_amount_paid?: number | null
          status?: 'pending' | 'completed' | 'failed'
          played_at?: string
        }
      }
      game_categories: {
        Row: {
          id: number
          name: string
          slug: string
          description: string | null
          icon: string | null
          game_ids: number[]
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          slug: string
          description?: string | null
          icon?: string | null
          game_ids?: number[]
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string
          description?: string | null
          icon?: string | null
          game_ids?: number[]
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      marketplace_listings: {
        Row: {
          id: number
          nft_mint: string
          on_chain_listing_address: string | null
          seller_wallet: string
          price_in_tokens: number
          price_in_sol: number | null
          is_active: boolean
          listed_at: string
          cancelled_at: string | null
          sold_at: string | null
          buyer_wallet: string | null
          sale_tx: string | null
        }
        Insert: {
          id?: number
          nft_mint: string
          on_chain_listing_address?: string | null
          seller_wallet: string
          price_in_tokens: number
          price_in_sol?: number | null
          is_active?: boolean
          listed_at?: string
          cancelled_at?: string | null
          sold_at?: string | null
          buyer_wallet?: string | null
          sale_tx?: string | null
        }
        Update: {
          id?: number
          nft_mint?: string
          on_chain_listing_address?: string | null
          seller_wallet?: string
          price_in_tokens?: number
          price_in_sol?: number | null
          is_active?: boolean
          listed_at?: string
          cancelled_at?: string | null
          sold_at?: string | null
          buyer_wallet?: string | null
          sale_tx?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      prize_tier: 'common' | 'uncommon' | 'rare' | 'legendary'
      redemption_status: 'processing' | 'shipped' | 'delivered' | 'failed'
      play_status: 'pending' | 'completed' | 'failed'
    }
  }
}

