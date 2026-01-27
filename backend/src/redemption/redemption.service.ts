import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PublicKey } from "@solana/web3.js";
import * as bs58 from "bs58";
import * as nacl from "tweetnacl";
import { Repository } from "typeorm";
import { MetaplexService } from "../blockchain/metaplex.service";
import { SolanaService } from "../blockchain/solana.service";
import { EncryptionService } from "../common/encryption.service";
import { NftEntity } from "../nft/nft.entity";
import { PrizeEntity } from "../prize/prize.entity";
import { RedemptionEntity, RedemptionStatus } from "./redemption.entity";
import { ShipStationService } from "./shipstation.service";

export interface RedemptionRequest {
  nftMint: string;
  userWallet: string;
  signature: string;
  message: string;
  timestamp: number;
  encryptedShippingData: string;
}

export interface ShippingData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email?: string; // Optional for notifications
}

export interface RedemptionResult {
  success: boolean;
  redemptionId: number;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  estimatedDelivery?: Date;
  burnTransaction?: string;
}

@Injectable()
export class RedemptionService {
  constructor(
    @InjectRepository(RedemptionEntity)
    private redemptionRepository: Repository<RedemptionEntity>,
    @InjectRepository(NftEntity)
    private nftRepository: Repository<NftEntity>,
    @InjectRepository(PrizeEntity)
    private prizeRepository: Repository<PrizeEntity>,
    private shipStationService: ShipStationService,
    private encryptionService: EncryptionService,
    private metaplexService: MetaplexService,
    private solanaService: SolanaService
  ) {}

