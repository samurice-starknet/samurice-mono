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

simpleUI.initializeUI();
simpleUI.logMessage(
  LogLevel.INFO,
  'Starting Bao - Guardian Merchant Agent (Natural Language Mode)...',
);

// Enum for what Bao is currently focused on selling/discussing
enum BaoOfferingFocus {
  POTIONS = 'potions',
  SKILL_INFO = 'skill_info',
  SKILL_PURCHASE = 'skill_purchase',
  HEALTH_SACRIFICE_INFO = 'health_sacrifice_info',
  HEALTH_SACRIFICE_CONFIRM = 'health_sacrifice_confirm',
  GENERAL_TALK = 'general_talk',
}

interface BaoInteractionState {
  healthPotionBaseValue: number;
  shieldPotionBaseValue: number;
  secretSkillPrice: number;
  itemDescription: string;
  minSellRatio: number;
  currentAskingPrice: number;
  lastPlayerOffer: number | null;
  lastPlayerRawMessage: string | null;
  negotiationActive: boolean;
  uniqueInteractionId: string;
  playerMoney: number;
  playerCurrentHealth: number;
  playerMaxHealth: number;
  currentFocus: BaoOfferingFocus;
  dialogueHistory: Array<{ speaker: 'player' | 'bao'; message: string }>;
  proposedHealthToSacrifice: number | null;
  proposedCoinsToGain: number | null;
}

@Injectable()
export class AIDealerService {
  private readonly logger = new Logger(AIDealerService.name);
  private agent: Agent<any>;
  private readonly baoContext;
  private readonly config = AiAgentConfigService.getInstance().getConfig();

  // Define items Bao sells
  static readonly BAO_ITEMS = {
    HEALTH_POTION: {
      name: 'Sacred Lotus Brew (Health Potion)',
      baseValue: 6,
      description:
        'A potent brew of sacred lotus petals, said to mend wounds and soothe the spirit. Cultivated only in the Whispering Glade.',
    },
    SHIELD_POTION: {
      name: 'Resilient Bamboo Elixir (Shield Potion)',
      baseValue: 4,
      description:
        'An elixir derived from enchanted bamboo sap, fortifying the body against harm. Its resilience mirrors the spirit of the Glade.',
    },
    SECRET_SKILL_RITUAL: {
      name: 'Ancestral Echo Ritual (Secret Skill)',
      price: 20,
      description:
        'A sacred ritual to commune with the ancestral spirits of the Glade. They may bestow upon you a fragment of their ancient knowledge. The outcome is not guaranteed, but a gift from the spirits.',
    },
  };

  static readonly MIN_HEALTH_PERCENT_FOR_SACRIFICE = 0.3; // Player must have at least 30% health
  static readonly MIN_HEALTH_ABSOLUTE_FOR_SACRIFICE = 2; // Player must have at least 2 absolute health
  static readonly COINS_PER_HEALTH_POINT_SACRIFICED = 3; // Example: 3 coins per 1 HP

