/**
 * @fileoverview SpotiNotes - Main CLI Application & Coordinator
 *
 * @description Interactive terminal CLI interface providing bot synchronization, live dashboard management, Spotify authorization, and configuration diagnostics.
 * @author @Chrixtia
 */

import fs from 'fs';
import prompts from 'prompts';
import login, { AppStateCookie, StfcaApi } from 'stfca';
import CONFIG, {
  hasValidAppState,
  hasValidSpotifyCredentials,
  saveEnvVariable,
} from './config';
import {
  getDetailedSpotifyPlayback,
  refreshSpotifyToken,
} from './services/spotify';
import {
  getUserIdFromAppState,
  updateMessengerNote,
  setCurrentUserId,
} from './services/messenger';
import { isWithinActiveHours } from './utils';
import { BotDashboard } from './cli/dashboard';
import { generateSpotifyRefreshToken } from './cli/tokenGenerator';
import {
  renderBanner,
  pink,
  pinkBright,
  blue,
  green,
  gray,
  bold,
} from './cli/theme';

let isBotRunning = false;
let isPaused = false;
let activeIntervalTimer: NodeJS.Timeout | null = null;
let activeCountdownTimer: NodeJS.Timeout | null = null;
let activeApi: StfcaApi | null = null;
let lastSetNote: string | null = null;
const dashboard = new BotDashboard();

/**
 * @function clearConsole
 *
 * @description Clears the terminal screen and resets cursor position.
 * @returns Void
 */
function clearConsole(): void {
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
}

/**
 * @function showDiagnosticsSummary
 *
 * @description Prints visual indicators showing setup status for Spotify credentials and Facebook appstate.
 * @returns Void
 */
function showDiagnosticsSummary(): void {
  const spotifyStatus = hasValidSpotifyCredentials()
    ? green('Ready [Configured: OK]')
    : pink('Action Needed [Missing Credentials: NO]');

  const appStateStatus = hasValidAppState()
    ? green(`Ready [Found at ${CONFIG.appStatePath}: OK]`)
    : pink(`Action Needed [Missing at ${CONFIG.appStatePath}: NO]`);

  console.log(`  ${bold(blue('SYSTEM DIAGNOSTICS:'))}`);
  console.log(`  ${gray('•')} ${pink('Spotify Credentials:')} ${spotifyStatus}`);
  console.log(`  ${gray('•')} ${blue('Facebook AppState:')}   ${appStateStatus}`);
  console.log(`  ${gray('•')} ${green('Active Hours Window:')} ${bold(`${CONFIG.activeHours.start}:00 - ${CONFIG.activeHours.end}:00 (GMT+${CONFIG.timezoneOffset})`)}`);
  console.log(`  ${pink('─'.repeat(68))}\n`);
}

/**
 * @function syncCycle
 *
 * @description Executes a single sync iteration between Spotify and Facebook Messenger notes.
 * @returns Promise resolving to void
 */
async function syncCycle(): Promise<void> {
  if (!isBotRunning || isPaused || !activeApi) {
    return;
  }

  if (!isWithinActiveHours()) {
    dashboard.updateState({
      status: 'inactive_hours',
      statusMessage: 'Outside active operating hours. Waiting...',
    });
    dashboard.addLog('Currently outside active hours window.');
    return;
  }

  dashboard.updateState({
    status: 'syncing',
    statusMessage: 'Checking Spotify playback...',
  });

  try {
    const playback = await getDetailedSpotifyPlayback();

    dashboard.updateState({
      trackName: playback.trackName || 'No track playing',
      artistName: playback.artistName || '-',
      progressMs: playback.progressMs || 0,
      durationMs: playback.durationMs || 0,
    });

    if (!playback.isPlaying) {
      dashboard.updateState({
        statusMessage: 'No active playback above minimum play threshold.',
      });
      dashboard.addLog('No active playback detected.');
      return;
    }

    updateMessengerNote(
      activeApi,
      playback.formattedNote,
      lastSetNote,
      (err, newLastSetNote, wasSkipped) => {
        if (err) {
          dashboard.addLog(`Failed to update note: ${err.message}`);
          dashboard.updateState({
            statusMessage: `Sync error: ${err.message}`,
          });
        } else if (wasSkipped) {
          dashboard.addLog('Note is already up to date. Skipped update.');
          dashboard.updateState({
            statusMessage: 'Note content unchanged.',
          });
        } else {
          lastSetNote = newLastSetNote;
          dashboard.addLog(`Note updated: "${playback.trackName}"`);
          dashboard.updateState({
            messengerNote: playback.formattedNote,
            lastUpdated: new Date().toLocaleTimeString(),
            statusMessage: 'Successfully updated Facebook Messenger note!',
          });
        }
      }
    );
  } catch (err: any) {
    dashboard.addLog(`Spotify query failed: ${err?.message || err}`);
    dashboard.updateState({
      statusMessage: `Spotify error: ${err?.message || err}`,
    });
  }
}

