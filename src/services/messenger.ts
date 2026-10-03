/**
 * @fileoverview SpotiNotes - Messenger Service
 *
 * @description Manages Facebook authentication cookies, user identity extraction, and Messenger note publishing.
 * @author @Chrixtia
 */

import fs from 'fs';
import { AppStateCookie, StfcaApi } from 'stfca';
import CONFIG from '../config';

let currentUserId: string | null = null;

/**
 * @function getCurrentUserId
 *
 * @description Retrieves the cached user ID of the active Facebook session.
 * @returns Current Facebook user ID or null
 */
export function getCurrentUserId(): string | null {
  return currentUserId;
}

/**
 * @function setCurrentUserId
 *
 * @description Sets the active Facebook user ID in module state.
 * @param userId The Facebook user ID to set
 * @returns Void
 */
export function setCurrentUserId(userId: string | null): void {
  currentUserId = userId;
}

/**
 * @function getUserIdFromAppState
 *
 * @description Reads the configured Facebook appstate file and extracts the logged-in user ID from cookies.
 * @returns Extracted user ID string or null if unreadable
 */
export function getUserIdFromAppState(): string | null {
  try {
    const rawData = fs.readFileSync(CONFIG.appStatePath, 'utf8');
    const appState = JSON.parse(rawData) as AppStateCookie[];
    const userCookie = appState.find((c) => c.key === 'c_user');
    return userCookie ? userCookie.value : null;
  } catch {
    return null;
  }
}

/**
 * @function createFBNote
 *
 * @description Dispatches a RelayModern GraphQL mutation to create or update the Facebook inbox note.
 * @param api Active ST-FCA client instance
 * @param text Content of the note to publish
 * @param callback Callback fired with error or GraphQL response
 * @returns Void
 */
export function createFBNote(
  api: StfcaApi,
  text: string,
  callback: (err: Error | null, res?: any) => void
): void {
  if (!currentUserId) {
    return callback(new Error('User ID not found. Cannot create note.'));
  }

  const variables = {
    input: {
      client_mutation_id: Math.round(Math.random() * 1000000).toString(),
      actor_id: currentUserId,
      description: text.trim(),
      duration: 86400,
      note_type: 'TEXT_NOTE',
      privacy: 'FRIENDS',
      session_id: (Date.now() + Math.random()).toString(),
    },
  };

  const form = {
    fb_api_caller_class: 'RelayModern',
    fb_api_req_friendly_name: 'MWInboxTrayNoteCreationDialogCreationStepContentMutation',
    variables: JSON.stringify(variables),
    doc_id: '24060573783603122',
  };

  if (typeof api.httpPost === 'function') {
    api.httpPost('https://www.facebook.com/api/graphql/', form, (err, data) => {
      if (err) return callback(err);
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (parsed && parsed.errors && parsed.errors.length > 0) {
          const firstErr = parsed.errors[0];
          return callback(new Error(firstErr.message || JSON.stringify(firstErr)));
        }
        callback(null, parsed);
      } catch {
        callback(null, data);
      }
    });
  } else {
    callback(new Error('api.httpPost is not a function in this version of stfca.'));
  }
}

/**
 * @function updateMessengerNote
 *
 * @description Checks if the note has changed and publishes update to Facebook Messenger.
 * @param api Active ST-FCA client instance
 * @param noteText The target text to display on Messenger notes
 * @param lastSetNote The previously published note string
 * @param callback Callback returning potential error and the newly recorded note string
 * @returns Void
 */
export function updateMessengerNote(
  api: StfcaApi,
  noteText: string,
  lastSetNote: string | null,
  callback: (err: Error | null, newLastSetNote: string | null, wasSkipped?: boolean) => void
): void {
  if (noteText === lastSetNote) {
    return callback(null, lastSetNote, true);
  }

  try {
    const createFunc =
      typeof api.createNote === 'function'
        ? api.createNote.bind(api)
        : (text: string, cb: (err?: Error | null) => void) => createFBNote(api, text, cb);

    createFunc(noteText, (err?: any) => {
      if (err) {
        callback(err instanceof Error ? err : new Error(String(err)), lastSetNote, false);
      } else {
        callback(null, noteText, false);
      }
    });
  } catch (e: any) {
    callback(e instanceof Error ? e : new Error(String(e)), lastSetNote, false);
  }
}

export default {
  getCurrentUserId,
  setCurrentUserId,
  getUserIdFromAppState,
  createFBNote,
  updateMessengerNote,
};