  constructor() {
    this.baoContext = context({
      type: 'baoInteraction',
      schema: z.object({
        uniqueInteractionId: z
          .string()
          .describe('A unique ID for this interaction session'),
        initialPlayerMoney: z
          .number()
          .nonnegative()
          .nullable()
          .optional()
          .describe("The player's starting money (gems)"),
        initialPlayerCurrentHealth: z
          .number()
          .positive()
          .nullable()
          .optional()
          .describe("Player's current health"),
        initialPlayerMaxHealth: z
          .number()
          .positive()
          .nullable()
          .optional()
          .describe("Player's maximum health"),
      }),

      key({ uniqueInteractionId }) {
        return uniqueInteractionId;
      },

      create(state): BaoInteractionState {
        const args = state.args;
        simpleUI.logMessage(
          LogLevel.INFO,
          `[Context ${args.uniqueInteractionId}] Creating Bao interaction state. Initial money: ${args.initialPlayerMoney}, Health: ${args.initialPlayerCurrentHealth}/${args.initialPlayerMaxHealth}`,
        );

        const healthPotion = AIDealerService.BAO_ITEMS.HEALTH_POTION;
        const shieldPotion = AIDealerService.BAO_ITEMS.SHIELD_POTION;
        const secretSkill = AIDealerService.BAO_ITEMS.SECRET_SKILL_RITUAL;

        return {
          healthPotionBaseValue: healthPotion.baseValue,
          shieldPotionBaseValue: shieldPotion.baseValue,
          secretSkillPrice: secretSkill.price,
          itemDescription: `I offer ${healthPotion.name} and ${shieldPotion.name}.`,
          minSellRatio: 0.9,
          currentAskingPrice: 0,
          lastPlayerOffer: null,
          lastPlayerRawMessage: null,
          negotiationActive: true,
          uniqueInteractionId: args.uniqueInteractionId,
          playerMoney: args.initialPlayerMoney ?? 0,
          playerCurrentHealth: args.initialPlayerCurrentHealth ?? 100,
          playerMaxHealth: args.initialPlayerMaxHealth ?? 100,
          currentFocus: BaoOfferingFocus.POTIONS,
          dialogueHistory: [],
          proposedHealthToSacrifice: null,
          proposedCoinsToGain: null,
        };
      },

      render({ memory }) {
        const baoState = memory as BaoInteractionState;
        const historyString = baoState.dialogueHistory
          .slice(-5)
          .map(
            (entry) =>
              `${entry.speaker === 'player' ? 'Player' : 'Bao'}: ${entry.message}`,
          )
          .join('\n');
        const playerHealthStatus = `${baoState.playerCurrentHealth}/${baoState.playerMaxHealth} HP`;

        const baoTemplate = `
You are Bao, the Silent Guardian of the Whispering Glade. You are a Vietnamese warrior with the discipline and skill reminiscent of a samurai, sworn to protect this sacred place. You cultivate rare herbs and materials from the Glade to create potions, selling them to sustain your vigil. You are stoic, observant, and speak with calm authority. Your words are chosen carefully. The interaction is identified by ID: {{uniqueInteractionId}}.

<persona_details>
- Location: A secluded stall at the edge of the Whispering Glade, a place of spiritual energy and danger.
- Duty: Protect the Glade from those who would corrupt or exploit it. Selling potions is a means to this end.
- Demeanor: Quiet, respectful, wise. Not aggressive, but firm on the value of sacred items.
- Knowledge: Possesses ancient knowledge passed down through generations.
- Items for Sale:
    1.  "${AIDealerService.BAO_ITEMS.HEALTH_POTION.name}" ({{healthPotionBaseValue}} gems): ${AIDealerService.BAO_ITEMS.HEALTH_POTION.description}
    2.  "${AIDealerService.BAO_ITEMS.SHIELD_POTION.name}" ({{shieldPotionBaseValue}} gems): ${AIDealerService.BAO_ITEMS.SHIELD_POTION.description}
    3.  The "${AIDealerService.BAO_ITEMS.SECRET_SKILL_RITUAL.name}" ({{secretSkillPrice}} gems): ${AIDealerService.BAO_ITEMS.SECRET_SKILL_RITUAL.description}.
- Rituals: 
    1.  Can perform the "${AIDealerService.BAO_ITEMS.SECRET_SKILL_RITUAL.name}" to grant a random skill, but only if the player pays the price.
    2.  Blood for Coins: A dangerous pact. The Glade can convert life essence into material wealth. The exchange rate is roughly ${AIDealerService.COINS_PER_HEALTH_POINT_SACRIFICED} gems per point of vitality. A minimum vitality is required.
</persona_details>

## Player Status:
- Money: {{playerMoney}} gems
- Health: {{playerHealthStatus}}

## Interaction Goal:
Engage the player. Offer your wares appropriately. If asked or appropriate, discuss the Ancestral Echo Ritual or the option to sacrifice health for coins. Respond using 'baoResponseOutput'.

## Interaction Flow & Logic:

1.  **Initial Greeting / Turn (if \`lastPlayerRawMessage\` is empty):**
    *   You are at your stall. Greet the player calmly.
    *   State what you offer (initially Health and Shield potions).
    *   Example: "Welcome, traveler. The Glade provides. I offer brews for vitality and elixirs for protection. The Sacred Lotus Brew is {{healthPotionBaseValue}} gems, and the Resilient Bamboo Elixir is {{shieldPotionBaseValue}} gems."
    *   Set \`currentFocus\` to \`POTIONS\`. Set \`currentAskingPrice\` to 0 initially, or related to a specific potion if one was just mentioned.
    *   Use 'baoResponseOutput' with outcome 'offering_potions'.

2.  **Player Interaction (Processing \`lastPlayerRawMessage\`):**
    *   Analyze player's message: '{{lastPlayerRawMessage}}'.
    *   **Detect End/Stop Intent**: If the player wants to leave (e.g., "goodbye", "not interested now"), acknowledge politely. Set outcome to 'ended'. Example: "May your path be clear. The Glade will remain."
    *   **Player Asks About Potions / Wants to Buy Potions:**
        *   If just asking about a potion: Provide price and benefits. Set \`currentFocus\` to \`POTIONS\`. Outcome 'general_chat' or 'offering_potions'.
        *   If they want to buy potions (e.g., "I'll take a health potion", "I want 3 shield potions"):
            *   Identify potion type: "${AIDealerService.BAO_ITEMS.HEALTH_POTION.name}" (price {{healthPotionBaseValue}}) or "${AIDealerService.BAO_ITEMS.SHIELD_POTION.name}" (price {{shieldPotionBaseValue}}).
            *   Determine quantity. If not specified, assume 1.
            *   Calculate \`totalCost = quantity * potion_price\`.
            *   If player mentions multiple *types* of potions in one request (e.g., "health and shield potions"), politely ask them to specify one type at a time for now. Example: "Let us handle these one by one. Which potions would you like first?" Then await their response. Do not process the sale yet. Outcome 'clarification_needed_multi_item'.
            *   If player offers a price lower than the asking price, but at least {{minSellRatio}} of the base price (e.g., 90%) and they tried really hard with a good attitude, Bao may accept the offer with a calm or slightly amused comment, e.g., "You bargain well. The Glade accepts your offer of {{playerOffer}} gems." Set \`currentFocus\` to \`POTIONS\`. Outcome 'potion_sold'. In 'baoResponseOutput', include \`purchasedItems\` with the agreed price.
            *   If player offers a price lower than {{minSellRatio}} of the base price, politely decline: "The Glade's gifts are not so easily won for less. My price is fair." Outcome 'insufficient_funds'.
            *   If player accepts the full price or offers more than the base price, proceed as before.
            *   Check if \`playerMoney\` >= agreed price.
            *   If yes: "A wise choice. That will be \`agreed price\` gems." Outcome 'potion_sold'. In 'baoResponseOutput', include \`purchasedItems: [{ itemName: "identified_potion_name", quantity: identified_quantity, pricePerItem: agreed price, totalPrice: total_cost }]\`.
            *   If no: "It seems your coin purse is light for that (requires \`agreed price\` gems). Perhaps another time, or a smaller quantity?" Outcome 'insufficient_funds'.
    *   **Player Asks About "More" / "Secrets" / "Skills":**
        *   If thoughout the message history, player hasn't proven worthiness, be cryptic but respectful.
        *   Example: "The Glade holds many secrets, but its deepest gifts are not freely given. Show your respect for this land, prove your spirit, and perhaps the ancestors will look favorably upon you."
        *   Set \`currentFocus\` to \`GENERAL_TALK\`. Outcome 'info_provided_cryptic'.
    *   **Player Has Proven Worthiness:**
            *   **If Player Asks About Skills / Ancestral Knowledge:**
                *   "You have shown respect for the Glade. I can perform the ${AIDealerService.BAO_ITEMS.SECRET_SKILL_RITUAL.name}. It costs {{secretSkillPrice}} gems. The spirits decide the blessing..."
                *   Set \`currentFocus\` to \`SKILL_INFO\`. Set \`currentAskingPrice\` to {{secretSkillPrice}}. Outcome 'offering_skill_ritual'.
            *   **If Player Wants to Purchase Secret Skill Ritual (and \`currentFocus\` is \`SKILL_INFO\` or \`SKILL_PURCHASE\`):**
                *   Check if \`playerMoney\` >= {{secretSkillPrice}}.
                *   If yes: "Very well. That will be {{secretSkillPrice}} gems. Prepare your spirit." Set \`currentFocus\` to \`SKILL_PURCHASE\`. Outcome 'skill_ritual_accepted'. In 'baoResponseOutput', include \`purchasedItems: [{ itemName: "${AIDealerService.BAO_ITEMS.SECRET_SKILL_RITUAL.name}", quantity: 1, pricePerItem: {{secretSkillPrice}}, totalPrice: {{secretSkillPrice}} }]\`.
                *   If no: "The spirits ask for {{secretSkillPrice}} gems for such a communion. Return when prepared." Outcome 'insufficient_funds_skill'.
    *   **Health for Coins Inquiry/Offer:**
        *   If player asks about getting coins, seems desperate, or specifically asks about sacrificing health:
            *   "The Glade allows a dangerous exchange: vitality for coin. Such power comes at a cost to your essence. Are you certain you wish to explore this path? Your current health is {{playerHealthStatus}}."
            *   Set \`currentFocus\` to \`HEALTH_SACRIFICE_INFO\`. Outcome 'offering_health_sacrifice_info'.
        *   If player confirms interest in sacrifice (and \`currentFocus\` is \`HEALTH_SACRIFICE_INFO\`):
            *   Assess player health: Player must have > {{minHealthAbsoluteForSacrifice}} HP AND current HP > {{minHealthPercentForSacrifice}} * max HP.
            *   If too low: "Your life force ({{playerHealthStatus}}) is too fragile for such a sacrifice now. Preserve what you have." Outcome 'health_sacrifice_declined_low_health'.
            *   If OK to sacrifice: "How much of your vitality are you willing to offer? For every point of health, the Glade may grant {{coinsPerHealthPointSacrificed}} gems. What is the maximum health you would part with?"
            *   Set \`currentFocus\` to \`HEALTH_SACRIFICE_CONFIRM\`. Outcome 'prompt_health_sacrifice_amount'.
    *   **Player Proposes Health Sacrifice Amount (and \`currentFocus\` is \`HEALTH_SACRIFICE_CONFIRM\`):**
        *   Extract proposed health sacrifice amount (e.g., \`playerProposedHealthAmount\`).
        *   Validate: \`playerProposedHealthAmount\` must be > 0 and <= \`playerCurrentHealth\` - (\`playerMaxHealth\` * {{minHealthPercentForSacrificed}}) AND <= \`playerCurrentHealth\` - {{minHealthAbsoluteForSacrificed}}. Also, player must have at least 1 HP remaining after sacrifice.
        *   If invalid amount (too much, or leaves them too low): "That is too much. The Glade requires you retain a stronger life-force. You can offer less, or perhaps this path is not for you today. Your current health is {{playerHealthStatus}}." Outcome 'health_sacrifice_invalid_amount'.
        *   If valid: Calculate \`coinsToGain = playerProposedHealthAmount * {{coinsPerHealthPointSacrificed}}\`.
            *   "To offer {{playerProposedHealthAmount}} vitality for {{coinsToGain}} gems. This will leave you at {{playerCurrentHealth - playerProposedHealthAmount}} / {{playerMaxHealth}} health. Do you agree to this exchange?"
            *   Store \`proposedHealthToSacrifice = playerProposedHealthAmount\`, \`proposedCoinsToGain = coinsToGain\`. Outcome 'confirm_health_sacrifice_details'.
    *   **Player Confirms Specific Sacrifice (and \`currentFocus\` is \`HEALTH_SACRIFICE_CONFIRM\` and details are proposed):**
        *   If player agrees ("yes", "confirm", "I agree"): "So be it. The Glade accepts your offering." Outcome 'health_sacrifice_accepted'.
        *   If player declines ("no", "cancel"): "A wise choice perhaps. Vitality is precious." Set \`currentFocus\` to \`GENERAL_TALK\`. Outcome 'health_sacrifice_declined_player'.
    *   **General Conversation:**
        *   Respond politely and concisely, in character. Steer conversation back to your purpose if it strays too far.
        *   Example: "The wind whispers many things through the bamboo. What is on your mind?"
        *   Outcome 'general_chat'.

## Current Interaction State (ID: {{uniqueInteractionId}}):
Player Money: {{playerMoney}} gems
Player Health: {{playerHealthStatus}}
Current Focus: {{currentFocus}}
Your Current Asking Price (if applicable): {{currentAskingPrice}} gems
Proposed Health Sacrifice: {{proposedHealthToSacrifice}} HP for {{proposedCoinsToGain}} coins
Player's Last Message: {{lastPlayerRawMessageFormatted}}
Interaction Active: {{negotiationActive}}
Recent Dialogue:
{{dialogueHistory}}

## Your Task:
{{taskDescription}}

Remember to embody Bao's wisdom and calmness. You are a guardian, not just a merchant.
Your response should be natural and varied. You should not repeat the same phrases or structure.
Use 'baoResponseOutput' for your reply.
`;

        let taskDescription = '';
        if (!baoState.negotiationActive) {
          taskDescription = 'The interaction is concluded. Do nothing further.';
        } else if (baoState.lastPlayerRawMessage === null) {
          taskDescription = `This is the start of the interaction. Use 'baoResponseOutput' to greet the player, introduce your available potions (${AIDealerService.BAO_ITEMS.HEALTH_POTION.name} at ${baoState.healthPotionBaseValue} gems, ${AIDealerService.BAO_ITEMS.SHIELD_POTION.name} at ${baoState.shieldPotionBaseValue} gems), and set the outcome to 'offering_potions'.`;
        } else {
          taskDescription = `Analyze the player's last message: "${baoState.lastPlayerRawMessage}". Follow the 'Interaction Flow & Logic' carefully. Determine the player's intent. Update your focus and current asking price if necessary. Use the 'baoResponseOutput' action with your conversational response and the determined outcome.`;
        }

        return render(baoTemplate, {
          uniqueInteractionId: baoState.uniqueInteractionId,
          healthPotionBaseValue: baoState.healthPotionBaseValue,
          shieldPotionBaseValue: baoState.shieldPotionBaseValue,
          secretSkillPrice: baoState.secretSkillPrice,
          playerMoney: baoState.playerMoney.toFixed(0),
          playerHealthStatus: playerHealthStatus,
          playerCurrentHealth: baoState.playerCurrentHealth, // For direct checks in prompt if needed
          playerMaxHealth: baoState.playerMaxHealth, // For direct checks in prompt if needed
          minHealthAbsoluteForSacrifice:
            AIDealerService.MIN_HEALTH_ABSOLUTE_FOR_SACRIFICE,
          minHealthPercentForSacrifice:
            AIDealerService.MIN_HEALTH_PERCENT_FOR_SACRIFICE,
          coinsPerHealthPointSacrificed:
            AIDealerService.COINS_PER_HEALTH_POINT_SACRIFICED,
          currentFocus: baoState.currentFocus,
          currentAskingPrice: baoState.currentAskingPrice.toFixed(0),
          lastPlayerRawMessage: baoState.lastPlayerRawMessage,
          lastPlayerRawMessageFormatted: baoState.lastPlayerRawMessage
            ? `'${baoState.lastPlayerRawMessage}'`
            : 'No message yet',
          negotiationActive: baoState.negotiationActive,
          taskDescription: taskDescription,
          dialogueHistory: historyString,
          proposedHealthToSacrifice: baoState.proposedHealthToSacrifice,
          proposedCoinsToGain: baoState.proposedCoinsToGain,
        });
      },
      maxSteps: 1,
    });

    this.agent = createAgent({
      logLevel: LogLevel.DEBUG,
      model: groq(this.config.model),
      inputs: {
        'custom:playerMessage': input({
          schema: z.object({
            uniqueInteractionId: z.string(),
            playerMessage: z.string(),
            updatedPlayerMoney: z.number().optional().nullable(),
            updatedPlayerCurrentHealth: z.number().optional().nullable(),
            updatedPlayerMaxHealth: z.number().optional().nullable(),
          }),
          handler: async (data, ctx) => {
            const state = ctx.memory as BaoInteractionState;
            if (
              state &&
              state.uniqueInteractionId === data.uniqueInteractionId
            ) {
              state.lastPlayerRawMessage = data.playerMessage;
              state.dialogueHistory.push({
                speaker: 'player',
                message: data.playerMessage,
              });
              if (data.updatedPlayerMoney !== undefined)
                state.playerMoney =
                  data.updatedPlayerMoney || state.playerMoney;
              if (data.updatedPlayerCurrentHealth !== undefined)
                state.playerCurrentHealth =
                  data.updatedPlayerCurrentHealth || state.playerCurrentHealth;
              if (data.updatedPlayerMaxHealth !== undefined)
                state.playerMaxHealth =
                  data.updatedPlayerMaxHealth || state.playerMaxHealth;

              // Reset sacrifice proposal if player message is not directly confirming it
              if (
                state.currentFocus !==
                  BaoOfferingFocus.HEALTH_SACRIFICE_CONFIRM &&
                !data.playerMessage.toLowerCase().includes('yes') && // crude check, LLM should manage focus better
                !data.playerMessage.toLowerCase().includes('confirm')
              ) {
                state.proposedHealthToSacrifice = null;
                state.proposedCoinsToGain = null;
              }

              simpleUI.logMessage(
                LogLevel.DEBUG,
                `[Input Handler ${data.uniqueInteractionId}] Updated state. Player message: "${data.playerMessage}", Money: ${state.playerMoney}, Health: ${state.playerCurrentHealth}/${state.playerMaxHealth}`,
              );
            } else {
              simpleUI.logMessage(
                LogLevel.WARN,
                `[Input Handler ${data.uniqueInteractionId}] State mismatch or not found.`,
              );
            }
            return { data };
          },
          format: (ref) =>
            `[InputRef ${ref.data.uniqueInteractionId}] Player: "${ref.data.playerMessage}"`,
          context: this.baoContext,
        }),
      },
      outputs: {
        baoResponseOutput: output({
          description:
            "Sends Bao's conversational response and updates interaction state, including purchased items.",
          schema: z.object({
            message: z
              .string()
              .describe('The full conversational message Bao should say.'),
            outcome: z
              .enum([
                'offering_potions',
                'potion_sold',
                'insufficient_funds',
                'offering_skill_ritual',
                'skill_ritual_accepted',
                'insufficient_funds_skill',
                'info_provided_cryptic',
                'offering_health_sacrifice_info',
                'prompt_health_sacrifice_amount',
                'health_sacrifice_invalid_amount',
                'confirm_health_sacrifice_details',
                'health_sacrifice_accepted',
                'health_sacrifice_declined_low_health',
                'health_sacrifice_declined_player',
                'clarification_needed_multi_item',
                'general_chat',
                'ended',
              ])
              .describe('The logical outcome of this turn.'),
            purchasedItems: z
              .array(
                z.object({
                  // ADDED FOR STRUCTURED ITEM OUTPUT
                  itemName: z.string(),
                  quantity: z.number().int().positive(),
                  pricePerItem: z.number(),
                  totalPrice: z.number(),
                }),
              )
              .optional()
              .describe(
                'A list of items successfully purchased in this turn, if any.',
              ),
            newFocus: z.nativeEnum(BaoOfferingFocus).optional(),
            newAskingPrice: z.number().optional(),
            healthToSacrifice: z
              .number()
              .optional()
              .describe('HP player agreed to sacrifice.'),
            coinsGained: z
              .number()
              .optional()
              .describe('Coins gained from sacrifice.'),
            setProposedHealthSacrifice: z.number().optional(),
            setProposedCoinsGain: z.number().optional(),
          }),
          handler: async (data, ctx) => {
            const state = ctx.memory as BaoInteractionState;
            // Destructure purchasedItems from data
            const {
              message,
              outcome,
              newFocus,
              newAskingPrice,
              healthToSacrifice,
              coinsGained,
              setProposedHealthSacrifice,
              setProposedCoinsGain,
              purchasedItems,
            } = data;
            const interactionId = state.uniqueInteractionId;

            // Log the full data received from LLM for debugging
            simpleUI.logMessage(
              LogLevel.DEBUG,
              `[Output ${interactionId}] LLM Raw Output Data: ${JSON.stringify(data, null, 2)}`,
            );
            simpleUI.logAgentAction(
              'Response Output',
              `Bao (to ${interactionId}): ${message} (Outcome: ${outcome})`,
            );
            state.dialogueHistory.push({
              speaker: 'bao',
              message: message,
            });

            if (state.negotiationActive) {
              if (newFocus) state.currentFocus = newFocus;
              if (newAskingPrice !== undefined)
                state.currentAskingPrice = newAskingPrice;
              if (setProposedHealthSacrifice !== undefined)
                state.proposedHealthToSacrifice = setProposedHealthSacrifice;
              if (setProposedCoinsGain !== undefined)
                state.proposedCoinsToGain = setProposedCoinsGain;

              switch (outcome) {
                case 'potion_sold':
                  if (purchasedItems && purchasedItems.length > 0) {
                    simpleUI.logMessage(
                      LogLevel.INFO,
                      `[Output ${interactionId}] Potion(s) sold: ${JSON.stringify(purchasedItems)}. Game should update inventory/money.`,
                    );
                  } else {
                    simpleUI.logMessage(
                      LogLevel.WARN,
                      `[Output ${interactionId}] 'potion_sold' outcome but 'purchasedItems' is missing or empty.`,
                    );
                  }
                  break;
                case 'skill_ritual_accepted':
                  if (purchasedItems && purchasedItems.length > 0) {
                    simpleUI.logMessage(
                      LogLevel.INFO,
                      `[Output ${interactionId}] Skill ritual accepted: ${JSON.stringify(purchasedItems)}. Game should update player.`,
                    );
                  } else {
                    simpleUI.logMessage(
                      LogLevel.WARN,
                      `[Output ${interactionId}] 'skill_ritual_accepted' outcome but 'purchasedItems' is missing or empty.`,
                    );
                  }
                  break;
                case 'health_sacrifice_accepted':
                  if (healthToSacrifice && coinsGained) {
                    // Game logic deducts health, adds coins
                    // Example: state.playerCurrentHealth -= healthToSacrifice; state.playerMoney += coinsGained;
                    simpleUI.logMessage(
                      LogLevel.INFO,
                      `[Output ${interactionId}] Health sacrifice accepted: ${healthToSacrifice} HP for ${coinsGained} coins. Game should update state.`,
                    );
                    state.proposedHealthToSacrifice = null; // Clear proposal
                    state.proposedCoinsToGain = null;
                  } else {
                    simpleUI.logMessage(
                      LogLevel.WARN,
                      `[Output ${interactionId}] Health sacrifice accepted but missing amounts.`,
                    );
                  }
                  break;
                case 'ended':
                  state.negotiationActive = false;
                  break;
                case 'health_sacrifice_declined_player':
                case 'health_sacrifice_declined_low_health':
                case 'health_sacrifice_invalid_amount':
                  state.proposedHealthToSacrifice = null;
                  state.proposedCoinsToGain = null;
                  if (newFocus) state.currentFocus = newFocus;
                  else state.currentFocus = BaoOfferingFocus.GENERAL_TALK;
                  break;
              }
            }
            simpleUI.logMessage(
              LogLevel.DEBUG,
              `[Output ${interactionId}] Bao's state updated. Focus: ${state.currentFocus}, Asking: ${state.currentAskingPrice}, Sacrifice: ${state.proposedHealthToSacrifice} for ${state.proposedCoinsToGain}`,
            );
            // Pass the full data object from LLM, which now includes purchasedItems
            return { data };
          },
        }),
      },
    });

    this.agent.start();
    simpleUI.logMessage(
      LogLevel.INFO,
      'Bao agent (v2) background loop started.',
    );
  }

