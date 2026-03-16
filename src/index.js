/**
 * Spotify to Messenger Notes Sync (STFCA Version)
 * Dependencies: npm install stfca spotify-web-api-node dotenv
 * GitHub: https://github.com/Chrixtia
 */

console.log(`
========================================================================================================================
  /$$$$$$  /$$$$$$$   /$$$$$$  /$$$$$$$$ /$$$$$$       /$$   /$$  /$$$$$$  /$$$$$$$$ /$$$$$$$$  /$$$$$$ 
 /$$__  $$| $$__  $$ /$$__  $$|__  $$__/|_  $$_/      | $$$ | $$ /$$__  $$|__  $$__/| $$_____/ /$$__  $$
| $$  \\__/| $$  \\ $$| $$  \\ $$   | $$     | $$        | $$$$| $$| $$  \\ $$   | $$   | $$      | $$  \\__/
|  $$$$$$ | $$$$$$$/| $$  | $$   | $$     | $$ /$$$$$$| $$ $$ $$| $$  | $$   | $$   | $$$$$   |  $$$$$$ 
 \\____  $$| $$____/ | $$  | $$   | $$     | $$|______/| $$  $$$$| $$  | $$   | $$   | $$__/    \\____  $$
 /$$  \\ $$| $$      | $$  | $$   | $$     | $$        | $$\\  $$$| $$  | $$   | $$   | $$       /$$  \\ $$
|  $$$$$$/| $$      |  $$$$$$/   | $$    /$$$$$$      | $$ \\  $$|  $$$$$$/   | $$   | $$$$$$$$|  $$$$$$/
 \\______/ |__/       \\______/    |__/   |______/      |__/  \\__/ \\______/    |__/   |________/ \\______/ 
========================================================================================================================

    Sync your Spotify status to Facebook Messenger notes using stfca.
    By: https://github.com/Chrixtia
------------------------------------------------------------------------------------------------------------------------
`);

try {
    open("https://github.com/Chrixtia");
} catch (e) {
    // Ignore if open fails
}

const fs = require('fs');
const login = require('stfca');

const CONFIG = require('./config');
const { getSpotifyStatus } = require('./services/spotify');
const { getUserIdFromAppState, updateMessengerNote, setCurrentUserId } = require('./services/messenger');
const { isWithinActiveHours } = require('./utils');

// --- CORE LOGIC ---
let lastSetNote = null;

async function mainLoop(api) {
    if (!isWithinActiveHours()) {
        console.log("Outside active hours. Sleeping...");
        return setTimeout(() => mainLoop(api), 30 * 60 * 1000);
    }

    const targetNote = await getSpotifyStatus();

    if (targetNote.startsWith('🚫No Recent Activity')) {
        console.log('[Info] No recent activity detected; keeping existing note.');
    } else {
        updateMessengerNote(api, targetNote, lastSetNote, (err, newLastSetNote) => {
            if (!err) {
                lastSetNote = newLastSetNote;
            }
        });
    }

    const [min, max] = CONFIG.updateIntervalRange;
    const nextInterval = Math.floor(Math.random() * (max - min + 1) + min);
    console.log(`Next update in ${Math.floor(nextInterval / 1000)} seconds.`);

    setTimeout(() => mainLoop(api), nextInterval);
}

// --- GLOBAL ERROR HANDLERS ---
// This prevents the script from crashing if internet drops
process.on('uncaughtException', (err) => {
    console.error('[System Error] Uncaught Exception:', err.message);
    console.error('The bot will continue running.');
});

process.on('unhandledRejection', (reason, p) => {
    console.error('[System Error] Unhandled Rejection:', reason);
    console.error('The bot will continue running.');
});

// --- STARTUP WITH RETRY ---
const startBot = () => {
    if (!fs.existsSync(CONFIG.appStatePath)) {
        console.error("CRITICAL: appstate.json not found. Cannot start.");
        return;
    }

    const userId = getUserIdFromAppState();
    setCurrentUserId(userId);

    let appState;
    try {
        appState = JSON.parse(fs.readFileSync(CONFIG.appStatePath, 'utf8'));
    } catch (e) {
        console.error("Error reading appstate.json. Retrying in 10s...");
        return setTimeout(startBot, 10000);
    }

    console.log("Attempting to connect to Facebook...");

    login({ appState: appState }, (err, api) => {
        if (err) {
            console.error(`Login Failed: Retrying in 30 seconds...`);
            return setTimeout(startBot, 30000);
        }

        api.setOptions({ listenEvents: false, selfListen: false });

        console.log("Sync Bot Active via stfca.");
        mainLoop(api);
    });
};

startBot();