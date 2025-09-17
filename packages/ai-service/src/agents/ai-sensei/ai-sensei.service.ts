// src/ai-agents/sensei-agent/ai-sensei.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  createAgent,
  context,
  render,
  LogLevel,
  extension,
  output,
  input,
  Agent,
} from '@axiomkit/core';
import { z } from 'zod';
import { groq } from '@ai-sdk/groq';
import { simpleUI } from '../simple-ui/simple-ui';

import { parseAgentResponse } from '../utils/response-parser';

import { AiAgentConfigService } from '@app/shared/config/config-agent';
import { getSkillDetails } from '@app/shared/utils/data/skill';

simpleUI.logMessage(LogLevel.INFO, 'Starting Sensei - Skill Master Agent...');

interface SenseiInteractionState {
  walletAddress: string;
  currentSkills: string[]; // Array of skill names
  lastPlayerMessage: string | null;
  interactionActive: boolean;
  dialogueHistory: Array<{ speaker: 'player' | 'sensei'; message: string }>;
}

@Injectable()
export class AISenseiService {
  private readonly logger = new Logger(AISenseiService.name);
  private agent: Agent<any>;
  private readonly senseiContext;
  private readonly config = AiAgentConfigService.getInstance().getConfig();

  constructor() {
    this.senseiContext = context({
      type: 'senseiInteraction',
      schema: z.object({
        walletAddress: z
          .string()
          .describe("The player's wallet address for identification"),
        initialPlayerSkills: z
          .array(z.string())
          .nullable()
          .optional()
          .describe("The player's current list of skill names"),
        playerMessage: z.string().nullable().optional(),
      }),

      key({ walletAddress }) {
        // Using walletAddress as the unique key for the context
        return walletAddress;
      },

      create({ args }): SenseiInteractionState {
        console.log('What Controller args:', args);
        simpleUI.logMessage(
          LogLevel.INFO,
          `[Sensei Context] Creating Sensei interaction state for wallet: ${args.walletAddress}. Skills: `,
        );

        return {
          walletAddress: args.walletAddress,
          currentSkills: args.initialPlayerSkills || [],
          lastPlayerMessage: null,
          interactionActive: true,
          dialogueHistory: [],
        };
      },

      render({ memory }) {
        const senseiState = memory as SenseiInteractionState;

        const historyString = senseiState.dialogueHistory
          .slice(-5)
          .map(
            (entry) =>
              `${entry.speaker === 'player' ? 'Player' : 'Sensei'}: ${entry.message}`,
          )
          .join('\n');

        let skillsDisplay = 'You currently possess no documented skills.';
        if (senseiState.currentSkills.length > 0) {
          skillsDisplay =
            'You currently possess the following skills:\n' +
            senseiState.currentSkills
              .map((skillName) => {
                const details = getSkillDetails(skillName);
                return details
                  ? `- ${details}`
                  : `- ${skillName} (Details unknown)`;
              })
              .join('\n');
        }

        // Removed {{uniqueInteractionId}} from the prompt template
        const senseiTemplate = `
You are Sensei Ishikawa, a wise and patient master of martial arts and ancient combat techniques. You reside in a tranquil dojo, offering guidance to warriors seeking to understand their abilities. You speak calmly, with clarity and insight.

<persona_details>
- Location: A serene dojo, adorned with scrolls and practice weapons.
- Role: Guide warriors in understanding and mastering their skills.
- Demeanor: Wise, patient, observant, encouraging. You avoid direct combat predictions but explain skill mechanics and potential uses.
- Knowledge: Deep understanding of all skills in the provided skill table.
</persona_details>

## Player Status (Wallet: {{walletAddress}}):
{{skillsDisplay}}

## Interaction Goal:
Help the player understand their current skills. Answer their questions about specific skills they possess, explaining their damage, cooldown, and offering a brief tactical insight or lore. If they ask about skills they don't have, you can gently tell them that knowledge is for those who have earned it.

## Interaction Flow & Logic:

1.  **Initial Greeting / Turn (if \`lastPlayerMessage\` is empty):**
    *   Greet the player warmly. Acknowledge their presence (by walletAddress).
    *   If they have skills, you might briefly mention your purpose.
    *   Example: "Welcome, warrior. I see you have begun your journey. Select a skill and I shall endeavor to illuminate the path of your ability."
    *   Use 'senseiResponseOutput' with outcome 'greeting_sent'.

2.  **Player Interaction (Processing \`lastPlayerMessage\`):**
    *   Analyze the player's message: '{{lastPlayerMessage}}'.
    *   **Detect End/Stop Intent**: If the player wants to leave, acknowledge politely. Outcome 'ended'.
    *   **Player Asks About Their Skills (General):**
        *   Reiterate skills from {{skillsDisplay}}. Offer to explain one. Outcome 'skills_listed'.
    *   **Player Asks About a Specific Skill They POSSESS:**
        *   Provide details (damage, cooldown, description). Outcome 'skill_explained'.
    *   **Player Asks About a Skill They DO NOT POSSESS:**
        *   Politely state this knowledge is not yet for them. Outcome 'skill_not_owned'.
    *   **Player Asks "How to use [skill name]":**
        *   Treat as specific skill query. Outcome 'skill_explained'.
    *   **General Conversation / Unclear Intent:**
        *   Respond politely, guide back to skills. Outcome 'general_chat'. And also tell them to try and hit the dummy to practice their skills.

## Current Interaction State (Wallet: {{walletAddress}}):
Player's Last Message: {{lastPlayerMessageFormatted}}
Interaction Active: {{interactionActive}}
Recent Dialogue:
{{dialogueHistory}}

## Your Task:
{{taskDescription}}

Embody Sensei Ishikawa. Be wise, patient, and clear in your explanations.
Your response should be natural. Use 'senseiResponseOutput' for your reply.
`;

        let taskDescription = '';
        if (!senseiState.interactionActive) {
          taskDescription = 'The interaction is concluded. Do nothing further.';
        } else if (senseiState.lastPlayerMessage === null) {
          taskDescription = `This is the start of the interaction with player (wallet: {{walletAddress}}). Use 'senseiResponseOutput' to greet the player, and set the outcome to 'greeting_sent'.`;
        } else {
          taskDescription = `Analyze the player's (wallet: {{walletAddress}}) last message: "${senseiState.lastPlayerMessage}". Follow the 'Interaction Flow & Logic' carefully. Determine the player's intent. Use the 'senseiResponseOutput' action with your conversational response and the determined outcome.`;
        }

        return render(senseiTemplate, {
          walletAddress: senseiState.walletAddress,
          skillsDisplay: skillsDisplay,
          lastPlayerMessage: senseiState.lastPlayerMessage,
          lastPlayerMessageFormatted: senseiState.lastPlayerMessage
            ? `'${senseiState.lastPlayerMessage}'`
            : 'No message yet',
          interactionActive: senseiState.interactionActive,
          taskDescription: taskDescription,
          dialogueHistory: historyString,
        });
      },
      maxSteps: 1,
    });

    this.agent = createAgent({
      logLevel: LogLevel.DEBUG,
      model: groq(this.config.model),
      inputs: {
        'custom:playerSenseiMessage': input({
          schema: z.object({
            walletAddress: z
              .string()
              .describe("The player's wallet address to identify the context"), // Changed from uniqueInteractionId
            playerMessage: z.string(),
          }),
          handler: async (data, ctx) => {
            const state = ctx.memory as SenseiInteractionState;
            // Match context using walletAddress
            if (state && state.walletAddress === data.walletAddress) {
              state.lastPlayerMessage = data.playerMessage;
              state.dialogueHistory.push({
                speaker: 'player',
                message: data.playerMessage,
              });
              simpleUI.logMessage(
                LogLevel.DEBUG,
                `[Sensei Input Handler for ${data.walletAddress}] Updated state. Player message: "${data.playerMessage}"`,
              );
            } else {
              simpleUI.logMessage(
                LogLevel.WARN,
                `[Sensei Input Handler for ${data.walletAddress}] State mismatch or not found for wallet. Current state wallet: ${state?.walletAddress}`,
              );
            }
            return { data }; // Return original data structure for Daydream to process
          },
          format: (ref) =>
            `[Sensei InputRef for ${ref.data.walletAddress}] Player: "${ref.data.playerMessage}"`, // Using walletAddress in format
          context: this.senseiContext,
        }),
      },
      outputs: {
        senseiResponseOutput: output({
          description:
            "Sends Sensei's conversational response and updates interaction state.",
          schema: z.object({
            message: z
              .string()
              .describe('The full conversational message Sensei should say.'),
            outcome: z
              .enum([
                'greeting_sent',
                'skill_explained',
                'skills_listed',
                'skill_not_owned',
                'general_chat',
                'ended',
              ])
              .describe('The logical outcome of this turn for Sensei.'),
          }),
          handler: async (data, ctx) => {
            const state = ctx.memory as SenseiInteractionState;
            const { message, outcome } = data;
            // Use state.walletAddress for logging context
            const playerWalletAddress = state.walletAddress;
            simpleUI.logMessage(
              LogLevel.INFO,
              `[Sensei Output for ${playerWalletAddress}] Sensei: ${message} (Outcome: ${outcome})`,
            );
            state.dialogueHistory.push({
              speaker: 'sensei',
              message: message,
            });

            if (state.interactionActive) {
              if (outcome === 'ended') {
                state.interactionActive = false;
              }
            }
            simpleUI.logMessage(
              LogLevel.DEBUG,
              `[Sensei Output for ${playerWalletAddress}] Sensei's state updated. Interaction active: ${state.interactionActive}`,
            );
            return {
              data: { message, outcome },
            };
          },
        }),
      },
    });

    this.agent.start();
    simpleUI.logMessage(LogLevel.INFO, 'Sensei agent background loop started.');
  }

