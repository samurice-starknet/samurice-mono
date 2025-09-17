// src/types/skill.ts
export type Skill = {
  name: string;
  damage: number;
  cooldown: number;
  description?: string; // Optional: Add a short description for the LLM to use
};

export type SkillMap = Record<string, Skill>;

export const skillTable: SkillMap = {
  Katana: {
    damage: 2,
    cooldown: 1,
    name: 'Katana',
    description: 'A swift and reliable blade, fundamental for any warrior.',
  },
  BackStrike: {
    damage: 3,
    cooldown: 3,
    name: 'BackStrike',
    description:
      'A powerful surprise attack, catching foes off-guard from behind.',
  },
  Swirl: {
    damage: 2,
    cooldown: 3,
    name: 'Swirl',
    description: 'A spinning attack that can strike multiple nearby enemies.',
  },
  Spear: {
    damage: 2,
    cooldown: 5,
    name: 'Spear',
    description: 'A thrusting weapon with good reach, keeping enemies at bay.',
  },
  ShadowKama: {
    damage: 3,
    cooldown: 3,
    name: 'ShadowKama',
    description:
      'A mystical kama imbued with shadow energy, striking with deadly precision.',
  },
  Arrow: {
    damage: 2,
    cooldown: 5,
    name: 'Arrow',
    description: 'A ranged projectile, perfect for engaging from a distance.',
  },
  Charge: {
    damage: 1,
    cooldown: 4,
    name: 'Charge',
    description:
      'A rushing attack that closes the distance quickly, though not highly damaging.',
  },
  ShadowDash: {
    damage: 1,
    cooldown: 5,
    name: 'ShadowDash',
    description:
      'A quick dash through the shadows, allowing for repositioning or a light strike.',
  },
  BackCharge: {
    damage: 1,
    cooldown: 3,
    name: 'BackCharge',
    description: 'A tactical retreat combined with a quick strike.',
  },
  BackShadowDash: {
    damage: 1,
    cooldown: 5,
    name: 'BackShadowDash',
    description: 'A rapid dash backward, phasing through shadows for evasion.',
  },
};

// Helper to get skill details string for the prompt
export function getSkillDetails(skillName: string): string | null {
  const skill = skillTable[skillName];
  if (!skill) return null;
  return `${skill.name} (Damage: ${skill.damage}, Cooldown: ${skill.cooldown} turns). ${skill.description || 'A useful combat skill.'}`;
}