/**
 * @function scheduleNextSync
 *
 * @description Computes next random sync delay, manages interval timers, and ticks down remaining seconds on dashboard.
 * @returns Void
 */
function scheduleNextSync(): void {
  if (!isBotRunning || isPaused) {
    return;
  }

  if (activeIntervalTimer) {
    clearTimeout(activeIntervalTimer);
  }
  if (activeCountdownTimer) {
    clearInterval(activeCountdownTimer);
  }

  const [min, max] = CONFIG.updateIntervalRange;
  const nextIntervalMs = Math.floor(Math.random() * (max - min + 1) + min);
  let remainingSeconds = Math.floor(nextIntervalMs / 1000);

  dashboard.updateState({ nextSyncSeconds: remainingSeconds });

  activeCountdownTimer = setInterval(() => {
    if (isBotRunning && !isPaused && remainingSeconds > 0) {
      remainingSeconds -= 1;
      dashboard.updateState({ nextSyncSeconds: remainingSeconds });
    }
  }, 1000);

  activeIntervalTimer = setTimeout(async () => {
    await syncCycle();
    scheduleNextSync();
  }, nextIntervalMs);
}

/**
 * @function stopBotSession
 *
 * @description Halts bot sync loop, cleans active timers, and stops raw keyboard listening.
 * @returns Void
 */
function stopBotSession(): void {
  isBotRunning = false;
  isPaused = false;

  if (activeIntervalTimer) {
    clearTimeout(activeIntervalTimer);
    activeIntervalTimer = null;
  }
  if (activeCountdownTimer) {
    clearInterval(activeCountdownTimer);
    activeCountdownTimer = null;
  }

  dashboard.stopInputCapture();
}

/**
 * @function startBotSession
 *
 * @description Validates prerequisites, establishes connection with Facebook via ST-FCA, and initiates the sync loop.
 * @returns Promise resolving to void
 */
async function startBotSession(): Promise<void> {
  if (!hasValidAppState()) {
    console.log(pink('\n  [Notice] Missing Facebook AppState File!'));
    console.log(gray(`  Could not find "${CONFIG.appStatePath}".`));
    console.log(gray('  Please export your Facebook cookies (c_user, xs, etc.) into appstate.json.'));
    await prompts({
      type: 'invisible',
      name: 'continue',
      message: 'Press Enter to return to main menu...',
    });
    return;
  }

  if (!hasValidSpotifyCredentials()) {
    console.log(pink('\n  [Notice] Incomplete Spotify Credentials!'));
    console.log(gray('  Please set SpotifyClientID, SpotifyClientSecret, and SpotifyRefreshToken in .env.'));
    console.log(blue('  Tip: You can use "Authorize Spotify" from the main menu to generate a refresh token.'));
    await prompts({
      type: 'invisible',
      name: 'continue',
      message: 'Press Enter to return to main menu...',
    });
    return;
  }

  const userId = getUserIdFromAppState();
  setCurrentUserId(userId);

  dashboard.updateState({
    status: 'connecting',
    statusMessage: 'Logging into Facebook Chat API...',
    userId,
  });

  dashboard.registerHandlers({
    onForceSync: () => {
      void syncCycle();
      scheduleNextSync();
    },
    onTogglePause: () => {
      isPaused = !isPaused;
      dashboard.updateState({
        status: isPaused ? 'paused' : 'syncing',
        statusMessage: isPaused ? 'Bot execution paused.' : 'Bot execution resumed.',
      });
      dashboard.addLog(isPaused ? 'Bot paused by user.' : 'Bot resumed by user.');
    },
    onReturnToMenu: () => {
      stopBotSession();
      void runMainMenu();
    },
  });

  dashboard.render();
  dashboard.startInputCapture();

  let appState: AppStateCookie[];
  try {
    const rawData = fs.readFileSync(CONFIG.appStatePath, 'utf8');
    appState = JSON.parse(rawData) as AppStateCookie[];
  } catch (err: any) {
    dashboard.stopInputCapture();
    console.error(pink(`\nFailed to parse ${CONFIG.appStatePath}: ${err.message}`));
    return;
  }

  login({ appState }, async (err: Error | null, api: StfcaApi) => {
    if (err) {
      dashboard.updateState({
        status: 'error',
        statusMessage: `Facebook Login Failed: ${err.message}`,
      });
      dashboard.addLog(`Login failure: ${err.message}`);
      return;
    }

    activeApi = api;
    api.setOptions({ listenEvents: false, selfListen: false });

    isBotRunning = true;
    isPaused = false;

    dashboard.updateState({
      status: 'syncing',
      statusMessage: 'Connected to Facebook! Initializing first sync...',
    });
    dashboard.addLog('Connected to Facebook Messenger.');

    await syncCycle();
    scheduleNextSync();
  });
}

/**
 * @function testConnectionsAction
 *
 * @description Diagnostic action that verifies Spotify API connectivity and Facebook AppState validity without starting the continuous sync loop.
 * @returns Promise resolving to void
 */
