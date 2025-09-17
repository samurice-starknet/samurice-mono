import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatDto {
  @ApiProperty({
    description: 'Message to send to the AI agent',
    example: 'What should I do next?',
  })
  @IsString()
  @MinLength(1)
  message: string;

  @ApiProperty({
    description: 'Wallet address of the user',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    required: false,
  })
  @IsString()
  walletAddress: string;
}

export class WalletDto {
  @ApiProperty({
    description: 'Wallet address of the user',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    required: false,
  })
  @IsString()
  walletAddress?: string;
}