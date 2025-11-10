import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private subscriptions: Map<string, RealtimeSubscription> = new Map();

  constructor(private supabaseService: SupabaseService) {}

  onModuleInit() {
    // Initialize realtime connections if needed
  }

  onModuleDestroy() {
    // Clean up all subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
  }

  /**
   * Subscribe to NFT ownership changes for a wallet
   * Useful for real-time collection updates
   */
  subscribeToUserCollection(
    wallet: string,
    callback: (payload: any) => void,
  ): RealtimeSubscription {
    const client = this.supabaseService.getClient();
    const channelName = `user-collection:${wallet}`;

    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nfts',
          filter: `current_owner=eq.${wallet}`,
        },
        callback,
      )
      .subscribe();

    const subscription: RealtimeSubscription = {
      channel,
      unsubscribe: () => {
        client.removeChannel(channel);
        this.subscriptions.delete(channelName);
      },
    };

    this.subscriptions.set(channelName, subscription);
    return subscription;
  }

  /**
   * Subscribe to redemption status updates
   */
  subscribeToRedemption(
    nftMint: string,
    callback: (payload: any) => void,
  ): RealtimeSubscription {
    const client = this.supabaseService.getClient();
    const channelName = `redemption:${nftMint}`;

    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'redemptions',
          filter: `nft_mint=eq.${nftMint}`,
        },
        callback,
      )
      .subscribe();

    const subscription: RealtimeSubscription = {
      channel,
      unsubscribe: () => {
        client.removeChannel(channel);
        this.subscriptions.delete(channelName);
      },
    };

    this.subscriptions.set(channelName, subscription);
    return subscription;
  }

  /**
   * Subscribe to marketplace listing changes
   */
  subscribeToMarketplaceListings(
    filters?: { nftMint?: string; sellerWallet?: string },
    callback?: (payload: any) => void,
  ): RealtimeSubscription {
    const client = this.supabaseService.getClient();
    const channelName = `marketplace-listings:${JSON.stringify(filters)}`;

    let channel = client.channel(channelName);

    if (filters?.nftMint) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_listings',
          filter: `nft_mint=eq.${filters.nftMint}`,
        },
        callback || (() => {}),
      );
    } else if (filters?.sellerWallet) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_listings',
          filter: `seller_wallet=eq.${filters.sellerWallet}`,
        },
        callback || (() => {}),
      );
    } else {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_listings',
        },
        callback || (() => {}),
      );
    }

    channel.subscribe();

    const subscription: RealtimeSubscription = {
      channel,
      unsubscribe: () => {
        client.removeChannel(channel);
        this.subscriptions.delete(channelName);
      },
    };

    this.subscriptions.set(channelName, subscription);
    return subscription;
  }

  /**
   * Unsubscribe from a specific channel
   */
  unsubscribe(channelName: string): void {
    const subscription = this.subscriptions.get(channelName);
    if (subscription) {
      subscription.unsubscribe();
    }
  }
}

