import { z } from 'zod';

export const cardStateEnumSchema = z.enum([
  'SELECTED',
  'ON_COOLDOWN',
  'AVAILABLE',
]);
export type CardState = z.infer<typeof cardStateEnumSchema>;

export const directionEnumSchema = z.union([z.literal(-1), z.literal(1)]);
export type Direction = z.infer<typeof directionEnumSchema>;

export const cellTypeEnumSchema = z.enum([
  'empty',
  'player',
  'obstacle',
  'creep',
  'boss',
]);
export type CellType = z.infer<typeof cellTypeEnumSchema>;

export const bossPhaseEnumSchema = z.enum([
  'PrepareAction',
  'Move',
  'Rotate',
  'ChoosingCard',
  'Attack',
]);
export type BossPhase = z.infer<typeof bossPhaseEnumSchema>;

export const cardSchema = z.object({
  description: z.string().optional(),
  state: cardStateEnumSchema,
  cooldown: z.number(),
  damage: z.number(),
});
export type Card = z.infer<typeof cardSchema>;

export const stateSchema = z.object({
  position: z.number(),
  direction: directionEnumSchema,
  'current-health': z.number().min(0),
  'max-health': z.number().min(1),
  cards: z.record(z.string(), cardSchema),
});
export type State = z.infer<typeof stateSchema>;

export const playerItemSchema = z.object({
  description: z.string().optional(),
  amount: z.number().min(0).optional(),
});
export type PlayerItem = z.infer<typeof playerItemSchema>;

export const playerItemEntrySchema = z.object({
  name: z.string(),
  details: playerItemSchema,
});
export type PlayerItemEntry = z.infer<typeof playerItemEntrySchema>;

export const playerSchema = z.object({
  'player-state': stateSchema,
  'player-items': z.array(playerItemEntrySchema),
});
export type Player = z.infer<typeof playerSchema>;

export const bossSchema = z.object({
  'last-phase': bossPhaseEnumSchema.optional(),
  'boss-state': stateSchema,
});
export type Boss = z.infer<typeof bossSchema>;

export const gridCellSchema = z.object({
  type: cellTypeEnumSchema,
  obstacle: z.string().optional(),
  creep: stateSchema.optional(),
});
export type GridCell = z.infer<typeof gridCellSchema>;

export const gridSchema = z.object({
  size: z.number(),
  cells: z.record(z.string(), gridCellSchema),
});
export type Grid = z.infer<typeof gridSchema>;

export const gameStateSchema = z.object({
  player: playerSchema,
  boss: bossSchema,
  grid: gridSchema,
});
export type GameState = z.infer<typeof gameStateSchema>;

const baseActionParamsSchema = z.object({}).strict();

const moveParamsSchema = z
  .object({
    direction: directionEnumSchema,
  })
  .strict();

const choosingCardParamsSchema = z
  .object({
    cardName: z.string(),
  })
  .strict();

export const bossActionResponseSchema = z.discriminatedUnion('next-phase', [
  z.object({
    'next-phase': z.literal(bossPhaseEnumSchema.enum.PrepareAction),
    params: baseActionParamsSchema,
    reasoning: z.string().optional(),
    vibeMessage: z.string().optional(),
  }),
  z.object({
    'next-phase': z.literal(bossPhaseEnumSchema.enum.Move),
    params: moveParamsSchema,
    reasoning: z.string().optional(),
    vibeMessage: z.string().optional(),
  }),
  z.object({
    'next-phase': z.literal(bossPhaseEnumSchema.enum.Rotate),
    params: baseActionParamsSchema,
    reasoning: z.string().optional(),
    vibeMessage: z.string().optional(),
  }),
  z.object({
    'next-phase': z.literal(bossPhaseEnumSchema.enum.ChoosingCard),
    params: choosingCardParamsSchema,
    reasoning: z.string().optional(),
    vibeMessage: z.string().optional(),
  }),
  z.object({
    'next-phase': z.literal(bossPhaseEnumSchema.enum.Attack),
    params: baseActionParamsSchema,
    reasoning: z.string().optional(),
    vibeMessage: z.string().optional(),
  }),
]);
export type BossActionResponse = z.infer<typeof bossActionResponseSchema>;
export const daydreamBossActionOutputSchema = z.object({
  'next-phase': bossPhaseEnumSchema,
  params: z
    .object({
      direction: directionEnumSchema.optional(),
      cardName: z.string().optional(),
    })
    .optional(),
  reasoning: z.string().optional(),
  vibeMessage: z.string().optional(),
});
export type DaydreamBossActionOutput = z.infer<
  typeof daydreamBossActionOutputSchema
>;
