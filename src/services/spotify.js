const SpotifyWebApi = require('spotify-web-api-node');
const CONFIG = require('../config');

const spotifyApi = new SpotifyWebApi({
    clientId: CONFIG.spotify.clientId,
    clientSecret: CONFIG.spotify.clientSecret,
    redirectUri: 'http://127.0.0.1:8888/callback'
});

async function getSpotifyStatus() {
    try {
        spotifyApi.setRefreshToken(CONFIG.spotify.refreshToken);
        const data = await spotifyApi.refreshAccessToken();
        spotifyApi.setAccessToken(data.body['access_token']);

        const playback = await spotifyApi.getMyCurrentPlaybackState();

        if (playback.body && playback.body.is_playing) {
            const track = playback.body.item;
            const artist = track.artists[0].name;
            const progress = playback.body.progress_ms;

            if (progress >= CONFIG.minPlayTimeMs) {
                return `🎧Playing ~ ${track.name} - ${artist}\nBot by @Chrixtia`;
            }
        }
        return `🚫No Recent Activity\nBot by @Chrixtia`;
    } catch (err) {
        return `🚫No Recent Activity\nBot by @Chrixtia`;
    }
}

module.exports = {
    spotifyApi,
    getSpotifyStatus
};