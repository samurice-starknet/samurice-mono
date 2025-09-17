// src/ai-agents/boss-agent/dto/mock-game-state.data.ts

// Using DTO enums for consistency with what controller expects
import {
  CardStateEnumDto,
  DirectionEnumDto,
  CellTypeEnumDto,
  BossPhaseEnumDto,
} from '../src/agents/ai-enemy/dto/initialize-enemy.dto';

export const mockGameId = 'test-game-001';

export const mockGameStatePayload = {
  // This is what we'll send in the request body
  gameId: mockGameId,
  currentGameState: {
    player: {
      'player-state': {
        position: 1,
        direction: DirectionEnumDto.RIGHT, // 1
        'current-health': 10,
        'max-health': 10,
        cards: {
          Swirl: {
            description: 'Strike the cells directly ahead and behind.',
            state: CardStateEnumDto.SELECTED,
            cooldown: 0,
            damage: 2,
          },
          Arrow: {
            description: 'Strike the first target ahead.',
            state: CardStateEnumDto.ON_COOLDOWN,
            cooldown: 1,
            damage: 2,
          },
          Swap: {
            description: 'Swap places with the first target ahead.',
            state: CardStateEnumDto.AVAILABLE,
            cooldown: 0,
            damage: 0,
          },
        },
      },
      'player-items': {
        'Heal Potion': {
          description: 'Heal 3HP',
          amount: 1,
        },
      },
    },
    boss: {
      'last-phase': BossPhaseEnumDto.PrepareAction,
      'boss-state': {
        position: 2,
        direction: DirectionEnumDto.LEFT, // -1
        'current-health': 5,
        'max-health': 20,
        cards: {
          Swirl: {
            description: 'Strike the cells directly ahead and behind.',
            state: CardStateEnumDto.AVAILABLE,
            cooldown: 0,
            damage: 2,
          },
          Arrow: {
            description: 'Strike the first target ahead.',
            state: CardStateEnumDto.ON_COOLDOWN,
            cooldown: 1,
            damage: 2,
          },
        },
      },
    },
    grid: {
      size: 5,
      cells: {
        '-2': { type: CellTypeEnumDto.EMPTY },
        '-1': { type: CellTypeEnumDto.EMPTY },
        '0': { type: CellTypeEnumDto.EMPTY },
        '1': { type: CellTypeEnumDto.PLAYER },
        '2': { type: CellTypeEnumDto.CREEP, creep: 'boss' },
      },
    },
  },
};

export const mockBossActionResponse = {
  'next-phase': BossPhaseEnumDto.ChoosingCard,
  params: { cardName: 'Swirl' },
  reasoning: "Player is in range for Swirl, and it's available.",
};
