const CONFIG = require('../config');

function isWithinActiveHours() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const gmtOffset = new Date(utc + (3600000 * CONFIG.timezoneOffset));
    const hour = gmtOffset.getHours();
    return hour >= CONFIG.activeHours.start && hour < CONFIG.activeHours.end;
}

module.exports = {
    isWithinActiveHours
};