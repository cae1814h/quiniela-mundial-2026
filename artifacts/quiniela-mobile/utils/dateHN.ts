// DB stores match_date as Honduras local time (UTC-6, naive).
// mysql2 reads it as UTC, preserving the HN date/time string.
// Therefore: the YYYY-MM-DD portion of a returned match_date IS the HN local date.
// To get "today in HN" we shift UTC by -6h and read UTC date fields.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function hnDateFromMs(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

const HN_OFFSET_MS = 6 * 60 * 60 * 1000;

/** YYYY-MM-DD for today in Honduras (UTC-6). */
export function getTodayHN(): string {
  return hnDateFromMs(Date.now() - HN_OFFSET_MS);
}

/** YYYY-MM-DD for tomorrow in Honduras (UTC-6). */
export function getTomorrowHN(): string {
  return hnDateFromMs(Date.now() - HN_OFFSET_MS + 24 * 60 * 60 * 1000);
}

/** YYYY-MM-DD for yesterday in Honduras (UTC-6). */
export function getYesterdayHN(): string {
  return hnDateFromMs(Date.now() - HN_OFFSET_MS - 24 * 60 * 60 * 1000);
}

/**
 * Extract the YYYY-MM-DD date part from a match_date string.
 * Since the DB stores HN local time and mysql2 preserves it, the date part
 * is already the correct HN date — no offset conversion needed.
 */
export function matchDayStr(matchDate: string): string {
  return matchDate.substring(0, 10);
}

/** Returns true if the match falls within the 7-day window starting today (HN). */
export function matchInWeekHN(matchDate: string): boolean {
  const todayMs = new Date(getTodayHN()).getTime();
  const matchMs = new Date(matchDayStr(matchDate)).getTime();
  return matchMs >= todayMs && matchMs <= todayMs + 7 * 24 * 60 * 60 * 1000;
}