  /**
   * Redeem an NFT for physical item
   * This is the main redemption flow that:
   * 1. Verifies NFT ownership
   * 2. Decrypts shipping data (in-memory only)
   * 3. Burns NFT on-chain
   * 4. Creates shipment with ShipStation
   * 5. Stores only tracking info (NO PII)
   */
  async redeemNFT(request: RedemptionRequest): Promise<RedemptionResult> {
    // 1. Verify NFT exists and is owned by user
    const nft = await this.nftRepository.findOne({
      where: { mintAddress: request.nftMint },
      relations: ["prize", "game"],
    });

    if (!nft) {
      throw new NotFoundException(`NFT with mint ${request.nftMint} not found`);
    }

    if (nft.isRedeemed) {
      throw new BadRequestException("NFT has already been redeemed");
    }

    // Verify on-chain ownership
    const onChainOwner = await this.metaplexService.getNFTOwner(
      request.nftMint
    );
    if (onChainOwner !== request.userWallet) {
      throw new BadRequestException("NFT is not owned by this wallet");
    }

    // Verify signature (wallet signature verification with replay protection)
    const isValidSignature = await this.verifyRedemptionSignature(
      request.userWallet,
      request.nftMint,
      request.signature,
      request.message,
      request.timestamp
    );
    if (!isValidSignature) {
      throw new BadRequestException("Invalid redemption signature or expired request");
    }

    // 2. Decrypt shipping data (in-memory only, never persisted)
    let shippingData: ShippingData;
    try {
      shippingData = await this.encryptionService.decryptShippingData(
        request.encryptedShippingData
      );
    } catch (error) {
      throw new BadRequestException("Failed to decrypt shipping data");
    }

    // 3. Burn NFT on-chain
    let burnTransaction: string;
    try {
      burnTransaction = await this.metaplexService.burnNFT(
        request.nftMint,
        new PublicKey(request.userWallet)
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to burn NFT: ${error.message}`
      );
    }

    // 4. Create shipment with ShipStation (immediate fulfillment)
    let shipment;
    try {
      shipment = await this.shipStationService.createShipment({
        name: shippingData.name,
        address: shippingData.address,
        city: shippingData.city,
        state: shippingData.state,
        zip: shippingData.zip,
        country: shippingData.country,
        phone: shippingData.phone,
        sku: nft.prize.physicalSku,
        weightGrams: nft.prize.weightGrams,
        // Pass prize dimensions for UPS box selection
        lengthInches: nft.prize.lengthInches,
        widthInches: nft.prize.widthInches,
        heightInches: nft.prize.heightInches,
        orderId: `GACHA-${request.nftMint.slice(0, 8).toUpperCase()}`,
        email: shippingData.email,
      });
    } catch (error) {
      // If shipment creation fails, we still burned the NFT
      // Log error and create redemption record with failed status
      console.error("ShipStation shipment creation failed:", error);
      throw new InternalServerErrorException(
        "NFT burned but shipment creation failed. Please contact support."
      );
    }

    // shippingData goes out of scope here (GC'd, never stored)

    // 5. Update NFT record (mark as redeemed)
    nft.isRedeemed = true;
    nft.redemptionTx = burnTransaction;
    nft.redeemedAt = new Date();
    await this.nftRepository.save(nft);

    // 6. Create redemption record (NO PII stored)
    const redemption = this.redemptionRepository.create({
      nftMint: request.nftMint,
      userWallet: request.userWallet,
      prizeId: nft.prize.id,
      shipmentProvider: "shipstation",
      shipmentId: shipment.id.toString(),
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      carrierCode: shipment.carrierCode,
      labelPdfUrl: shipment.labelPdfUrl,
      labelPngUrl: shipment.labelPngUrl,
      trackingUrl: shipment.trackingUrl,
      status: RedemptionStatus.PROCESSING,
      estimatedDelivery: shipment.estimatedDelivery,
      dataDeletionScheduledAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    });

    const savedRedemption = (await this.redemptionRepository.save(
      redemption
    )) as RedemptionEntity;

    // 7. Send notification email (if email provided)
    if (shippingData.email) {
      await this.sendRedemptionConfirmation(
        shippingData.email,
        shipment.trackingNumber
      );
    }

    return {
      success: true,
      redemptionId: savedRedemption.id,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      carrier: shipment.carrier,
      estimatedDelivery: shipment.estimatedDelivery,
      burnTransaction,
    };
  }

  /**
   * Direct redemption (no NFT minting)
   * Used when user chooses to redeem immediately after winning
   */
  async directRedemption(
    playId: number,
    userWallet: string,
    signature: string,
    encryptedShippingData: string
  ): Promise<RedemptionResult> {
    // Similar flow but skip NFT mint/burn
    // This would be called immediately after a play is finalized
    // TODO: Implement when play flow is complete
    throw new Error("Direct redemption not yet implemented");
  }

  /**
   * Get redemption status
   */
  async getRedemptionStatus(
    nftMint: string,
    userWallet?: string
  ): Promise<RedemptionEntity> {
    const redemption = await this.redemptionRepository.findOne({
      where: { nftMint },
      relations: ["prize"],
    });

    if (!redemption) {
      throw new NotFoundException(`Redemption for NFT ${nftMint} not found`);
    }

    if (userWallet && redemption.userWallet !== userWallet) {
      throw new NotFoundException("Redemption not found for this wallet");
    }

    return redemption;
  }

  /**
   * Get user's redemption history
   */
  async getUserRedemptions(wallet: string): Promise<RedemptionEntity[]> {
    return this.redemptionRepository.find({
      where: { userWallet: wallet },
      relations: ["prize"],
      order: { redeemedAt: "DESC" },
    });
  }

  /**
   * Get all redemptions (admin)
   */
  async getAllRedemptions(): Promise<RedemptionEntity[]> {
    return this.redemptionRepository.find({
      relations: ["prize"],
      order: { redeemedAt: "DESC" },
    });
  }

  /**
   * Handle ShipStation webhook for status updates
   */
  async handleShipmentUpdate(webhook: any): Promise<void> {
    const redemption = await this.redemptionRepository.findOne({
      where: { shipmentId: webhook.shipmentId.toString() },
    });

    if (!redemption) {
      console.warn(`Redemption not found for shipment ${webhook.shipmentId}`);
      return;
    }

    // Map webhook status string to enum
    const statusMap: Record<string, RedemptionStatus> = {
      processing: RedemptionStatus.PROCESSING,
      shipped: RedemptionStatus.SHIPPED,
      delivered: RedemptionStatus.DELIVERED,
      failed: RedemptionStatus.FAILED,
    };
    redemption.status =
      statusMap[webhook.status] || RedemptionStatus.PROCESSING;

    redemption.trackingNumber =
      webhook.trackingNumber || redemption.trackingNumber;
    redemption.shippedAt = webhook.shippedAt
      ? new Date(webhook.shippedAt)
      : redemption.shippedAt;
    redemption.deliveredAt = webhook.deliveredAt
      ? new Date(webhook.deliveredAt)
      : redemption.deliveredAt;

    if (redemption.status === RedemptionStatus.DELIVERED) {
      // Schedule cleanup (delete tracking data after 90 days)
      redemption.dataDeletionScheduledAt = new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000
      );
    }

    await this.redemptionRepository.save(redemption);

    // Notify user of status change
    if (redemption.status === RedemptionStatus.DELIVERED) {
      await this.notifyDelivery(redemption.id);
    }
  }

  /**
   * Retry failed redemption
   */
  async retryFailedRedemption(redemptionId: number): Promise<RedemptionResult> {
    const redemption = await this.redemptionRepository.findOne({
      where: { id: redemptionId },
      relations: ["prize"],
    });

    if (!redemption) {
      throw new NotFoundException(`Redemption ${redemptionId} not found`);
    }

    if (redemption.status !== RedemptionStatus.FAILED) {
      throw new BadRequestException("Redemption is not in failed status");
    }

    // Increment retry count
    redemption.retryCount = (redemption.retryCount || 0) + 1;

    // TODO: Re-attempt fulfillment with ShipStation
    // This would require storing encrypted shipping data temporarily
    // or requesting it again from the user

    await this.redemptionRepository.save(redemption);

    throw new Error("Retry logic not yet implemented");
  }

  /**
   * Verify redemption signature using ed25519
   * Implements:
   * 1. Replay protection (5-minute timestamp expiry)
   * 2. Message format validation
   * 3. Cryptographic signature verification using tweetnacl
   */
  private async verifyRedemptionSignature(
    wallet: string,
    nftMint: string,
    signatureBase58: string,
    message: string,
    timestamp: number
  ): Promise<boolean> {
    // 1. Replay protection: Check timestamp is within 5 minutes
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const now = Date.now();
    if (now - timestamp > FIVE_MINUTES_MS) {
      console.warn(`Replay attack detected: timestamp ${timestamp} is too old (now: ${now})`);
      return false;
    }

    // Also reject timestamps from the future (clock skew tolerance: 30 seconds)
    if (timestamp > now + 30000) {
      console.warn(`Future timestamp detected: ${timestamp} (now: ${now})`);
      return false;
    }

    // 2. Verify message format matches expected structure
    const expectedMessage = `Grabbit Prize Redemption\n\nNFT: ${nftMint}\nWallet: ${wallet}\nTimestamp: ${timestamp}\n\nBy signing this message, you confirm that you own this NFT and authorize its redemption for physical delivery.`;
    
    if (message !== expectedMessage) {
      console.warn("Message format mismatch");
      console.warn("Expected:", expectedMessage);
      console.warn("Received:", message);
      return false;
    }

    // 3. Verify ed25519 signature using tweetnacl
    try {
      // Decode base58 signature
      const signature = bs58.decode(signatureBase58);
      
      // Decode base58 public key (wallet address)
      const publicKey = bs58.decode(wallet);
      
      // Encode message as bytes
      const messageBytes = new TextEncoder().encode(message);
      
      // Verify the signature
      const isValid = nacl.sign.detached.verify(messageBytes, signature, publicKey);
      
      if (!isValid) {
        console.warn(`Invalid signature for wallet ${wallet}`);
      }
      
      return isValid;
    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }

  /**
   * Send redemption confirmation email
   */
  private async sendRedemptionConfirmation(
    email: string,
    trackingNumber: string
  ): Promise<void> {
    // TODO: Implement email service
    console.log(
      `Sending confirmation email to ${email} with tracking ${trackingNumber}`
    );
  }

  /**
   * Notify user of delivery
   */
  private async notifyDelivery(redemptionId: number): Promise<void> {
    // TODO: Implement notification service
    console.log(`Notifying user of delivery for redemption ${redemptionId}`);
  }
}
