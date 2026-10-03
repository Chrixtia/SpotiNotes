/**
 * @fileoverview SpotiNotes - Spotify Service
 *
 * @description Handles Spotify authentication, token refreshing, playback monitoring, and note text generation.
 * @author @Chrixtia
 */

import SpotifyWebApi from 'spotify-web-api-node';
import CONFIG from '../config';

export interface PlaybackInfo {
  isPlaying: boolean;
  trackName?: string;
  artistName?: string;
  progressMs?: number;
  durationMs?: number;
  formattedNote: string;
}

export const spotifyApi = new SpotifyWebApi({
  clientId: CONFIG.spotify.clientId,
  clientSecret: CONFIG.spotify.clientSecret,
  redirectUri: 'http://127.0.0.1:8888/callback',
});

/**
 * @function refreshSpotifyToken
 *
 * @description Refreshes Spotify access token using the configured refresh token.
 * @returns Promise resolving to the newly acquired access token string
 */
export async function refreshSpotifyToken(): Promise<string> {
  if (CONFIG.spotify.refreshToken) {
    spotifyApi.setRefreshToken(CONFIG.spotify.refreshToken);
  }
  const data = await spotifyApi.refreshAccessToken();
  const accessToken = data.body.access_token;
  spotifyApi.setAccessToken(accessToken);
  return accessToken;
}

/**
 * @function getDetailedSpotifyPlayback
 *
 * @description Fetches the current Spotify playback state with full metadata for display and synchronization.
 * @returns Promise resolving to structured PlaybackInfo
 */
export async function getDetailedSpotifyPlayback(): Promise<PlaybackInfo> {
  try {
    await refreshSpotifyToken();
    const playback = await spotifyApi.getMyCurrentPlaybackState();

    if (playback.body && playback.body.is_playing && playback.body.item) {
      const item = playback.body.item;
      const trackName = item.name;
      let artistName = 'Unknown Artist';

      if ('artists' in item && Array.isArray(item.artists) && item.artists.length > 0) {
        artistName = item.artists[0]?.name || 'Unknown Artist';
      }

      const progressMs = playback.body.progress_ms ?? 0;
      const durationMs = 'duration_ms' in item ? (item.duration_ms as number) : undefined;

      if (progressMs >= CONFIG.minPlayTimeMs) {
        return {
          isPlaying: true,
          trackName,
          artistName,
          progressMs,
          durationMs,
          formattedNote: `Playing ~ ${trackName} - ${artistName}\nBot by @Chrixtia`,
        };
      }
    }

    return {
      isPlaying: false,
      formattedNote: `No Recent Activity\nBot by @Chrixtia`,
    };
  } catch {
    return {
      isPlaying: false,
      formattedNote: `No Recent Activity\nBot by @Chrixtia`,
    };
  }
}

/**
 * @function getSpotifyStatus
 *
 * @description Retrieves formatted Spotify status note for Messenger sync.
 * @returns Promise resolving to formatted note string
 */
export async function getSpotifyStatus(): Promise<string> {
  const playback = await getDetailedSpotifyPlayback();
  return playback.formattedNote;
}

export default {
  spotifyApi,
  refreshSpotifyToken,
  getDetailedSpotifyPlayback,
  getSpotifyStatus,
};
