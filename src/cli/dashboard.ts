/**
 * @fileoverview SpotiNotes - Live CLI Sync Dashboard
 *
 * @description Renders a real-time, interactive terminal dashboard displaying Spotify playback, Facebook Messenger note synchronization, countdowns, and hotkey actions.
 * @author @Chrixtia
 */

import readline from 'readline';
import { pink, pinkBright, blue, green, gray, bold, renderBadge, colors } from './theme';

export type BotStatus = 'connecting' | 'syncing' | 'paused' | 'inactive_hours' | 'error';

export interface DashboardState {
  status: BotStatus;
  statusMessage: string;
  trackName: string;
  artistName: string;
  progressMs: number;
  durationMs: number;
  messengerNote: string;
  lastUpdated: string;
  userId: string | null;
  nextSyncSeconds: number;
  logs: string[];
}

/**
 * @class BotDashboard
 *
 * @description Manages interactive terminal UI rendering, state tracking, and raw keyboard input for the running bot.
 * @author @Chrixtia
 */
export class BotDashboard {
  private state: DashboardState;
  private keypressListener?: (chunk: any, key: readline.Key) => void;
  private onForceSync?: () => void;
  private onTogglePause?: () => void;
  private onReturnToMenu?: () => void;

  /**
   * @constructor
   *
   * @description Initializes dashboard state and sets default values.
   */
  constructor() {
    this.state = {
      status: 'connecting',
      statusMessage: 'Initializing connection...',
      trackName: 'Waiting for playback...',
      artistName: '-',
      progressMs: 0,
      durationMs: 0,
      messengerNote: 'None yet',
      lastUpdated: 'Never',
      userId: null,
      nextSyncSeconds: 0,
      logs: [],
    };
  }

  /**
   * @method registerHandlers
   *
   * @description Sets callback hooks for interactive keyboard shortcuts.
   * @param handlers Object containing user action callbacks
   * @returns Void
   */
  public registerHandlers(handlers: {
    onForceSync?: () => void;
    onTogglePause?: () => void;
    onReturnToMenu?: () => void;
  }): void {
    this.onForceSync = handlers.onForceSync;
    this.onTogglePause = handlers.onTogglePause;
    this.onReturnToMenu = handlers.onReturnToMenu;
  }

  /**
   * @method startInputCapture
   *
   * @description Configures raw terminal input to intercept keyboard shortcuts like S, P, B, and Q.
   * @returns Void
   */
  public startInputCapture(): void {
    if (!process.stdin.isTTY) {
      return;
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    this.keypressListener = (_chunk: any, key: readline.Key) => {
      if ((key.ctrl && key.name === 'c') || key.name === 'q') {
        this.stopInputCapture();
        console.clear();
        console.log(pink('\nGoodbye from SpotiNotes!\n'));
        process.exit(0);
      }

      if (key.name === 's' || key.name === 'space') {
        this.addLog('Manual sync triggered by user.');
        this.onForceSync?.();
      } else if (key.name === 'p') {
        this.onTogglePause?.();
      } else if (key.name === 'b' || key.name === 'm' || key.name === 'escape') {
        this.stopInputCapture();
        this.onReturnToMenu?.();
      }
    };

    process.stdin.on('keypress', this.keypressListener);
  }

  /**
   * @method stopInputCapture
   *
   * @description Restores normal terminal input mode and removes raw keypress listeners.
   * @returns Void
   */
  public stopInputCapture(): void {
    if (this.keypressListener) {
      process.stdin.removeListener('keypress', this.keypressListener);
      this.keypressListener = undefined;
    }
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }
  }

  /**
   * @method updateState
   *
   * @description Updates dashboard state fields and triggers an interface re-render.
   * @param partial Partial dashboard state update
   * @returns Void
   */
  public updateState(partial: Partial<DashboardState>): void {
    this.state = {
      ...this.state,
      ...partial,
    };
    this.render();
  }

  /**
   * @method addLog
   *
   * @description Appends a timestamped log entry to the internal circular event list.
   * @param message Text of the log message to add
   * @returns Void
   */
  public addLog(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const entry = `${gray(`[${timestamp}]`)} ${message}`;
    this.state.logs.push(entry);

    if (this.state.logs.length > 5) {
      this.state.logs.shift();
    }
    this.render();
  }

  /**
   * @method formatProgressBar
   *
   * @description Creates a visual ASCII progress bar showing track duration progress.
   * @param progress Progress in milliseconds
   * @param duration Total duration in milliseconds
   * @param width Character width of the progress bar
   * @returns Formatted progress bar string
   */
  private formatProgressBar(progress: number, duration: number, width: number = 26): string {
    if (!duration || duration <= 0) {
      return gray('─'.repeat(width));
    }

    const ratio = Math.min(Math.max(progress / duration, 0), 1);
    const completed = Math.round(width * ratio);
    const remaining = width - completed;

    return `${pink('█'.repeat(completed))}${gray('░'.repeat(remaining))}`;
  }

  /**
   * @method render
   *
   * @description Draws the full terminal dashboard with pink, blue, and green color coding.
   * @returns Void
   */
  public render(): void {
    if (!process.stdout.isTTY) {
      return;
    }

    const { state } = this;
    const border = pink('─'.repeat(70));

    let statusPill = renderBadge('Connecting', 'blue');
    if (state.status === 'syncing') {
      statusPill = renderBadge('SYNCING', 'green');
    } else if (state.status === 'paused') {
      statusPill = renderBadge('PAUSED', 'gray');
    } else if (state.status === 'inactive_hours') {
      statusPill = renderBadge('OUTSIDE ACTIVE HOURS', 'pink');
    } else if (state.status === 'error') {
      statusPill = renderBadge('ERROR', 'pink');
    }

    const pBar = this.formatProgressBar(state.progressMs, state.durationMs);
    const progressSeconds = Math.floor(state.progressMs / 1000);
    const durationSeconds = Math.floor(state.durationMs / 1000);
    const progressTime = `${Math.floor(progressSeconds / 60)}:${String(progressSeconds % 60).padStart(2, '0')}`;
    const totalTime = state.durationMs > 0
      ? `${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}`
      : '--:--';

    const logLines = state.logs.length > 0
      ? state.logs.map((l) => `  ${l}`).join('\n')
      : `  ${gray('No sync events recorded yet.')}`;

    const output = [
      '\x1b[2J\x1b[3J\x1b[H',
      border,
      `  ${bold(pinkBright('SPOTINOTES LIVE DASHBOARD'))}   ${statusPill}   ${gray(`ID: ${state.userId || 'Connecting...'}`)}`,
      border,
      `  ${blue('Status:')}    ${state.statusMessage}`,
      `  ${pink('Spotify:')}   ${bold(state.trackName)} ${gray('by')} ${state.artistName}`,
      `  ${pink('Progress:')}  [${pBar}] ${gray(`${progressTime} / ${totalTime}`)}`,
      `  ${blue('FB Note:')}   ${green(state.messengerNote.split('\n')[0])}`,
      `  ${gray('Last Set:')}  ${state.lastUpdated}   ${gray('•')}   ${blue('Next Check In:')} ${bold(green(`${state.nextSyncSeconds}s`))}`,
      border,
      `  ${bold(gray('RECENT ACTIVITY:'))}`,
      logLines,
      border,
      `  ${gray('Controls:')}  ${pink('[S]')} Sync Now   ${blue('[P]')} Pause/Resume   ${green('[B]')} Back to Menu   ${gray('[Q]')} Quit`,
      border,
    ].join('\n');

    process.stdout.write(output + '\n');
  }
}

export default BotDashboard;
