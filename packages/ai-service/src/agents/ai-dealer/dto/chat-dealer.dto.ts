import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsDefined, MinLength } from 'class-validator';

export class ChatDealerDto {
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

  @ApiProperty({
    description: 'Current money for the player',
    example: 1000,
    required: false,
  })
  playerCurrentMoney?: number;

  @ApiProperty({
    description: 'Current health for the player',
    example: 100,
    required: false,
  })
  playerCurrentHealth?: number;

  @ApiProperty({
    description: 'Max health for the player',
    example: 100,
    required: false,
  })
  playerMaxHealth?: number;
}
