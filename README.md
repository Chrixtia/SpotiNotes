# Spotify to Messenger Notes Sync [ SPOTI-NOTES ]

A bot that syncs your current Spotify playback status to Facebook Messenger notes.

## Features

- Automatically updates your Facebook Messenger note with current Spotify track
- Runs in the background with automatic restarts
- Configurable update intervals and active hours
- Handles network interruptions gracefully

## Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Create a Spotify App and Get Credentials:**
   - Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
   - Log in with your Spotify account and click **"Create an App"**.
   - Fill in the app name (e.g., "Messenger Sync Bot") and description.
   - Set the **Redirect URI** to `http://127.0.0.1:8888/callback`.
   - Save the app and note the **Client ID** and **Client Secret**.
   - Run `npm run get-refresh-token` to authorize the app and obtain the **Refresh Token** (ensure your `.env` has the Client ID and Secret first).

3. **Configure Environment Variables:**
   - Copy `.env.example` to `.env`
   - Fill in your Spotify API credentials and other settings in `.env`

4. **Get Facebook App State:**
   - Use a Chrome extension like "c3c-fb-state" while logged into Facebook
   - Export the JSON and save it as `appstate.json` in the project root
   - Update `FBStatePath` in `.env` if needed

5. **Run the Bot:**
   - Double-click `scripts/silent_start.vbs` for silent background operation
   - Or run `scripts/Run.bat` to see console output

## Project Structure

```
├── src/
│   ├── index.js              # Main entry point and bot loop
│   ├── get_refresh_token.js  # Script to obtain Spotify refresh token
│   ├── config/
│   │   └── index.js          # Configuration loading from environment
│   ├── services/
│   │   ├── spotify.js        # Spotify API integration
│   │   └── messenger.js      # Facebook Messenger integration
│   └── utils/
│       └── index.js          # Utility functions
├── scripts/
│   ├── Run.bat               # Windows batch script to run the bot
│   └── silent_start.vbs      # Silent startup script
├── appstate.json             # Facebook app state (not included)
├── package.json          # Node.js dependencies
├── .env                  # Environment configuration
├── .env.example          # Environment template
└── README.md             # This file
```

## Configuration

Edit the `.env` file to customize:

- `SpotifyClientID`, `SpotifyClientSecret`, `SpotifyRefreshToken`: Your Spotify API credentials
- `FBStatePath`: Path to your Facebook app state file
- `TimezoneGMTOffset`: Your timezone offset from GMT
- `ActiveHours`: Hours when the bot should update notes (format: start-end, e.g., 0-24)
- `MinimumPlayTimeMs`: Minimum play time before updating note
- `UpdateIntervalRange`: Update interval range in minutes (format: min-max, e.g., 10-12)
- `minPlayTimeMs`: Minimum play time before updating note
- `updateIntervalRange`: Random interval between updates

## Dependencies

- `stfca`: Facebook Chat API
- `spotify-web-api-node`: Spotify Web API
- `dotenv`: Environment variable loader
- `bluebird`: Promise library
- `fca-delta`: Alternative Facebook API
- `fs`: File system utilities
- `express`: Web server for token retrieval
- `open`: Opens URLs in browser

## Notes

- The bot will continue running even if internet connection drops
- It automatically restarts on crashes
- Facebook notes are set to "FRIENDS" privacy by default
- This project is for educational purposes only. Use at your own risk!

## Links

- Discord: https://discord.com/users/1443584667235389623
- GitHub: https://github.com/Chrixtia

## Future Features [ I guess? ]

- Multiple Accounts
- Add songs directly to notes
- Add lyrics randomized

