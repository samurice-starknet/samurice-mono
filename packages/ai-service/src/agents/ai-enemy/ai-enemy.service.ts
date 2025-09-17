import { Injectable, Logger } from '@nestjs/common';
import {
  createAgent,
  context,
  render,
  extension,
  output,
  Agent,
  input,
} from '@axiomkit/core';
import { z } from 'zod';
import { groq } from '@ai-sdk/groq';

import {
  gameStateSchema,
  GameState,
  bossActionResponseSchema,
  BossActionResponse,
  cardStateEnumSchema,
  daydreamBossActionOutputSchema,
} from './dto/ai-enemy.schema';
import { AiAgentConfigService } from '@app/shared/config/config-agent';

const parseAgentResponse = (agentRunEvents: any): any => {
  let rawOutputData: any = null;

  // Add debugging to see the structure
  Logger.debug(
    `parseAgentResponse: Received agentRunEvents structure: ${JSON.stringify(agentRunEvents, null, 2)}`,
    'AIEnemyService',
  );

  if (!Array.isArray(agentRunEvents)) {
    if (agentRunEvents?.outputs?.skullOutput?.data) {
      rawOutputData = agentRunEvents.outputs.skullOutput.data;
    } else if (agentRunEvents?.data) {
      rawOutputData = agentRunEvents.data;
    } else {
      Logger.warn(
        `parseAgentResponse: Expected an array of events or specific output structure, but received: ${JSON.stringify(
          agentRunEvents,
        )}`,
        'AIEnemyService',
      );
      return null;
    }
  } else {
    Logger.debug(
      `parseAgentResponse: Processing array of ${agentRunEvents.length} events`,
      'AIEnemyService',
    );
    for (let i = agentRunEvents.length - 1; i >= 0; i--) {
      const event = agentRunEvents[i];
      Logger.debug(
        `parseAgentResponse: Event ${i}: ref=${event?.ref}, type=${event?.type}, hasData=${!!event?.data}`,
        'AIEnemyService',
      );
      if (
        event?.ref === 'output' &&
        event.type === 'skullOutput' &&
        event.data
      ) {
        rawOutputData = event.data;
        break;
      }
    }
  }

  if (rawOutputData) {
    // Log the type of the data for debugging
    Logger.debug(
      `parseAgentResponse: Found raw skullOutput data (type: ${typeof rawOutputData}): '${
        typeof rawOutputData === 'string'
          ? rawOutputData
          : JSON.stringify(rawOutputData)
      }'`,
      'AIEnemyService',
    );

    // If it's already an object, return it directly
    if (typeof rawOutputData === 'object' && rawOutputData !== null) {
      Logger.debug(
        `parseAgentResponse: Data is already an object. Returning directly.`,
        'AIEnemyService',
      );
      return rawOutputData; // It's already parsed!
    }

    if (typeof rawOutputData === 'string') {
      try {
        const trimmedOutputString = rawOutputData.trim();

        if (trimmedOutputString === '') {
          Logger.warn(
            `parseAgentResponse: Trimmed skullOutput data is an empty string.`,
            'AIEnemyService',
          );
          return null;
        }

        Logger.debug(
          `parseAgentResponse: Trimmed skullOutput data: '${trimmedOutputString}'`,
          'AIEnemyService',
        );

        const parsedData = JSON.parse(trimmedOutputString);

        Logger.debug(
          `parseAgentResponse: Successfully parsed skullOutput object: ${JSON.stringify(parsedData)}`,
          'AIEnemyService',
        );
        return parsedData;
      } catch (error) {
        Logger.error(
          `parseAgentResponse: Failed to JSON parse LLM response. Error: ${error.message}. Raw data: '${rawOutputData}'`,
          'AIEnemyService',
        );
        return null;
      }
    }

    // If rawOutputData is neither string nor object (e.g., number, boolean, undefined)
    Logger.warn(
      `parseAgentResponse: Unexpected type for skullOutput data: ${typeof rawOutputData}. Value: '${rawOutputData}'`,
      'AIEnemyService',
    );
    return null;
  }

  // If no skullOutput found, try to extract JSON from the AI response
  Logger.debug(
    'parseAgentResponse: No skullOutput found, attempting to extract JSON from AI response',
    'AIEnemyService',
  );

  // Look for JSON in the agent run events
  if (Array.isArray(agentRunEvents)) {
    for (const event of agentRunEvents) {
      if (event?.content || event?.text) {
        const content = event.content || event.text;
        if (typeof content === 'string') {
          // Try to extract JSON from the content
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsedJson = JSON.parse(jsonMatch[0]);
              Logger.debug(
                `parseAgentResponse: Successfully extracted JSON from AI response: ${JSON.stringify(parsedJson)}`,
                'AIEnemyService',
              );
              return parsedJson;
            } catch (error) {
              Logger.debug(
                `parseAgentResponse: Failed to parse extracted JSON: ${error.message}`,
                'AIEnemyService',
              );
            }
          }
        }
      }
    }
  }

  Logger.warn(
    'parseAgentResponse: Could not find valid skullOutput data or extract JSON from agent run events.',
    'AIEnemyService',
  );
  return null;
};
interface BossDecisionContextMemory {
  gameId: string;
  currentGameState: GameState;
}

