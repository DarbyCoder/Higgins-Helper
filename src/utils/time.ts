/**
 * @file src/utils/time.ts
 * @description Shared time-parsing utilities for Clark dining hours.
 *
 * The Clark dining site serves times in 12-hour AM/PM format
 * (e.g. "8:30 am", "5:00 pm", "11 am"). These helpers convert
 * those strings to minutes-since-midnight so they can be compared
 * against the current wall-clock time.
 */

/**
 * Parses a 12-hour AM/PM time string into total minutes since midnight.
 *
 * Accepts formats like:
 *   "8:30 am"  →  510
 *   "11:00 am" →  660
 *   "12:00 pm" →  720
 *   "5:00 pm"  → 1020
 *   "11 pm"    → 1380
 *   "12:00 am" →    0
 *
 * Returns null if the string is empty, missing the am/pm suffix,
 * or otherwise cannot be parsed.
 *
 * @param timeStr - A time string in "h:mm am/pm" or "h am/pm" format
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;

  const match = timeStr.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3].toLowerCase();

  // Convert 12-hour to 24-hour
  if (period === "am") {
    if (hours === 12) hours = 0;      // 12:xx am → 0:xx (midnight)
  } else {
    if (hours !== 12) hours += 12;    // h pm → h+12, but 12 pm stays 12
  }

  return hours * 60 + minutes;
}

/**
 * Returns true if the current wall-clock time (in local timezone) falls
 * within [startTime, endTime) using 12-hour AM/PM strings.
 *
 * @param startTime - Opening time string, e.g. "8:30 am"
 * @param endTime   - Closing time string, e.g. "5:00 pm"
 */
export function isNowBetween(startTime: string, endTime: string): boolean {
  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);
  if (startMins === null || endMins === null) return false;

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  return nowMins >= startMins && nowMins < endMins;
}