async function testConnectionsAction(): Promise<void> {
  console.log(pink('\n  Testing Services Connectivity...\n'));

  process.stdout.write(`  ${blue('Testing Spotify Connection... ')}`);
  if (!CONFIG.spotify.refreshToken) {
    console.log(pink('SKIPPED (No Refresh Token configured)'));
  } else {
    try {
      await refreshSpotifyToken();
      console.log(green('SUCCESS [OK] (Access token obtained)'));
    } catch (err: any) {
      console.log(pink(`FAILED [ERROR] (${err.message})`));
    }
  }

  process.stdout.write(`  ${blue('Testing Facebook AppState... ')}`);
  if (!hasValidAppState()) {
    console.log(pink(`FAILED [ERROR] (File not found at ${CONFIG.appStatePath})`));
  } else {
    const userId = getUserIdFromAppState();
    if (userId) {
      console.log(green(`SUCCESS [OK] (Detected User ID: ${userId})`));
    } else {
      console.log(pink('FAILED [ERROR] (c_user cookie missing in appstate)'));
    }
  }

  console.log('');
  await prompts({
    type: 'invisible',
    name: 'continue',
    message: 'Press Enter to return to main menu...',
  });
}

/**
 * @function configureSettingsAction
 *
 * @description Interactive prompt permitting users to inspect and update key configuration parameters stored in .env.
 * @returns Promise resolving to void
 */
async function configureSettingsAction(): Promise<void> {
  const choices = [
    { title: `Spotify Client ID (${CONFIG.spotify.clientId || 'Not Set'})`, value: 'SpotifyClientID' },
    { title: `Spotify Client Secret (${CONFIG.spotify.clientSecret ? '******' : 'Not Set'})`, value: 'SpotifyClientSecret' },
    { title: `Facebook AppState Path (${CONFIG.appStatePath})`, value: 'FBStatePath' },
    { title: `Active Hours (${CONFIG.activeHours.start}-${CONFIG.activeHours.end})`, value: 'ActiveHours' },
    { title: `Timezone GMT Offset (${CONFIG.timezoneOffset})`, value: 'TimezoneGMTOffset' },
    { title: 'Back to Main Menu', value: 'back' },
  ];

  const selection = await prompts({
    type: 'select',
    name: 'key',
    message: pink('Select setting to modify:'),
    choices,
  });

  if (!selection.key || selection.key === 'back') {
    return;
  }

  const input = await prompts({
    type: 'text',
    name: 'val',
    message: blue(`Enter new value for ${selection.key}:`),
  });

  if (input.val !== undefined && input.val.trim() !== '') {
    saveEnvVariable(selection.key, input.val.trim());
    console.log(green(`\n[Updated] ${selection.key} in .env and runtime!`));
  }

  await prompts({
    type: 'invisible',
    name: 'continue',
    message: 'Press Enter to continue...',
  });
}

/**
 * @function runMainMenu
 *
 * @description Primary CLI event loop rendering banner, diagnostics, and navigable action prompts.
 * @returns Promise resolving to void
 */
export async function runMainMenu(): Promise<void> {
  clearConsole();
  console.log(renderBanner());
  console.log('');
  showDiagnosticsSummary();

  const response = await prompts({
    type: 'select',
    name: 'action',
    message: bold(pink('Select an action:')),
    choices: [
      {
        title: `${green('[1] Start Sync Bot')} ${gray('— Run live status sync to Messenger')}`,
        value: 'start',
      },
      {
        title: `${blue('[2] Authorize Spotify')} ${gray('— Acquire and save Refresh Token via browser')}`,
        value: 'authorize',
      },
      {
        title: `${pink('[3] Configure Settings')} ${gray('— Inspect and modify .env configuration')}`,
        value: 'settings',
      },
      {
        title: `${blue('[4] Test Connections')} ${gray('— Validate Spotify & Facebook credentials')}`,
        value: 'test',
      },
      {
        title: `${gray('[5] Exit')}`,
        value: 'exit',
      },
    ],
    initial: 0,
  });

  if (!response.action || response.action === 'exit') {
    clearConsole();
    console.log(pink('\nGoodbye from SpotiNotes!\n'));
    process.exit(0);
  }

  switch (response.action) {
    case 'start':
      await startBotSession();
      break;
    case 'authorize':
      console.log('');
      await generateSpotifyRefreshToken();
      await prompts({
        type: 'invisible',
        name: 'continue',
        message: 'Press Enter to return to main menu...',
      });
      await runMainMenu();
      break;
    case 'settings':
      await configureSettingsAction();
      await runMainMenu();
      break;
    case 'test':
      await testConnectionsAction();
      await runMainMenu();
      break;
  }
}

process.on('uncaughtException', (err: Error) => {
  dashboard.addLog(`System Error: ${err.message}`);
});

process.on('unhandledRejection', (reason: unknown) => {
  dashboard.addLog(`Unhandled Rejection: ${String(reason)}`);
});

process.on('SIGINT', () => {
  stopBotSession();
  clearConsole();
  console.log(pink('\nGoodbye from SpotiNotes!\n'));
  process.exit(0);
});

void runMainMenu();