  public async initializeInteraction(
    walletAddress: string,
    initialPlayerSkills: string[],
  ): Promise<any> {
    try {
      simpleUI.logMessage(
        LogLevel.INFO,
        `Service: Initializing Sensei interaction for wallet ${walletAddress}`,
      );
      let response = await this.agent.run({
        context: this.senseiContext,
        args: {
          // These args are used by the context's `key` and `create` functions
          walletAddress: walletAddress,
          initialPlayerSkills: initialPlayerSkills,
        },
      });
      response = parseAgentResponse(response);
      simpleUI.logMessage(
        LogLevel.INFO,
        `[Sensei for ${walletAddress}] Sensei context created. Initial response generated.`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to initialize Sensei interaction for wallet ${walletAddress}: ${error.stack || error}`,
      );
      simpleUI.logMessage(
        LogLevel.ERROR,
        `[Sensei for ${walletAddress}] Failed to initialize Sensei: ${error}`,
      );
      return {
        message:
          'The Sensei seems contemplative and does not speak at this moment.',
        outcome: 'error',
      };
    }
  }

  public async handlePlayerMessage(
    walletAddress: string, // Changed from interactionId
    message: string,
  ): Promise<any> {
    try {
      simpleUI.logMessage(
        LogLevel.INFO,
        `Service: Player message for Sensei (wallet: ${walletAddress}): "${message}"`,
      );
      const sendArgs: any = {
        type: 'senseiInteraction',
        walletAddress: walletAddress, // Use walletAddress to find the context
        playerMessage: message,
      };
      const inputData: any = {
        walletAddress: walletAddress, // Pass walletAddress in the input data
        playerMessage: message,
      };

      let response = await this.agent.send({
        context: this.senseiContext,
        args: sendArgs, // These args are used to find the existing context instance
        input: { type: 'custom:playerSenseiMessage', data: inputData },
      });
      response = parseAgentResponse(response);
      simpleUI.logMessage(
        LogLevel.INFO,
        `[Sensei for ${walletAddress}] Sensei processed player message.`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to process player message for Sensei (wallet: ${walletAddress}): ${error.stack || error}`,
      );
      simpleUI.logMessage(
        LogLevel.ERROR,
        `[Sensei for ${walletAddress}] Failed to process message for Sensei: ${error}`,
      );
      return {
        message:
          'The Sensei nods slowly, considering your words, but remains silent for now.',
        outcome: 'error',
      };
    }
  }

  public async reset(agentId: string): Promise<void> {
    await this.agent.deleteContext('senseiInteraction:' + agentId);
  }
}
