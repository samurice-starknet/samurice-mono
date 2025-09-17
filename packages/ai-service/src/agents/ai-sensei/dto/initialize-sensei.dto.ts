import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsDefined } from 'class-validator';

export class InitializeSenseiDto {
  @ApiProperty({
    description: "The player's wallet address for identification.",
    example: '0x1234abcd...',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({
    description: 'An array of skill names the player currently possesses.',
    example: ['Katana', 'Charge'],
    type: [String],
  })
  @IsDefined()
  @IsArray()
  initialPlayerSkills: string[];
}
