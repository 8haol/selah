/** The congregation meets in London; "today" and "this Sunday" follow its calendar, not the server's. */
export const CHURCH_TIME_ZONE = 'Europe/London'

/** Today's date in the church's calendar, as YYYY-MM-DD. */
export function churchToday(now = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: CHURCH_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** The Sunday on or after today, as YYYY-MM-DD in the church's own calendar. */
export function nextSunday(now = new Date()): string {
  const d = new Date(`${churchToday(now)}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7))
  return d.toISOString().slice(0, 10)
}
