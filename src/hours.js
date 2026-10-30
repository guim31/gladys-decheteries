// -----------------------------------------------------------------------------
// Opening hours of a recycling centre and what they mean at a given instant:
// open or closed, until when, next opening.
//
// Two formats reach this file:
//
//   - the OpenStreetMap `opening_hours` syntax (Toulouse, Bordeaux, Tours),
//     a subset of it: weekdays and ranges ("Mo-Fr,Su"), public holidays
//     ("PH off"), months ("Apr-Sep"), days of a month with an optional year
//     ("2026 Jun 16-28", "Dec 24,31", "2026 Jul 27-2026 Aug 01"), times
//     ("09:00-12:00,13:30-18:00") or "off". Rules apply in order, a later
//     rule replacing the whole day of an earlier one, as in OpenStreetMap.
//     Anything else (overnight times, "24/7", "||", week numbers…) makes the
//     whole schedule unreadable: it is never half-read nor guessed;
//   - the `periods` of Strasbourg: weekly schedules (`dayOfWeek` 0 = Monday),
//     the dated ones replacing the usual one between their dates.
//
// Both become the same list of rules: `{ weekdays, ph, date, slots }`.
//
// Public holidays: a source that says nothing about them (no PH rule) is
// taken as closed on 1 January, 1 May and 25 December, the days nearly every
// French site closes, and on the other holidays as closed unless it opens on
// the Sunday of that week. The texts say it is an assumption.
// -----------------------------------------------------------------------------

import { addDays, localTime, weekdayOf } from './clock.js';
import { isHoliday } from './holidays.js';

export const SEARCH_DAYS = 14;
const DAY = 1440;
const WEEKDAY_CODES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Holidays nearly every site closes, assumed when the source does not say.
const ALWAYS_CLOSED = ['01-01', '05-01', '12-25'];

const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
const pad = (number) => String(number).padStart(2, '0');

/** "08:30" or "08:30:00" → 510, or null. "24:00" is the end of the day. */
export function minutesOf(value) {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(value ?? '').trim());
  if (!match || Number(match[2]) > 59) {
    return null;
  }
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes <= DAY ? minutes : null;
}

/** Sorted slots, the overlapping or touching ones merged. */
function merge(slots) {
  const merged = [];
  for (const slot of [...slots].sort((a, b) => a.from - b.from)) {
    const last = merged.at(-1);
    if (last && slot.from <= last.to) {
      last.to = Math.max(last.to, slot.to);
    } else {
      merged.push({ ...slot });
    }
  }
  return merged;
}

/** "09:00-12:00,13:30-18:00" → slots, or null when one is not a plain daytime range. */
function parseTimes(text) {
  const slots = [];
  for (const part of text.split(',')) {
    const [start, end, extra] = part.split('-');
    const from = minutesOf(start);
    const to = minutesOf(end);
    if (extra !== undefined || from === null || to === null || to <= from) {
      return null;
    }
    slots.push({ from, to });
  }
  return merge(slots);
}

/** "Mo-Fr,Su,PH" → `{ weekdays: Set|null, ph }`, or null. */
function parseWeekdays(text) {
  const weekdays = new Set();
  let ph = false;
  for (const part of text.split(',')) {
    if (part === 'PH') {
      ph = true;
      continue;
    }
    const [first, last, extra] = part.split('-');
    const from = WEEKDAY_CODES.indexOf(first);
    const to = last === undefined ? from : WEEKDAY_CODES.indexOf(last);
    if (extra !== undefined || from < 0 || to < 0) {
      return null;
    }
    for (let offset = 0; offset <= (to - from + 7) % 7; offset += 1) {
      weekdays.add((from + offset) % 7);
    }
  }
  return { weekdays: weekdays.size > 0 ? weekdays : null, ph };
}

const month = (name) => MONTHS.indexOf(name) + 1;
const MONTH = MONTHS.join('|');

/**
 * The date part of a rule, as a test of a 'YYYY-MM-DD' day, or null when it
 * is not one of the forms used by the sources.
 */
