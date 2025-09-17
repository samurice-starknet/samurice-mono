import { LogLevel } from '@axiomkit/core';

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

// Map log levels to colors
const LOG_LEVEL_COLORS = {
  [LogLevel.TRACE]: COLORS.dim + COLORS.white,
  [LogLevel.DEBUG]: COLORS.blue,
  [LogLevel.INFO]: COLORS.green,
  [LogLevel.WARN]: COLORS.yellow,
  [LogLevel.ERROR]: COLORS.red,
};

// Map game elements to colors
const GAME_COLORS = {
  rock: COLORS.red,
  paper: COLORS.green,
  scissor: COLORS.blue,
  health: COLORS.red,
  mana: COLORS.blue,
  gold: COLORS.yellow,
  enemy: COLORS.magenta,
  loot: COLORS.cyan,
};

// Clear the terminal
export function clearScreen(): void {
  process.stdout.write('\x1Bc');
}

// Print a section header
export function printHeader(title: string): void {
  const width = process.stdout.columns || 80;
  const padding = '='.repeat(Math.floor((width - title.length - 4) / 2));
  console.log(
    `\n${padding} ${COLORS.bright}${title}${COLORS.reset} ${padding}\n`,
  );
}

// Create a visual progress bar
function createProgressBar(percentage: number, color: string): string {
  const width = 20;
  const filledWidth = Math.floor((percentage / 100) * width);
  const emptyWidth = width - filledWidth;

  const filled = '█'.repeat(filledWidth);
  const empty = '░'.repeat(emptyWidth);

  return `${color}${filled}${COLORS.reset}${empty} ${percentage}%`;
}

// Print a log message
export function logMessage(level: LogLevel, message: string): void {
  const color = LOG_LEVEL_COLORS[level] || COLORS.white;
  const levelName = LogLevel[level].toUpperCase();
  const timestamp = new Date().toLocaleTimeString();
  console.log(
    `${color}[${timestamp}] [${levelName}] ${message}${COLORS.reset}`,
  );
}

// Print player stats
export function printPlayerStats(playerState: any): void {
  if (!playerState) {
    console.log(`${COLORS.yellow}No player data available${COLORS.reset}`);
    return;
  }

  printHeader('Player Stats');

  const { health, maxHealth, gold, level, inventory } = playerState;

  // Create a health bar
  const healthPercentage = Math.floor((health / maxHealth) * 100);
  const healthBar = createProgressBar(healthPercentage, COLORS.red);

  console.log(
    `${COLORS.bright}Health:${COLORS.reset} ${health}/${maxHealth} ${healthBar}`,
  );
  console.log(`${COLORS.bright}Level:${COLORS.reset} ${level}`);
  console.log(
    `${COLORS.bright}Gold:${COLORS.reset} ${COLORS.yellow}${gold}${COLORS.reset}`,
  );

  // Format inventory if available
  if (inventory && inventory.length > 0) {
    console.log(`\n${COLORS.bright}Inventory:${COLORS.reset}`);
    inventory.forEach((item: any) => {
      console.log(`  - ${item.name} (${item.quantity})`);
    });
  } else {
    console.log(`\n${COLORS.bright}Inventory:${COLORS.reset} None`);
  }
}

export function logAgentAction(action: string, result: any): void {
  // Format the action for display
  const timestamp = new Date().toLocaleTimeString();
  console.log(
    `\n${COLORS.bright}[${timestamp}] Agent Action:${COLORS.reset} ${action}`,
  );

  // Add result information if available
  if (result) {
    if (result.success) {
      console.log(`${COLORS.green}✓ Success:${COLORS.reset} ${result.message}`);
    } else {
      console.log(`${COLORS.red}✗ Failed:${COLORS.reset} ${result.message}`);
    }
  }
}

export function printDivider(): void {
  const width = process.stdout.columns || 80;
  console.log('\n' + '-'.repeat(width) + '\n');
}

// Print help information
export function printHelp(): void {
  printHeader('Help');
  console.log('This is a simple terminal UI for the Gigaverse game.');
  console.log('Press Ctrl+C to exit the application.');
}

// Initialize the UI
export function initializeUI(): void {
  clearScreen();
  console.log(
    `${COLORS.green}${COLORS.bright}Crimsonfate Terminal UI${COLORS.reset}`,
  );
  console.log(
    `${COLORS.dim}A simpler alternative to the blessed-based UI${COLORS.reset}`,
  );
  printDivider();
}

// Export a simple UI object
export const simpleUI = {
  clearScreen,
  printHeader,
  logMessage,
  printPlayerStats,

  logAgentAction,

  printDivider,
  printHelp,
  initializeUI,
};
