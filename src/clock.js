// -----------------------------------------------------------------------------
// Calendar helpers. The sources give wall-clock hours of the place of the
// site: they are read in its time zone (Paris for every source today), not in
// the zone of Gladys. Day arithmetic runs on 'YYYY-MM-DD' strings at UTC
// midnight, where no day lasts 23 or 25 hours.
// -----------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

export const PARIS = 'Europe/Paris';
/** 'YYYY-MM-DD' plus a number of days. */
export function addDays(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Day of the week of a date, 0 = Monday … 6 = Sunday. */
export function weekdayOf(date) {
  const [year, month, day] = date.split('-').map(Number);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

const formatters = new Map();

/**
 * The local date and minutes since midnight of an instant in a time zone.
 * @returns {{ date: string, minutes: number }}
 */
export function localTime(ms, zone) {
  let formatter = formatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(zone, formatter);
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(ms)).map(({ type, value }) => [type, value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute),
  };
}

/** "08:30", from minutes since midnight (1440 shows as "24:00"). */
export const hhmm = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
