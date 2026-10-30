// -----------------------------------------------------------------------------
// Opening hours: the OpenStreetMap subset and the periods of Strasbourg, on
// the real values of the sources (2026-10-30), public holidays included.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARIS } from '../src/clock.js';
import { dayOf, parseOpeningHours, parsePeriods, statusAt } from '../src/hours.js';
import { fixtureJson, paris } from './helpers/world.js';

const record = (source, predicate) => fixtureJson(`${source}.json`).results.find(predicate);
const osm = (source, field, name) =>
  parseOpeningHours(record(source, (r) => JSON.stringify(r).includes(name))[field]);
const toulouse = (name) => osm('toulouse', 'equip_ouverture', name);
const tours = (name) => osm('tours', 'opening_hours', name);
const strasbourg = (name) =>
  parsePeriods(record('strasbourg', (r) => r.name.includes(name)).periods);

const hours = (schedule, date, department) =>
  dayOf(schedule, date, department)
    .slots.map(({ from, to }) => `${from / 60}-${to / 60}`)
    .join(',');
const status = (schedule, text, department = '31') =>
  statusAt(schedule, paris(text), { zone: PARIS, department });

test('weekday ranges, "off" days and seasons (Toulouse, Decoset)', () => {
  const fronton = toulouse('FRONTON');
  assert.equal(hours(fronton, '2026-11-02', '31'), '9.5-12,13.5-18'); // Monday
  assert.equal(hours(fronton, '2026-11-03', '31'), ''); // "Tu off"
  assert.equal(hours(fronton, '2026-11-07', '31'), '9.5-18'); // Saturday
  // "Apr-Sep …; Oct-Mar …": Saturday only in summer.
  const blagnac = toulouse('BLAGNAC');
  assert.equal(hours(blagnac, '2026-10-31', '31'), '');
  assert.equal(hours(blagnac, '2026-05-16', '31'), '9-18');
  assert.equal(hours(blagnac, '2026-10-30', '31'), '9-12,14-18');
  assert.equal(hours(blagnac, '2026-04-30', '31'), '8.5-12,13.5-19');
  // No weekday: every day.
  assert.equal(hours(toulouse('PLAISANCE'), '2026-11-08', '31'), '8.5-18.5');
});

test('dated rules: years, day lists, ranges across months (Tours)', () => {
  const grange = tours('La Grange David');
  // "Dec 24,31 09:00-12:30,13:30-16:00", every year.
  assert.equal(hours(grange, '2026-12-24', '37'), '9-12.5,13.5-16');
  assert.equal(hours(grange, '2027-12-31', '37'), '9-12.5,13.5-16');
  // "2026 Jul 27-2026 Aug 01 07:30-15:30": a Monday, usually closed.
  assert.equal(hours(grange, '2026-07-27', '37'), '7.5-15.5');
  assert.equal(hours(grange, '2026-07-20', '37'), '');
  // "2026 Jun 25-27 06:00-13:00", later than "2026 Jun 16-28 Tu-Sa …": it wins.
  assert.equal(hours(grange, '2026-06-26', '37'), '6-13');
  assert.equal(hours(grange, '2026-06-24', '37'), '7.5-15.5');
  // Not the same days of another year.
  assert.equal(hours(grange, '2027-06-26', '37'), '8.75-12.5,13.5-17.75');
  // "2026 Jan 12-23 off".
  assert.equal(hours(tours('Cassantin'), '2026-01-15', '37'), '');
  assert.equal(hours(tours('Cassantin'), '2026-01-24', '37'), '9-12.5,13.5-17.75');
});

test('"PH off": closed on a public holiday, said by the source', () => {
  const grange = tours('La Grange David');
  const armistice = dayOf(grange, '2026-11-11', '37');
  assert.deepEqual(armistice, { slots: [], holiday: true, holidayClosed: true, assumed: false });
  const state = status(grange, '2026-11-11 10:00', '37');
  assert.equal(state.open, false);
  assert.deepEqual(state.next, { date: '2026-11-12', minutes: 525, days: 1 });
});

test('no holiday rule: closed on 1 Jan, 1 May, 25 Dec; otherwise open if it opens on Sundays', () => {
  // Montgiscard opens on Sundays, Le Ramier does not.
  const montgiscard = toulouse('MONTGISCARD');
  const ramier = toulouse('RAMIER');
  assert.deepEqual(dayOf(montgiscard, '2026-11-11', '31'), {
    slots: [
      { from: 570, to: 720 },
      { from: 810, to: 1080 },
    ],
    holiday: true,
    holidayClosed: false,
    assumed: true,
  });
  assert.equal(dayOf(montgiscard, '2026-12-25', '31').holidayClosed, true);
  assert.equal(dayOf(ramier, '2026-11-11', '31').holidayClosed, true);
  assert.equal(dayOf(ramier, '2026-11-11', '31').assumed, true);
});

