/**
 * @fileoverview SpotiNotes - Standalone Token Generator Script
 *
 * @description Executable helper script to authorize SpotiNotes with Spotify API and retrieve long-lived refresh token.
 * @author @Chrixtia
 */

import { generateSpotifyRefreshToken } from './cli/tokenGenerator';
import { pink, green } from './cli/theme';

/**
 * @function runTokenHelper
 *
 * @description Executes the Spotify token acquisition workflow and terminates the process with relevant status code.
 * @returns Promise resolving to void
 */
async function runTokenHelper(): Promise<void> {
  console.log(pink('\nStarting Spotify Refresh Token Setup...'));
  const result = await generateSpotifyRefreshToken();

  if (result.success) {
    console.log(green('\n[Success] Your SpotifyRefreshToken has been saved directly into .env'));
    process.exit(0);
  } else {
    console.error(`\n[Error] Error during authorization: ${result.error}`);
    process.exit(1);
  }
}

void runTokenHelper();
