import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsDefined } from 'class-validator';

export class DealerInitDto {
  @ApiProperty({
    description: 'Wallet address of the user',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    required: false,
  })
  @IsString()
  walletAddress: string;

  @ApiProperty({
    description: 'Initial money for the player',
    example: 1000,
    required: true,
  })
  @IsNotEmpty()
  playerInitialMoney: number;

  @ApiProperty({
    description: 'Initial current health for the player',
    example: 100,
    required: true,
  })
  @IsNotEmpty()
  playerInitialCurrentHealth: number;

  @ApiProperty({
    description: 'Initial max health for the player',
    example: 100,
    required: true,
  })
  @IsNotEmpty()
  playerInitialMaxHealth: number;
}


