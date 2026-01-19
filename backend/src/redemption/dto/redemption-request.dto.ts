import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches, IsNumber } from 'class-validator';

export class RedemptionRequestDto {
  @ApiProperty({
    description: 'NFT mint address',
    example: '4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, {
    message: 'Invalid Solana address format',
  })
  nftMint: string;

  @ApiProperty({
    description: 'User wallet address',
    example: '4oUeUUSqx9GcphRo8MrS5zbnuyPnUWfFK1ysQX2ySWMG',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, {
    message: 'Invalid Solana address format',
  })
  userWallet: string;

  @ApiProperty({
    description: 'Wallet signature for redemption authorization (base58-encoded ed25519 signature)',
    example: '5VERv8NMvzbJ...base58-encoded-signature',
  })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({
    description: 'Original message that was signed by the wallet',
    example: 'Gashapon Prize Redemption\n\nNFT: ...\nWallet: ...\nTimestamp: ...',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Timestamp when the message was signed (for replay protection)',
    example: 1705600000000,
  })
  @IsNumber()
  @IsNotEmpty()
  timestamp: number;

  @ApiProperty({
    description: 'Encrypted shipping data (encrypted client-side)',
    example: 'encrypted-base64-string',
  })
  @IsString()
  @IsNotEmpty()
  encryptedShippingData: string;
}