export function parseDateSelector(text) {
  let match = new RegExp(`^(?:(\\d{4}) )?(${MONTH})-(${MONTH})$`).exec(text);
  if (match) {
    const [, year, first, last] = match;
    const from = month(first);
    const to = month(last);
    return (date) => {
      const current = Number(date.slice(5, 7));
      const inside =
        from <= to ? current >= from && current <= to : current >= from || current <= to;
      return inside && (!year || date.startsWith(year));
    };
  }
  match = new RegExp(
    `^(?:(\\d{4}) )?(${MONTH})(?: (\\d{1,2}(?:-\\d{1,2})?(?:,\\d{1,2}(?:-\\d{1,2})?)*))?$`,
  ).exec(text);
  if (match) {
    const [, year, name, days] = match;
    const prefix = `-${pad(month(name))}-`;
    const ranges = (days ?? '1-31').split(',').map((range) => {
      const [first, last] = range.split('-').map(Number);
      return [first, last ?? first];
    });
    return (date) =>
      (!year || date.startsWith(year)) &&
      date.slice(4, 8) === prefix &&
      ranges.some(
        ([first, last]) => Number(date.slice(8)) >= first && Number(date.slice(8)) <= last,
      );
  }
  match = new RegExp(
    `^(?:(\\d{4}) )?(${MONTH}) (\\d{1,2})-(?:(\\d{4}) )?(${MONTH}) (\\d{1,2})$`,
  ).exec(text);
  if (match) {
    const [, fromYear, fromMonth, fromDay, toYear, toMonth, toDay] = match;
    const from = `${pad(month(fromMonth))}-${pad(fromDay)}`;
    const to = `${pad(month(toMonth))}-${pad(toDay)}`;
    if (fromYear || toYear) {
      const start = `${fromYear ?? toYear}-${from}`;
      const end = `${toYear ?? fromYear}-${to}`;
      return (date) => date >= start && date <= end;
    }
    return (date) => {
      const day = date.slice(5);
      return from <= to ? day >= from && day <= to : day >= from || day <= to;
    };
  }
  return null;
}

/**
 * An OpenStreetMap `opening_hours` value, as rules; null when empty or when
 * a rule is outside the subset read here.
 * @returns {{ rules: object[], phExplicit: boolean }|null}
 */
export function parseOpeningHours(text) {
  const value = String(text ?? '').trim();
  if (!value) {
    return null;
  }
  const rules = [];
  for (const raw of value.split(';')) {
    const rule = raw
      .trim()
      .replace(/\s*,\s*/g, ',')
      .replace(/\s*-\s*/g, '-');
    if (!rule) {
      continue;
    }
    const tokens = rule.split(/\s+/);
    const last = tokens.pop();
    let slots;
    if (last === 'off' || last === 'closed') {
      slots = [];
    } else {
      slots = parseTimes(last);
      if (!slots) {
        return null;
      }
    }
    let weekdays = null;
    let ph = false;
    if (
      tokens.length > 0 &&
      /^(Mo|Tu|We|Th|Fr|Sa|Su|PH)([-,](Mo|Tu|We|Th|Fr|Sa|Su|PH))*$/.test(tokens.at(-1))
    ) {
      const parsed = parseWeekdays(tokens.pop());
      if (!parsed) {
        return null;
      }
      ({ weekdays, ph } = parsed);
    }
    let date = null;
    if (tokens.length > 0) {
      date = parseDateSelector(tokens.join(' '));
      if (!date) {
        return null;
      }
    }
    rules.push({ weekdays, ph, date, slots });
  }
  return finish(rules);
}

/** A rule list with its flags, or null when no rule ever opens. */
function finish(rules) {
  if (!rules.some((rule) => rule.slots.length > 0)) {
    return null;
  }
  return { rules, phExplicit: rules.some((rule) => rule.ph) };
}

