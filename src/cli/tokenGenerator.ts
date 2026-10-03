/**
 * @fileoverview SpotiNotes - Spotify Token Generator
 *
 * @description Provides an interactive OAuth authentication server to acquire and save Spotify refresh tokens directly inside the CLI.
 * @author @Chrixtia
 */

import http from 'http';
import express, { Request, Response } from 'express';
import open from 'open';
import SpotifyWebApi from 'spotify-web-api-node';
import CONFIG, { saveEnvVariable } from '../config';
import { pink, blue, green, gray } from './theme';

export interface TokenGenerationResult {
  success: boolean;
  refreshToken?: string;
  error?: string;
}

/**
 * @function generateSpotifyRefreshToken
 *
 * @description Starts a local callback server, opens the Spotify authorization URL in the user's browser, and securely stores the acquired refresh token in the environment file.
 * @returns Promise resolving to a TokenGenerationResult indicating success or error details
 */
export async function generateSpotifyRefreshToken(): Promise<TokenGenerationResult> {
  if (!CONFIG.spotify.clientId || !CONFIG.spotify.clientSecret) {
    return {
      success: false,
      error: 'Spotify Client ID or Client Secret is not set in configuration or .env',
    };
  }

  const spotifyApi = new SpotifyWebApi({
    clientId: CONFIG.spotify.clientId,
    clientSecret: CONFIG.spotify.clientSecret,
    redirectUri: 'http://127.0.0.1:8888/callback',
  });

  return new Promise<TokenGenerationResult>((resolve) => {
    const app = express();
    const port = 8888;
    let server: http.Server;

    app.get('/callback', async (req: Request, res: Response): Promise<void> => {
      const code = typeof req.query.code === 'string' ? req.query.code : undefined;

      if (!code) {
        res.status(400).send('<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>[Error] Authorization failed</h2><p>No authorization code found in the callback URL.</p></body></html>');
        server.close();
        resolve({ success: false, error: 'No authorization code received' });
        return;
      }

      try {
        const grant = await spotifyApi.authorizationCodeGrant(code);
        const refreshToken = grant.body.refresh_token;

        saveEnvVariable('SpotifyRefreshToken', refreshToken);

        res.send('<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>[Success] Spotify Authorized!</h2><p>Refresh token successfully captured and saved to .env. You can close this window and return to your terminal.</p></body></html>');

        server.close();
        resolve({ success: true, refreshToken });
      } catch (err: any) {
        res.status(500).send('<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>[Error] Token exchange error</h2><p>Failed to exchange code for tokens. Please check your client credentials.</p></body></html>');
        server.close();
        resolve({ success: false, error: err?.message || String(err) });
      }
    });

    server = app.listen(port, () => {
      const authUrl = spotifyApi.createAuthorizeURL(
        ['user-read-playback-state', 'user-read-currently-playing'],
        'spotinotes-session'
      );

      console.log(`\n  ${pink('[Spotify OAuth Server]')} running on ${blue(`http://127.0.0.1:${port}`)}`);
      console.log(`  ${gray('Launching your default browser to authorize SpotiNotes...')}`);
      console.log(`  ${gray('If the browser does not open automatically, open this URL manually:')}`);
      console.log(`  ${blue(authUrl)}\n`);

      open(authUrl, { wait: false })
        .then((cp) => {
          cp?.unref?.();
        })
        .catch(() => {});
    });

    server.on('error', (err: any) => {
      resolve({ success: false, error: err?.message || String(err) });
    });
  });
}

export default {
  generateSpotifyRefreshToken,
};