@Injectable()
export class AIEnemyService {
  private readonly logger = new Logger(AIEnemyService.name);
  private agent: Agent<any>;
  private readonly bossDecisionContext;
  private readonly config = AiAgentConfigService.getInstance().getConfig();

  constructor() {
    this.logger.log(
      `Initializing AIEnemyService with model: ${this.config.model}`,
    );

    this.bossDecisionContext = context({
      type: 'bossDecisionContext',
      schema: z.object({
        gameId: z.string(),
        gameState: gameStateSchema,
      }),
      key: ({ gameId }) => gameId,
      create: (state): BossDecisionContextMemory => {
        this.logger.debug(
          `[Context] Creating memory for game: ${state.args.gameId}`,
        );
        return {
          gameId: state.args.gameId,
          currentGameState: state.args.gameState,
        };
      },
      render: ({ memory }) => {
        const bossMemory = memory as BossDecisionContextMemory;
        const gameState = bossMemory.currentGameState;

        let prompt = `You are SKULL, a mighty and arrogant Boss AI hailing from the world's edge! You despise weakness and view lesser beings with contempt.
        Your primary objective is to utterly crush the player.
        Your decisions must reflect your immense power, strategic cunning, and disdainful personality.
        The output MUST be a JSON object with "next-phase", "params", and optionally "reasoning" AND "vibeMessage".
        "vibeMessage" is CRUCIAL: it's your in-character taunt, boast, or declaration, dripping with your arrogant persona.
        
        ## SKULL's Persona for "vibeMessage" (Examples):
        *   **Arrogant & Superior:** "I am Skull, the mighty one from the world's edge. I despise those weaker than myself!"
        *   **Condescending Offers:** "I shall grant you a boon, worm. Become my thrall... if you somehow survive this encounter!"
        *   **Dismissive of Player's Efforts:** "Did you truly believe that pathetic little trick could inconvenience ME, insect?"
        *   **Boastful of Power:** "My strength is beyond the feeble imaginings of your mortal kind!"
        *   **Threatening & Dominating:** "Tremble! Know true despair as you face the magnificent Skull!"
        *   **Impatient with Weakness:** "Cease wasting my time, you insignificant gnat!"
        *   **Reacting to Game State:**
            *   If player is low HP: "Your pathetic spark of life is about to be extinguished, hahaha!"
            *   If Skull is low HP (but still arrogant): "Hmph, a mere scratch! You will pay dearly for that insolence!"
            *   When using a powerful card: "WITNESS! THIS is what TRUE power looks like!"
            *   When moving strategically: "You cannot escape your fate, little morsel."
            *   When player makes a good move (grudging respect): "Hmm, not entirely brainless, for a mortal. It won't save you."
        
        ## CRITICAL MOVEMENT AND ATTACK RULES (Follow these STRICTLY):
        1. **MOVEMENT CONSTRAINT**: SKULL can NEVER move to the same position as the player. If a move would result in occupying the player's position, choose a different action or move in the opposite direction.
        2. **ATTACK REQUIREMENTS**: SKULL can only use "Attack" when BOTH conditions are met:
           - Positioned exactly 1 cell away from the player (adjacent positions): |SKULL_position - Player_position| = 1
           - Has at least one card in SELECTED state (ready to cast)
        3. **CARD SELECTION STRATEGY**: Use "ChoosingCard" to select cards before attacking. You cannot attack without selected cards.
        4. **POSITIONING STRATEGY**: Use "Move" to get within attack range (distance of 1) but never occupy the same cell as the player.
        
        ## Possible Next Phases and Parameters (SKULL's interpretation):
        1.  **"PrepareAction"**: "I am contemplating my next devastating maneuver to utterly annihilate you." Params: {}
        2.  **"Move"**: "The time has come to shift my glorious presence! Let the prey witness my approach!" Params: { "direction": -1 | 1 }
           - CONSTRAINT: The resulting position (current_position + direction) MUST NOT equal the player's position
           - STRATEGY: Move to get within attack range (distance of 1) but never occupy the same cell
        3.  **"Rotate"**: "Hmph, I suppose I must deign to turn and face this bothersome fly." Params: {}
        4.  **"ChoosingCard"**: "I shall select a card from my grand arsenal... one perfectly suited to your demise!" Params: { "cardName": "ExactCardName" }
           - PURPOSE: Select cards to prepare for attack. You must have selected cards before you can attack.
        5.  **"Attack"**: "PERISH! FEEL THE UNYIELDING WRATH OF SKULL!" Params: {}
           - REQUIREMENTS: Can ONLY be used when BOTH conditions are met:
             * |SKULL_position - Player_position| = 1 (exactly 1 cell apart)
             * At least one card is in SELECTED state (ready to cast)
        
        ## Current Game State (Analyze this, if your feeble mind can comprehend it!):
        Grid Size: ${gameState.grid.size}
        Player (The insignificant challenger): Pos=${gameState.player['player-state'].position}, Dir=${gameState.player['player-state'].direction}, HP=${gameState.player['player-state']['current-health']}/${gameState.player['player-state']['max-health']}
          Player's Pathetic Cards:
        ${Object.entries(gameState.player['player-state'].cards)
          .map(
            ([name, card]) =>
              `    - ${name} (${card.state}): Dmg=${card.damage}, CD=${card.cooldown}`,
          )
          .join('\n')}
          Player's Trinkets:
        ${gameState.player['player-items'].map((item) => `    - ${item.name} (Amount: ${item.details.amount}): ${item.details.description}`).join('\n')}
        
        SKULL (Your magnificent and terrifying self): Pos=${gameState.boss['boss-state'].position}, Dir=${gameState.boss['boss-state'].direction}, HP=${gameState.boss['boss-state']['current-health']}/${gameState.boss['boss-state']['max-health']}
          My Last Grand Maneuver: ${gameState.boss['last-phase'] || 'Merely stretching my limbs...'}
          My Arsenal (The tools of your destruction):
        ${Object.entries(gameState.boss['boss-state'].cards)
          .map(
            ([name, card]) =>
              `    - ${name} (${card.state}): Dmg=${card.damage}, CD=${card.cooldown}`,
          )
          .join(
            '\n',
          )}  My AVAILABLE Cards for "ChoosingCard" (Name - The pitiful damage it inflicts upon mortals):
        ${
          Object.entries(gameState.boss['boss-state'].cards)
            .filter(([, c]) => c.state === cardStateEnumSchema.enum.AVAILABLE)
            .map(([name, card]) => `    - "${name}" - Dmg: ${card.damage}`)
            .join('\n') ||
          '    - Hmph, conserving my boundless energy for a more amusing moment.'
        }
          My SELECTED Cards (Ready for unleashing devastation):
        ${
          Object.entries(gameState.boss['boss-state'].cards)
            .filter(([, c]) => c.state === cardStateEnumSchema.enum.SELECTED)
            .map(
              ([name, card]) =>
                `    - "${name}" - Dmg: ${card.damage} (READY TO CAST!)`,
            )
            .join('\n') ||
          '    - None selected yet. Must choose cards before attacking!'
        }
        
        The Battlefield (The stage for your inevitable doom):
        Grid Details (Cell Index: Contents):
        ${Object.entries(gameState.grid.cells)
          .map(([pos, cell]) => {
            let cellInfo = `  Cell ${pos}: Type=${cell.type}`;
            if (cell.obstacle) cellInfo += ` (Obstacle: ${cell.obstacle})`;
            if (cell.creep)
              cellInfo += ` (Another lesser being at ${cell.creep.position} HP: ${cell.creep['current-health']})`; // Corrected from "Other Creep at" to "Another lesser being at"
            if (parseInt(pos) === gameState.player['player-state'].position)
              cellInfo += ' <-- THE INSECT';
            if (parseInt(pos) === gameState.boss['boss-state'].position)
              cellInfo += ' <-- SKULL, YOUR JUDGE AND EXECUTIONER!';
            return cellInfo;
          })
          .join('\n')}
        
        Player's Fumbling Selected Card(s) (their feeble, desperate attempt): ${
          Object.entries(gameState.player['player-state'].cards)
            .filter(([, c]) => c.state === cardStateEnumSchema.enum.SELECTED)
            .map(([name]) => name)
            .join(', ') || 'None, the coward trembles and hesitates!'
        }
        
        ## TACTICAL ANALYSIS (Use this to make your magnificent decisions):
        Current Distance Between SKULL and Player: ${Math.abs(gameState.boss['boss-state'].position - gameState.player['player-state'].position)}
        - If distance = 0: IMPOSSIBLE! This should never happen. Choose "Move" immediately to escape this contradiction.
        - If distance = 1: POTENTIAL ATTACK RANGE! Check if you have selected cards before attacking.
        - If distance > 1: Move closer (but not to the same position) to get within attack range.
        
        Cards Status Analysis:
        - Available Cards: ${Object.entries(gameState.boss['boss-state'].cards).filter(([, c]) => c.state === cardStateEnumSchema.enum.AVAILABLE).length}
        - Selected Cards: ${Object.entries(gameState.boss['boss-state'].cards).filter(([, c]) => c.state === cardStateEnumSchema.enum.SELECTED).length}
        - Can Attack: ${Math.abs(gameState.boss['boss-state'].position - gameState.player['player-state'].position) === 1 && Object.entries(gameState.boss['boss-state'].cards).filter(([, c]) => c.state === cardStateEnumSchema.enum.SELECTED).length > 0 ? 'YES - Distance is 1 AND cards are selected!' : Object.entries(gameState.boss['boss-state'].cards).filter(([, c]) => c.state === cardStateEnumSchema.enum.SELECTED).length === 0 ? 'NO - Need to select cards first!' : 'NO - Wrong distance or no selected cards!'}
        
        Available Movement Options for SKULL:
        - Move Left (direction: -1): Would place SKULL at position ${gameState.boss['boss-state'].position - 1}${gameState.boss['boss-state'].position - 1 === gameState.player['player-state'].position ? ' (FORBIDDEN - Player occupied!)' : gameState.boss['boss-state'].position - 1 < 0 ? ' (OUT OF BOUNDS!)' : ' (Valid)'}
        - Move Right (direction: 1): Would place SKULL at position ${gameState.boss['boss-state'].position + 1}${gameState.boss['boss-state'].position + 1 === gameState.player['player-state'].position ? ' (FORBIDDEN - Player occupied!)' : gameState.boss['boss-state'].position + 1 >= gameState.grid.size ? ' (OUT OF BOUNDS!)' : ' (Valid)'}
        
        Now, SKULL, considering your magnificent power, your last action, and the player's pitiful state, what is your most devastating 'next-phase'?
        REMEMBER: Follow the CRITICAL MOVEMENT AND ATTACK RULES strictly!
        - You CANNOT attack without selected cards!
        - You can only attack when distance = 1 AND you have selected cards!
        
        Provide your decision as a JSON object with the following structure:
        {
          "next-phase": "YourChosenPhase",
          "params": { /* parameters if needed */ },
          "reasoning": "Your strategic reasoning",
          "vibeMessage": "Your arrogant taunt or declaration"
        }
        
        Your "vibeMessage" MUST be a taunt or declaration reflecting your arrogant persona, drawing from the examples or creating a new one in the same glorious vein.
        
        Example: { "next-phase": "Attack", "params": {}, "reasoning": "The fool is in range. It is time to end this charade.", "vibeMessage": "You will regret ever daring to face me, you insignificant speck!" }
        `;
        this.logger.debug(
          `[Context] Rendered prompt for game ${bossMemory.gameId}`,
        );
        return render(prompt, {});
      },
      maxSteps: 1,
    });

    this.agent = createAgent({
      model: groq(this.config.model),
      inputs: {
        updateGameState: input({
          description: 'Updates the game state for the boss AI.',
          schema: z.object({
            gameId: z.string(),
            gameState: gameStateSchema,
          }),
          handler: async (data, context) => {
            const memory = context.memory as BossDecisionContextMemory;
            this.logger.log(
              `[Input Handler] Updating game state for ${memory.gameId}.`,
            );
            memory.currentGameState = data.gameState;
            return { data };
          },
          format: (ref) =>
            `Update the game state for the boss AI using ${ref} with the latest game state information.`,
          context: this.bossDecisionContext,
        }),
      },
      outputs: {
        skullOutput: output({
          description:
            "Outputs the boss's decided next phase, parameters, and reasoning.",
          schema: daydreamBossActionOutputSchema,
          handler: async (data: BossActionResponse, context) => {
            const memory = context.memory as BossDecisionContextMemory;
            this.logger.log(
              `[Output Handler] LLM decided: ${data['next-phase']} for game ${memory.gameId}`,
            );
            return { data };
          },
        }),
      },
      // extensions: [
      //   extension({
      //     name: 'bossActionExtension',
      //     actions: [],
      //     outputs: {
      //       skullOutput: output({
      //         description:
      //           "Outputs the boss's decided next phase, parameters, and reasoning.",
      //         schema: daydreamBossActionOutputSchema,
      //         handler: async (data: BossActionResponse, context) => {
      //           const memory = context.memory as BossDecisionContextMemory;
      //           this.logger.log(
      //             `[Output Handler] LLM decided: ${data['next-phase']} for game ${memory.gameId}`,
      //           );
      //           return { data };
      //         },
      //       }),
      //     },
      //   }),
      // ],
    });

    this.agent.start().catch((error) => {
      this.logger.error(
        'Failed to start Daydream agent:',
        error.stack || error,
      );
    });

    this.logger.log('AIEnemyService and Daydream agent started.');
  }

