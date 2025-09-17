// src/ai-agents/boss-agent/dto/initialize-enemy.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsObject,
  ValidateNested,
  IsOptional,
  Min,
  IsDefined,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- Enums ---
export enum CardStateEnumDto {
  SELECTED = 'SELECTED',
  ON_COOLDOWN = 'ON_COOLDOWN',
  AVAILABLE = 'AVAILABLE',
}

export enum DirectionEnumDto {
  LEFT = -1,
  RIGHT = 1,
}

export enum CellTypeEnumDto {
  EMPTY = 'empty',
  PLAYER = 'player',
  OBSTACLE = 'obstacle',
  BOSS = 'boss',
  CREEP = 'creep',
}

export enum BossPhaseEnumDto {
  PrepareAction = 'PrepareAction',
  Move = 'Move',
  Rotate = 'Rotate',
  ChoosingCard = 'ChoosingCard',
  Attack = 'Attack',
}

// --- DTOs ---
export class CardDto {
  @ApiProperty({ description: 'Description of the card skill.' })
  @IsString()
  @IsOptional() // Assuming description can be optional based on your previous DTOs
  description?: string;

  @ApiProperty({
    enum: CardStateEnumDto,
    description: 'Current state of the card.',
  })
  @IsEnum(CardStateEnumDto)
  state: CardStateEnumDto;

  @ApiProperty({ description: 'Cooldown turns remaining for the card skill.' })
  @IsNumber()
  cooldown: number;

  @ApiProperty({ description: 'Damage the card inflicts.' })
  @IsNumber()
  damage: number;
}

export class StateDto {
  @ApiProperty({ description: 'Current position on the grid.' })
  @IsNumber()
  position: number;

  @ApiProperty({
    enum: DirectionEnumDto,
    description: 'Current facing direction (-1 for left, 1 for right).',
  })
  @IsEnum(DirectionEnumDto)
  direction: DirectionEnumDto;

  @ApiProperty({ description: 'Current health points.' })
  @IsNumber()
  @Min(0)
  'current-health': number;

  @ApiProperty({ description: 'Maximum health points.' })
  @IsNumber()
  @Min(1)
  'max-health': number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/CardDto' }, // For Swagger
    description: 'Player or Boss cards, mapping card name to card details.',
  })
  @IsObject()
  cards: Record<string, any>; // Use any to avoid DTO transformation conflicts with Zod
}

export class PlayerItemDto {
  @ApiProperty({ description: 'Description of the item.' })
  @IsString()
  @IsOptional() // Assuming description can be optional
  description?: string;

  @ApiProperty({ description: 'Amount of the item.' })
  @IsNumber()
  @Min(0)
  @IsOptional() // Assuming amount can be optional
  amount?: number;
}

export class PlayerItemEntryDto {
  @ApiProperty({ description: 'Name of the item.' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    type: () => PlayerItemDto,
    description: 'Details of the item.',
  })
  @ValidateNested()
  @Type(() => PlayerItemDto)
  @IsDefined()
  details: PlayerItemDto;
}

export class PlayerDto {
  @ApiProperty({ type: () => StateDto, description: "Player's current state." })
  @ValidateNested()
  @Type(() => StateDto) // Ensures 'player-state' object is an instance of StateDto
  @IsDefined()
  'player-state': StateDto;

  @ApiProperty({ type: [PlayerItemEntryDto], description: 'Player inventory.' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlayerItemEntryDto)
  @IsDefined()
  'player-items': PlayerItemEntryDto[];
}

export class BossDto {
  @ApiPropertyOptional({
    enum: BossPhaseEnumDto,
    description: "The boss's last completed phase.",
  })
  @IsEnum(BossPhaseEnumDto)
  @IsOptional()
  'last-phase'?: BossPhaseEnumDto;

  @ApiProperty({ type: () => StateDto, description: "Boss's current state." })
  @ValidateNested()
  @Type(() => StateDto)
  @IsDefined()
  'boss-state': StateDto;
}

// ... (existing enums and DTOs)

export class GridCellDto {
  @ApiProperty({ enum: CellTypeEnumDto, description: 'Type of the cell.' })
  @IsEnum(CellTypeEnumDto)
  type: CellTypeEnumDto;

  @ApiPropertyOptional({
    description: 'Name of the obstacle, if cell type is obstacle.',
  })
  @IsString()
  @IsOptional()
  obstacle?: string;

  @ApiPropertyOptional({
    type: () => StateDto,
    description:
      'State of the creep, if cell type is creep and creep is present.',
  })
  @ValidateNested()
  @Type(() => StateDto)
  @IsOptional()
  creep?: StateDto;

  // These additions are crucial and must be present based on your JSON
  @ApiPropertyOptional({
    type: () => StateDto,
    description:
      'State of the player, if cell type is player and player is present.',
  })
  @ValidateNested()
  @Type(() => StateDto)
  @IsOptional()
  player?: StateDto;

  @ApiPropertyOptional({
    type: () => StateDto,
    description: 'State of the boss, if cell type is boss and boss is present.',
  })
  @ValidateNested()
  @Type(() => StateDto)
  @IsOptional()
  boss?: StateDto;
}

// ... (rest of your DTOs)

export class GridDto {
  @ApiProperty({
    description: 'Size of the grid (e.g., number of cells if 1D).',
  })
  @IsNumber()
  size: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/GridCellDto' }, // For Swagger
    description:
      'Cells in the grid, mapping cell ID (as string) to cell details.',
  })
  @IsObject()
  @IsDefined()
  cells: Record<string, any>; // Use any to avoid DTO transformation conflicts with Zod
}

export class GameStateRequestDataDto {
  // @ApiProperty({ type: () => PlayerDto, description: "Player's data." })

  @IsDefined()
  player: any; // Use any to avoid DTO transformation conflicts with Zod

  // @ApiProperty({ type: () => BossDto, description: "Boss's data." })

  @IsDefined()
  boss: any; // Use any to avoid DTO transformation conflicts with Zod

  // @ApiProperty({ type: () => GridDto, description: 'Grid data.' })
  // @ValidateNested()
  // @Type(() => GridDto)
  @IsDefined()
  grid: any; // Use any to avoid DTO transformation conflicts with Zod
}

export class GetBossActionRequestDto {
  @ApiProperty({
    description: 'A unique identifier for the current game session.',
    example: 'game_session_gamma_003',
  })
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @ApiProperty({
    description: 'The complete current state of the game.',
  })
  @ValidateNested()
  currentGameState: GameStateRequestDataDto;
}
