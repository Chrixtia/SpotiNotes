require('dotenv').config();

const CONFIG = {
    spotify: {
        clientId: process.env.SpotifyClientID,
        clientSecret: process.env.SpotifyClientSecret,
        refreshToken: process.env.SpotifyRefreshToken
    },
    appStatePath: process.env.FBStatePath,
    timezoneOffset: parseInt(process.env.TimezoneGMTOffset) || 8,
    activeHours: (() => {
        const [start, end] = (process.env.ActiveHours || '0-24').split('-').map(Number);
        return { start, end };
    })(),
    minPlayTimeMs: parseInt(process.env.MinimumPlayTimeMs) || 60000,
    updateIntervalRange: (() => {
        const [min, max] = (process.env.UpdateIntervalRange || '10-12').split('-').map(n => parseInt(n) * 60 * 1000);
        return [min, max];
    })()
};

module.exports = CONFIG;