test('the periods of Strasbourg: Monday is 0, a dated period replaces the usual one', () => {
  const wacken = strasbourg('Wacken');
  assert.equal(hours(wacken, '2026-11-02', '67'), '8-18.75'); // Monday
  assert.equal(hours(wacken, '2026-11-08', '67'), '8-11.75'); // Sunday
  // The curfew hours of 2020-2021.
  assert.equal(hours(wacken, '2021-01-11', '67'), '8-18.5');
  // La Wantzenau: Monday, Wednesday, Saturday.
  const wantzenau = strasbourg('Wantzenau');
  assert.deepEqual(
    ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-07', '2026-11-08'].map((d) =>
      hours(wantzenau, d, '67'),
    ),
    ['8-18.75', '', '8-18.75', '8-18.75', ''],
  );
  // St Stephen's Day, a holiday in Alsace: open on Sundays, so assumed open.
  assert.equal(dayOf(wacken, '2026-12-26', '67').assumed, true);
  assert.equal(hours(wacken, '2026-12-26', '67'), '8-18.75');
  assert.equal(dayOf(wantzenau, '2026-12-26', '67').holidayClosed, true);
});

test('open, closing time, next opening at an instant', () => {
  const blagnac = toulouse('BLAGNAC');
  assert.deepEqual(status(blagnac, '2026-10-30 10:00'), {
    known: true,
    open: true,
    minutesLeft: 120,
    closing: { date: '2026-10-30', minutes: 720 },
    next: { date: '2026-10-30', minutes: 840, days: 0 },
    today: {
      date: '2026-10-30',
      slots: [
        { from: 540, to: 720 },
        { from: 840, to: 1080 },
      ],
      holiday: false,
      holidayClosed: false,
      assumed: false,
    },
  });
  // Friday evening: Saturday closed in winter, Sunday 10:00.
  const evening = status(blagnac, '2026-10-30 18:00');
  assert.equal(evening.open, false);
  assert.deepEqual(evening.next, { date: '2026-11-01', minutes: 600, days: 2 });
  // Sunday 1 November (All Saints'): Blagnac opens on Sundays, assumed open.
  assert.equal(status(blagnac, '2026-11-01 10:30').open, true);
});

test('what is not read is never guessed: the whole schedule is unreadable', () => {
  for (const text of [
    '',
    null,
    'PH off',
    'Mo-Fr 22:00-02:00',
    '24/7',
    'Mo-Fr 09:00-12:00 || PH off',
    'week 01-10 Mo 09:00-12:00',
    'Mo-Fr 09:00-12:00; sunrise-sunset',
    'Mo-Fr 9h-12h',
  ]) {
    assert.equal(parseOpeningHours(text), null, String(text));
  }
  assert.equal(parsePeriods('not json'), null);
  assert.equal(parsePeriods('[]'), null);
  const unknown = status(null, '2026-10-30 10:00');
  assert.equal(unknown.known, false);
  assert.equal(unknown.open, false);
});

test('weekday ranges wrap around the week, spaces around commas are tolerated', () => {
  const schedule = parseOpeningHours('Sa-Mo 09:00-12:00, 14:00-17:00');
  assert.equal(hours(schedule, '2026-11-02', '31'), '9-12,14-17'); // Monday
  assert.equal(hours(schedule, '2026-11-03', '31'), ''); // Tuesday
  assert.equal(hours(schedule, '2026-11-07', '31'), '9-12,14-17'); // Saturday
});

test('dated ranges across a year, and dates that cannot be meant, are rejected or read right', () => {
  const winter = parseOpeningHours('Mo-Fr 09:00-17:00; 2026 Dec 20-Jan 05 off');
  assert.equal(hours(winter, '2026-12-22', '31'), '');
  assert.equal(hours(winter, '2027-01-04', '31'), '');
  assert.equal(hours(winter, '2027-01-06', '31'), '9-17');
  for (const text of ['Jun 28-16 off', 'Feb 0 off', 'Dec 32 off', '2026 Oct-Mar Mo 09:00-12:00']) {
    assert.equal(parseOpeningHours(`Mo-Fr 09:00-12:00; ${text}`), null, text);
  }
});

test('a dated period of Strasbourg without hours is a closure', () => {
  const periods = JSON.parse(record('strasbourg', (r) => r.name.includes('Wacken')).periods);
  periods.push({ alwaysOpen: 0, schedules: [], startDate: '2026-12-01', endDate: '2026-12-31' });
  const closed = parsePeriods(JSON.stringify(periods));
  assert.equal(hours(closed, '2026-12-08', '67'), '');
  assert.equal(hours(closed, '2027-01-04', '67'), '8-18.75');
});