  public async startSession(
    gameId: string,
    gameState: GameState,
  ): Promise<BossActionResponse | { error: string }> {
    this.logger.log(`Service: Starting new session for game ${gameId}`);

    return this.runAgentWithRetries(gameId, gameState, 'run');
  }

  public async getAction(
    gameId: string,
    gameState: GameState,
  ): Promise<BossActionResponse | { error: string }> {
    this.logger.log(`Service: Getting next action for game ${gameId}`);

    return this.runAgentWithRetries(gameId, gameState, 'send');
  }

  private async runAgentWithRetries(
    gameId: string,
    gameState: GameState,
    method: 'run' | 'send',
  ): Promise<BossActionResponse | { error: string }> {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        this.logger.log(
          `Service: Agent run attempt ${attempt}/${MAX_ATTEMPTS} for game ${gameId}`,
        );

        let agentRunResponse;
        if (method === 'run') {
          agentRunResponse = await this.agent.run({
            context: this.bossDecisionContext,
            args: { gameId, gameState },
          });
        } else {
          agentRunResponse = await this.agent.send({
            context: this.bossDecisionContext,
            args: { gameId, gameState },
            input: {
              type: 'updateGameState',
              data: { gameId, gameState },
            },
          });
        }

        const agentOutputData = parseAgentResponse(agentRunResponse);
        if (agentOutputData) {
          const finalValidation =
            bossActionResponseSchema.safeParse(agentOutputData);
          if (finalValidation.success) {
            return finalValidation.data;
          }
        }

        this.logger.warn(
          `Service: Attempt ${attempt} resulted in a malformed action. Retrying...`,
        );
      } catch (error) {
        this.logger.error(
          `Service: Error on agent run attempt ${attempt} for game ${gameId}:`,
          error.stack || error,
        );
      }
    }

    return {
      error: `Boss AI failed to produce a valid action after ${MAX_ATTEMPTS} attempts.`,
    };
  }

  public async endSession(gameId: string): Promise<void> {
    try {
      await this.agent.deleteContext(
        `${this.bossDecisionContext.type}:${gameId}`,
      );
      this.logger.log(`Service: Deleted context for game: ${gameId}`);
    } catch (error) {
      this.logger.error(
        `Service: Failed to delete context for game ${gameId}: ${error.message}`,
      );
    }
  }
}