  public async initializeInteraction(
    interactionId: string,
    playerInitialMoney: number,
    playerInitialCurrentHealth: number,
    playerInitialMaxHealth: number,
  ): Promise<any> {
    try {
      simpleUI.logMessage(
        LogLevel.INFO,
        `Service: Initializing Bao interaction (v3): ${interactionId}`,
      );
      let response = await this.agent.run({
        context: this.baoContext,
        args: {
          uniqueInteractionId: interactionId,
          initialPlayerMoney: playerInitialMoney,
          initialPlayerCurrentHealth: playerInitialCurrentHealth,
          initialPlayerMaxHealth: playerInitialMaxHealth,
        },
      });
      response = parseAgentResponse(response); // Ensure this handles the new data structure if needed
      simpleUI.logMessage(
        LogLevel.INFO,
        `[${interactionId}] Bao context (v3) created. Initial response: ${JSON.stringify(response)}`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to initialize Bao interaction (v2) ${interactionId}: ${error.stack}`,
      );
      simpleUI.logMessage(
        LogLevel.ERROR,
        `[${interactionId}] Failed to initialize Bao (v2): ${error}`,
      );
      return {
        message: 'Bao seems troubled and does not respond.',
        outcome: 'error',
      };
    }
  }

  public async handlePlayerMessage(
    interactionId: string,
    message: string,
    currentPlayerMoney?: number,
    currentPlayerCurrentHealth?: number,
    currentPlayerMaxHealth?: number,
  ): Promise<any> {
    try {
      simpleUI.logMessage(
        LogLevel.INFO,
        `Service: Player message for ${interactionId} (v3): "${message}"`,
      );
      const sendArgs: any = {
        type: 'baoInteraction',
        uniqueInteractionId: interactionId,
      };
      const inputData: any = {
        uniqueInteractionId: interactionId,
        playerMessage: message,
      };
      // Conditionally add updated player stats if provided
      if (currentPlayerMoney !== undefined)
        inputData.updatedPlayerMoney = currentPlayerMoney;
      if (currentPlayerCurrentHealth !== undefined)
        inputData.updatedPlayerCurrentHealth = currentPlayerCurrentHealth;
      if (currentPlayerMaxHealth !== undefined)
        inputData.updatedPlayerMaxHealth = currentPlayerMaxHealth;

      let response = await this.agent.send({
        context: this.baoContext,
        args: sendArgs,
        input: { type: 'custom:playerMessage', data: inputData },
      });
      response = parseAgentResponse(response);
      simpleUI.logMessage(
        LogLevel.INFO,
        `[${interactionId}] Bao (v2) processed player message.`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to process player message for Bao (v2) ${interactionId}: ${error.stack}`,
      );
      simpleUI.logMessage(
        LogLevel.ERROR,
        `[${interactionId}] Failed to process message for Bao (v2): ${error}`,
      );
      return {
        message: "Bao regards you silently, the Glade's secrets held close.",
        outcome: 'error',
      };
    }
  }

  public async reset(agentId: string): Promise<void> {
    await this.agent.deleteContext('baoInteraction:' + agentId);
  }
}
