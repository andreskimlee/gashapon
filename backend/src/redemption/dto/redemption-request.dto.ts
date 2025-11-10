import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

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
    description: 'Wallet signature for redemption authorization',
    example: 'base64-encoded-signature',
  })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({
    description: 'Encrypted shipping data (encrypted client-side)',
    example: 'encrypted-base64-string',
  })
  @IsString()
  @IsNotEmpty()
  encryptedShippingData: string;
}

