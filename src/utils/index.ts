/**
 * @fileoverview SpotiNotes - Utilities Module
 *
 * @description General date, time, and active hour validation utilities for SpotiNotes.
 * @author @Chrixtia
 */

import CONFIG from '../config';

/**
 * @function isWithinActiveHours
 *
 * @description Determines whether current GMT offset time falls within the configured active hours window.
 * @returns True if current time is within active hours, false otherwise
 */
export function isWithinActiveHours(): boolean {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const gmtOffset = new Date(utc + 3600000 * CONFIG.timezoneOffset);
  const hour = gmtOffset.getHours();
  return hour >= CONFIG.activeHours.start && hour < CONFIG.activeHours.end;
}

export default {
  isWithinActiveHours,
};
