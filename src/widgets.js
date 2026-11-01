// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+).
//
// - sites: the watched recycling centres, one status row each ("Déchèterie
//   de Blagnac" / "ouvert jusqu'à 18:00"), green when open, orange in the
//   last half-hour, red when closed, grey without readable hours. The times
//   can be hidden. With `days` above 1, each site row is followed by the
//   next days ("mar. 3 – ven. 6" / "09:00–12:00, 14:00–18:00"), the same
//   consecutive days on one row; a site whose rows no longer fit is left out
//   and a caption says how many.
//
// Budget of the core: 8 components, 2 texts, 1 status (10 rows): the days
// share the one status with the sites, rather than one component per site.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { localTime, hhmm, weekdayOf } from './clock.js';
import { clip } from './devices.js';
import { daysAfter } from './hours.js';
import { SHORT_WEEKDAYS, TEXT, say } from './messages.js';
import { CLOSING_SOON_MINUTES, WIDGET_KEY } from './service.js';

export const MAX_ROWS = 10;
const MAX_LABEL = 40;
// The minute clock: a row is never more than a minute behind.
const TTL_SECONDS = 60;

/** The color of a row. */
export function siteColor(service, site) {
  if (!site) {
    return WIDGET_COLORS.NEUTRAL;
  }
  const view = service.view(site);
  if (!view.known) {
    return WIDGET_COLORS.NEUTRAL;
  }
  if (!view.open) {
    return WIDGET_COLORS.DANGER;
  }
  return view.minutesLeft <= CLOSING_SOON_MINUTES ? WIDGET_COLORS.WARNING : WIDGET_COLORS.SUCCESS;
}

// The values of the `days` setting: today only, or today and the next days.
export const DAY_CHOICES = [1, 2, 3, 7];

/** The `days` setting as a number of days, 1 when absent or unknown. */
export function daysOf(settings) {
  const days = Number(settings?.days);
  return DAY_CHOICES.includes(days) ? days : 1;
}

/** What one later day of a site is: its row value, color and label note. */
function dayView(day, language, hours) {
  if (!day.known) {
    return { value: say(TEXT, language, 'notPublished'), color: WIDGET_COLORS.NEUTRAL, note: '' };
  }
  if (day.holidayClosed) {
    const key = day.assumed ? 'holidayAssumed' : 'holidayClosed';
    return { value: say(TEXT, language, key), color: WIDGET_COLORS.DANGER, note: '' };
  }
  if (day.slots.length === 0) {
    return { value: say(TEXT, language, 'closed'), color: WIDGET_COLORS.DANGER, note: '' };
  }
  const value = hours
    ? day.slots.map(({ from, to }) => `${hhmm(from)}–${hhmm(to)}`).join(', ')
    : say(TEXT, language, 'open');
  let note = '';
  if (day.holiday) {
    note = say(TEXT, language, day.assumed ? 'holidayOpen' : 'holiday');
  }
  return { value, color: WIDGET_COLORS.SUCCESS, note };
}

const dayName = (date, language) =>
  say(TEXT, language, 'dayLabel', {
    day: SHORT_WEEKDAYS[language][weekdayOf(date)],
    number: Number(date.slice(8)),
  });

/** The rows of the days after today of a site, the same consecutive days on one row. */
export function dayRows(service, site, days, language, hours) {
  if (!site?.schedule || days <= 1) {
    return [];
  }
  const { date } = localTime(service.now(), site.zone);
  const groups = [];
  for (const day of daysAfter(site.schedule, date, days - 1, site.department)) {
    const view = dayView(day, language, hours);
    const last = groups.at(-1);
    if (last && last.value === view.value && last.note === view.note) {
      last.to = day.date;
    } else {
      groups.push({ ...view, from: day.date, to: day.date });
    }
  }
  return groups.map(({ value, color, note, from, to }) => {
    let label = dayName(from, language);
    if (to !== from) {
      label += ` – ${dayName(to, language)}`;
    }
    if (note) {
      label += ` · ${note}`;
    }
    return { label: clip(label, MAX_LABEL), value: clip(value, 40), color };
  });
}

async function sitesContent(service, { settings, language }) {
  await service.firstReading();
  const watched = service.watched();
  const chosen = Array.isArray(settings?.sites) ? settings.sites.map(String) : [];
  const hours = settings?.show_hours !== false;
  const entries =
    chosen.length > 0
      ? chosen.map((id) => watched.find((entry) => entry.deviceId === id)).filter(Boolean)
      : watched;
  if (entries.length === 0) {
    const key = chosen.length > 0 ? 'gone' : 'pickSite';
    return {
      ttl_seconds: TTL_SECONDS,
      components: [{ type: 'text', text: say(TEXT, language, key) }],
    };
  }
  const days = daysOf(settings);
  const rows = [];
  let hidden = 0;
  for (const entry of entries) {
    const site = service.sites.get(entry.key) ?? null;
    const group = [
      {
        // The name given in Gladys, not the source's.
        label: clip(entry.name || site?.name, MAX_LABEL),
        value: clip(service.shortText(site, language, { hours }), 40),
        color: siteColor(service, site),
      },
      ...dayRows(service, site, days, language, hours),
    ];
    // A site is shown whole or not at all, never cut in the middle of its days.
    if (rows.length + group.length > MAX_ROWS) {
      hidden += 1;
    } else {
      rows.push(...group);
    }
  }
  const components = [{ type: 'status', items: rows }];
  // Today only keeps its former silent cut at 10 sites.
  if (hidden > 0 && days > 1) {
    components.push({
      type: 'text',
      variant: 'caption',
      text: say(TEXT, language, 'hiddenSites', { count: hidden }),
    });
  }
  return { ttl_seconds: TTL_SECONDS, components };
}

export const WIDGETS = {
  [WIDGET_KEY]: { get: sitesContent },
};
