// -----------------------------------------------------------------------------
// French public holidays, computed offline: the eleven national days, plus
// Good Friday and St Stephen's Day in Alsace-Moselle (57, 67, 68) and the
// abolition of slavery in the overseas departments. Same days as the French
// rules of date-holidays used by guim31/gladys-holidays, rewritten here in a
// few lines rather than pulling the whole library into a 256 MB sandbox.
//
// What a site does on a holiday is decided in src/hours.js: the source's
// "PH" rule, or an assumption the texts admit.
// -----------------------------------------------------------------------------

import { addDays } from './clock.js';

const ALSACE_MOSELLE = new Set(['57', '67', '68']);
// Abolition of slavery, by overseas department (law of 1983, decree of 2012
// for Mayotte).
const ABOLITION = { 971: '05-27', 972: '05-22', 973: '06-10', 974: '12-20', 976: '04-27' };

/** Easter Sunday of a year, 'YYYY-MM-DD' (anonymous Gregorian algorithm). */
export function easter(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// The Pacific collectivities (986 Wallis-et-Futuna, 987 Polynesia, 988 New
// Caledonia) have their own public holidays: none is assumed there rather
// than the metropolitan ones.
const PACIFIC = /^98/;

const cache = new Map();

/** The public holidays of a year in a department: a Set of 'YYYY-MM-DD'. */
export function holidaysOf(year, department) {
  const key = `${year}:${department}`;
  if (cache.has(key)) {
    return cache.get(key);
  }
  if (PACIFIC.test(department)) {
    cache.set(key, new Set());
    return cache.get(key);
  }
  const fixed = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'];
  if (ALSACE_MOSELLE.has(department)) {
    fixed.push('12-26');
  }
  if (ABOLITION[department]) {
    fixed.push(ABOLITION[department]);
  }
  const sunday = easter(year);
  // Easter Monday, Ascension, Whit Monday (a holiday by law, often worked).
  const moving = [1, 39, 50].map((days) => addDays(sunday, days));
  if (ALSACE_MOSELLE.has(department)) {
    moving.push(addDays(sunday, -2));
  }
  const days = new Set([...fixed.map((monthDay) => `${year}-${monthDay}`), ...moving]);
  cache.set(key, days);
  return days;
}

/** True when a calendar day is a public holiday in the department. */
export const isHoliday = (date, department) =>
  holidaysOf(Number(date.slice(0, 4)), department).has(date);
