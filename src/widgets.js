// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+).
//
// - sites: the watched recycling centres, one status row each ("Déchèterie
//   de Blagnac" / "ouvert jusqu'à 18:00"), green when open, orange in the
//   last half-hour, red when closed, grey without readable hours. The times
//   can be hidden.
//
// Budget of the core: 8 components, 2 texts, 1 status (10 rows).
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { clip } from './devices.js';
import { TEXT, say } from './messages.js';
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
  return {
    ttl_seconds: TTL_SECONDS,
    components: [
      {
        type: 'status',
        items: entries.slice(0, MAX_ROWS).map((entry) => {
          const site = service.sites.get(entry.key) ?? null;
          return {
            // The name given in Gladys, not the source's.
            label: clip(entry.name || site?.name, MAX_LABEL),
            value: clip(service.shortText(site, language, { hours }), 40),
            color: siteColor(service, site),
          };
        }),
      },
    ],
  };
}

export const WIDGETS = {
  [WIDGET_KEY]: { get: sitesContent },
};
