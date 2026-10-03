/**
 * @fileoverview SpotiNotes - Configuration Module
 *
 * @description Loads, parses, validates, and updates environment variables and runtime settings for SpotiNotes.
 * @author @Chrixtia
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface SpotifyConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

export interface ActiveHoursConfig {
  start: number;
  end: number;
}

export interface Config {
  spotify: SpotifyConfig;
  appStatePath: string;
  timezoneOffset: number;
  activeHours: ActiveHoursConfig;
  minPlayTimeMs: number;
  updateIntervalRange: [number, number];
}

/**
 * @function parseActiveHours
 *
 * @description Parses the start and end hours from an active hours range string.
 * @param rangeString String in start-end format
 * @returns Object with parsed start and end hour numbers
 */
function parseActiveHours(rangeString?: string): ActiveHoursConfig {
  const parts = (rangeString || '0-24').split('-').map(Number);
  return {
    start: isNaN(parts[0]) ? 0 : parts[0],
    end: isNaN(parts[1]) ? 24 : parts[1],
  };
}

/**
 * @function parseIntervalRange
 *
 * @description Parses update intervals into millisecond bounds.
 * @param rangeString String in min-max minutes format
 * @returns Tuple with minimum and maximum intervals in milliseconds
 */
function parseIntervalRange(rangeString?: string): [number, number] {
  const parts = (rangeString || '10-12')
    .split('-')
    .map((n) => parseInt(n, 10) * 60 * 1000);
  const min = isNaN(parts[0]) ? 10 * 60 * 1000 : parts[0];
  const max = isNaN(parts[1]) ? 12 * 60 * 1000 : parts[1];
  return [min, max];
}

export const CONFIG: Config = {
  spotify: {
    clientId: process.env.SpotifyClientID,
    clientSecret: process.env.SpotifyClientSecret,
    refreshToken: process.env.SpotifyRefreshToken,
  },
  appStatePath: process.env.FBStatePath || 'appstate.json',
  timezoneOffset: parseInt(process.env.TimezoneGMTOffset || '8', 10) || 8,
  activeHours: parseActiveHours(process.env.ActiveHours),
  minPlayTimeMs: parseInt(process.env.MinimumPlayTimeMs || '60000', 10) || 60000,
  updateIntervalRange: parseIntervalRange(process.env.UpdateIntervalRange),
};

/**
 * @function saveEnvVariable
 *
 * @description Writes or updates an environment key-value pair in the local .env file.
 * @param key The environment variable name
 * @param value The value to persist
 * @returns Void
 */
export function saveEnvVariable(key: string, value: string): void {
  const envPath = path.resolve(process.cwd(), '.env');
  let currentContent = '';

  if (fs.existsSync(envPath)) {
    currentContent = fs.readFileSync(envPath, 'utf8');
  } else {
    const examplePath = path.resolve(process.cwd(), '.env.example');
    if (fs.existsSync(examplePath)) {
      currentContent = fs.readFileSync(examplePath, 'utf8');
    }
  }

  const regex = new RegExp(`^${key}=.*$`, 'm');
  const newLine = `${key}=${value}`;

  if (regex.test(currentContent)) {
    currentContent = currentContent.replace(regex, newLine);
  } else {
    currentContent = currentContent.trimEnd() + '\n' + newLine + '\n';
  }

  fs.writeFileSync(envPath, currentContent, 'utf8');
  process.env[key] = value;

  if (key === 'SpotifyRefreshToken') {
    CONFIG.spotify.refreshToken = value;
  } else if (key === 'SpotifyClientID') {
    CONFIG.spotify.clientId = value;
  } else if (key === 'SpotifyClientSecret') {
    CONFIG.spotify.clientSecret = value;
  } else if (key === 'FBStatePath') {
    CONFIG.appStatePath = value;
  }
}

/**
 * @function hasValidSpotifyCredentials
 *
 * @description Validates if Spotify client ID, client secret, and refresh token are present.
 * @returns Boolean indicating whether all credentials exist
 */
export function hasValidSpotifyCredentials(): boolean {
  return Boolean(
    CONFIG.spotify.clientId &&
    CONFIG.spotify.clientSecret &&
    CONFIG.spotify.refreshToken
  );
}

/**
 * @function hasValidAppState
 *
 * @description Checks if the configured Facebook appstate file exists on the filesystem.
 * @returns Boolean indicating whether the appstate file is accessible
 */
export function hasValidAppState(): boolean {
  return fs.existsSync(CONFIG.appStatePath);
}

export default CONFIG;