/** A JSON text or an already parsed value; [] for anything else. */
export function jsonList(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * The `periods` of Strasbourg as rules: the undated periods first, then the
 * dated ones, which replace them between their dates. Null without hours.
 */
export function parsePeriods(periods) {
  const list = jsonList(periods);
  const isoDate = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? value : null);
  const dated = (period) => Boolean(isoDate(period?.startDate) || isoDate(period?.endDate));
  const rules = [];
  for (const period of [...list.filter((p) => !dated(p)), ...list.filter(dated)]) {
    const start = isoDate(period?.startDate);
    const end = isoDate(period?.endDate);
    const date = start || end ? (day) => (!start || day >= start) && (!end || day <= end) : null;
    const week = WEEKDAY_CODES.map(() => []);
    for (const schedule of Array.isArray(period?.schedules) ? period.schedules : []) {
      const weekday = Number(schedule?.dayOfWeek);
      const from = minutesOf(schedule?.startHour);
      const to = minutesOf(schedule?.endHour);
      if (Number.isInteger(weekday) && weekday >= 0 && weekday < 7 && from !== null && to > from) {
        week[weekday].push({ from, to });
      }
    }
    const always = Number(period?.alwaysOpen) === 1;
    if (!always && week.every((slots) => slots.length === 0)) {
      continue;
    }
    week.forEach((slots, weekday) => {
      rules.push({
        weekdays: new Set([weekday]),
        ph: false,
        date,
        slots: always ? [{ from: 0, to: DAY }] : merge(slots),
      });
    });
  }
  return finish(rules);
}

/** The slots of the rules matching a day; `withHolidays` false ignores the PH rules. */
function slotsOf(schedule, date, holiday, withHolidays = true) {
  const weekday = weekdayOf(date);
  let slots = [];
  for (const rule of schedule.rules) {
    if (rule.date && !rule.date(date)) {
      continue;
    }
    const byWeekday = rule.weekdays ? rule.weekdays.has(weekday) : !rule.ph;
    const byHoliday = withHolidays && rule.ph && holiday;
    if (byWeekday || byHoliday) {
      slots = rule.slots;
    }
  }
  return slots;
}

/** True when the site opens on the Sunday of the week of a date (its season, its dated rules). */
function opensOnSundays(schedule, date) {
  const sunday = addDays(date, 6 - weekdayOf(date));
  return slotsOf(schedule, sunday, false, false).length > 0;
}

/**
 * The opening of one calendar day.
 * @returns {{ slots: object[], holiday: boolean, holidayClosed: boolean, assumed: boolean }}
 */
export function dayOf(schedule, date, department) {
  const holiday = isHoliday(date, department);
  const usual = slotsOf(schedule, date, holiday, false);
  if (!holiday) {
    return { slots: usual, holiday, holidayClosed: false, assumed: false };
  }
  if (schedule.phExplicit) {
    const slots = slotsOf(schedule, date, holiday);
    return {
      slots,
      holiday,
      holidayClosed: slots.length === 0 && usual.length > 0,
      assumed: false,
    };
  }
  const closed = ALWAYS_CLOSED.includes(date.slice(5)) || !opensOnSundays(schedule, date);
  return {
    slots: closed ? [] : usual,
    holiday,
    holidayClosed: closed && usual.length > 0,
    assumed: true,
  };
}

/**
 * The state of a schedule at an instant.
 * @param {{ rules: object[], phExplicit: boolean }|null} schedule
 * @param {number} ms
 * @param {{ zone: string, department: string }} place
 * @returns {{
 *   known: boolean, open: boolean, minutesLeft: number|null,
 *   closing: { date: string, minutes: number }|null,
 *   next: { date: string, minutes: number, days: number }|null,
 *   today: { date: string, slots: object[], holiday: boolean, holidayClosed: boolean, assumed: boolean },
 * }}
 */
export function statusAt(schedule, ms, { zone, department }) {
  const { date, minutes } = localTime(ms, zone);
  if (!schedule) {
    return {
      known: false,
      open: false,
      minutesLeft: null,
      closing: null,
      next: null,
      today: {
        date,
        slots: [],
        holiday: isHoliday(date, department),
        holidayClosed: false,
        assumed: false,
      },
    };
  }
  const today = { date, ...dayOf(schedule, date, department) };
  const current = today.slots.find(({ from, to }) => minutes >= from && minutes < to) ?? null;
  const closing = current ? { date, minutes: current.to } : null;
  const minutesLeft = current ? current.to - minutes : null;
  // The next opening: after the current slot when open.
  const after = current ? current.to : minutes;
  let next = null;
  for (let offset = 0; offset <= SEARCH_DAYS && !next; offset += 1) {
    const day = addDays(date, offset);
    const slot = (offset === 0 ? today : dayOf(schedule, day, department)).slots.find(
      ({ from }) => offset > 0 || from > after || (!current && from >= after),
    );
    if (slot) {
      next = { date: day, minutes: slot.from, days: daysBetween(date, day) };
    }
  }
  return { known: true, open: Boolean(current), minutesLeft, closing, next, today };
}
