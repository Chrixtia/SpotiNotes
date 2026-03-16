require('dotenv').config();

const SpotifyWebApi = require('spotify-web-api-node');
const express = require('express');
const open = require('open');

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SpotifyClientID,
  clientSecret: process.env.SpotifyClientSecret,
  redirectUri: 'http://127.0.0.1:8888/callback'
});

const app = express();
const port = 8888;

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    res.send('No code received. Check the URL.');
    return;
  }
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    console.log('\n--- Spotify Tokens ---');
    console.log('Access Token:', data.body['access_token']);
    console.log('Refresh Token:', data.body['refresh_token']);
    console.log('\nCopy the Refresh Token to your .env file as SpotifyRefreshToken.');
    res.send('Tokens logged to console! Check your terminal and copy the Refresh Token.');
    process.exit(0);
  } catch (err) {
    console.error('Error getting tokens:', err);
    res.send('Error getting tokens. Check console.');
  }
});

app.listen(port, () => {
  console.log(`Server running on http://127.0.0.1:${port}`);
  const authorizeURL = spotifyApi.createAuthorizeURL(['user-read-playback-state', 'user-read-currently-playing']);
  console.log('Opening authorization URL in browser... or just click this link:', authorizeURL);
  open(authorizeURL);
});