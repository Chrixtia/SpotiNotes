/**
 * @fileoverview SpotiNotes - Terminal Theme & UI Styling
 *
 * @description Defines ANSI styling utilities, color palettes (pink primary, blue, green accents), and UI formatting components for the CLI interface.
 * @author @Chrixtia
 */

const ESC = '\x1b[';

export const colors = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  italic: `${ESC}3m`,
  underline: `${ESC}4m`,
  pink: `${ESC}38;2;255;121;198m`,
  pinkBright: `${ESC}38;2;255;105;180m`,
  pinkBg: `${ESC}48;2;255;121;198;38;2;20;20;25m`,
  blue: `${ESC}38;2;139;233;253m`,
  blueBright: `${ESC}38;2;100;200;255m`,
  blueBg: `${ESC}48;2;139;233;253;38;2;20;20;25m`,
  green: `${ESC}38;2;80;250;123m`,
  greenBright: `${ESC}38;2;50;230;100m`,
  greenBg: `${ESC}48;2;80;250;123;38;2;20;20;25m`,
  yellow: `${ESC}38;2;241;250;140m`,
  red: `${ESC}38;2;255;85;85m`,
  gray: `${ESC}38;2;120;120;140m`,
  white: `${ESC}38;2;248;248;242m`,
};

/**
 * @function paint
 *
 * @description Wraps a text string in the specified ANSI color and resets style afterward.
 * @param text The text to colorize
 * @param color The ANSI color code sequence
 * @returns Styled text string
 */
export function paint(text: string, color: string): string {
  return `${color}${text}${colors.reset}`;
}

/**
 * @function pink
 *
 * @description Applies the primary pink color to the text.
 * @param text The text to format
 * @returns Pink-colored text
 */
export function pink(text: string): string {
  return paint(text, colors.pink);
}

/**
 * @function pinkBright
 *
 * @description Applies bright vivid pink color to the text.
 * @param text The text to format
 * @returns Bright pink-colored text
 */
export function pinkBright(text: string): string {
  return paint(text, colors.pinkBright);
}

/**
 * @function blue
 *
 * @description Applies the secondary blue color to the text.
 * @param text The text to format
 * @returns Blue-colored text
 */
export function blue(text: string): string {
  return paint(text, colors.blue);
}

/**
 * @function green
 *
 * @description Applies the accent green color to the text.
 * @param text The text to format
 * @returns Green-colored text
 */
export function green(text: string): string {
  return paint(text, colors.green);
}

/**
 * @function gray
 *
 * @description Applies muted gray color to the text.
 * @param text The text to format
 * @returns Gray-colored text
 */
export function gray(text: string): string {
  return paint(text, colors.gray);
}

/**
 * @function bold
 *
 * @description Applies bold text weight.
 * @param text The text to format
 * @returns Bold text
 */
export function bold(text: string): string {
  return `${colors.bold}${text}${colors.reset}`;
}

/**
 * @function renderBanner
 *
 * @description Generates the styled SpotiNotes ASCII banner with pink, blue, and green gradients.
 * @returns The formatted banner string
 */
export function renderBanner(): string {
  const line = pink('═'.repeat(68));
  return [
    line,
    `${pinkBright('  ███████╗██████╗  ██████╗ ████████╗██╗███╗   ██╗ ██████╗ ████████╗███████╗███████╗')}`,
    `${pink('  ██╔════╝██╔══██╗██╔═══██╗╚══██╔══╝██║████╗  ██║██╔═══██╗╚══██╔══╝██╔════╝██╔════╝')}`,
    `${pink('  ███████╗██████╔╝██║   ██║   ██║   ██║██╔██╗ ██║██║   ██║   ██║   █████╗  ███████╗')}`,
    `${blue('  ╚════██║██╔═══╝ ██║   ██║   ██║   ██║██║╚██╗██║██║   ██║   ██║   ██╔══╝  ╚════██║')}`,
    `${blue('  ███████║██║     ╚██████╔╝   ██║   ██║██║ ╚████║╚██████╔╝   ██║   ███████╗███████║')}`,
    `${green('  ╚══════╝╚═╝      ╚═════╝    ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝    ╚═╝   ╚══════╝╚══════╝')}`,
    line,
    `  ${pink('Spotify Playback')} ${gray('→')} ${blue('Facebook Messenger Notes Sync')}  ${gray('•')}  ${green('CLI Edition')}`,
    line,
  ].join('\n');
}

/**
 * @function renderBadge
 *
 * @description Renders a pill-shaped badge with inverted background colors.
 * @param text Label text inside the badge
 * @param variant Visual color scheme: 'pink' | 'blue' | 'green' | 'gray'
 * @returns Styled badge string
 */
export function renderBadge(text: string, variant: 'pink' | 'blue' | 'green' | 'gray'): string {
  switch (variant) {
    case 'pink':
      return `${colors.pinkBg} ${text.toUpperCase()} ${colors.reset}`;
    case 'blue':
      return `${colors.blueBg} ${text.toUpperCase()} ${colors.reset}`;
    case 'green':
      return `${colors.greenBg} ${text.toUpperCase()} ${colors.reset}`;
    default:
      return `${colors.dim} ${text.toUpperCase()} ${colors.reset}`;
  }
}
