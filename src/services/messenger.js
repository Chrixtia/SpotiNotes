const fs = require('fs');
const CONFIG = require('../config');

let currentUserId = null;

function getUserIdFromAppState() {
    try {
        const appState = JSON.parse(fs.readFileSync(CONFIG.appStatePath, 'utf8'));
        const userCookie = appState.find(c => c.key === 'c_user');
        return userCookie ? userCookie.value : null;
    } catch (e) {
        return null;
    }
}

function createFBNote(api, text, callback) {
    if (!currentUserId) {
        return callback(new Error("User ID not found. Cannot create note."));
    }

    const variables = {
        input: {
            client_mutation_id: Math.round(Math.random() * 1000000).toString(),
            actor_id: currentUserId,
            description: text.trim(),
            duration: 86400,
            note_type: "TEXT_NOTE",
            privacy: "FRIENDS",
            session_id: (Date.now() + Math.random()).toString(),
        },
    };

    const form = {
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "MWInboxTrayNoteCreationDialogCreationStepContentMutation",
        variables: JSON.stringify(variables),
        doc_id: "24060573783603122",
    };

    if (typeof api.httpPost === 'function') {
        api.httpPost("https://www.facebook.com/api/graphql/", form, (err, data) => {
            if (err) return callback(err);
            try {
                const parsed = JSON.parse(data);
                if (parsed.errors) return callback(parsed.errors[0]);
                callback(null, parsed);
            } catch (e) {
                callback(null, data);
            }
        });
    } else {
        callback(new Error("api.httpPost is not a function in this version of stfca."));
    }
}

function updateMessengerNote(api, noteText, lastSetNote, callback) {
    if (noteText === lastSetNote) {
        console.log(`[Skip] Note already matches: ${noteText.split('\n')[0]}`);
        return callback(null, lastSetNote);
    }

    try {
        const createFunc = (typeof api.createNote === 'function')
            ? api.createNote.bind(api)
            : (text, cb) => createFBNote(api, text, cb);

        createFunc(noteText, (err) => {
            if (err) {
                console.error("[Note Error] Failed to create note:", err.message || err);
                callback(err, lastSetNote);
            } else {
                console.log(`[Note Update] Success: ${noteText.split('\n')[0]}`);
                callback(null, noteText);
            }
        });
    } catch (e) {
        console.error("[API Error] implementation failed", e);
        callback(e, lastSetNote);
    }
}

function setCurrentUserId(userId) {
    currentUserId = userId;
}

module.exports = {
    getUserIdFromAppState,
    createFBNote,
    updateMessengerNote,
    setCurrentUserId
};