// -----------------------------------------------------------------------------
// The Gladys device of a recycling centre and its states:
//
//   open      input/binary   1 = open now (no state when the hours are unreadable)
//   hours     text/text      today's hours, "Closed today", "Public holiday…"
//   closes    text/text      closing time of the current opening, "Closed"
//   next      text/text      next opening ("tomorrow at 08:30")
//
// and, for the sources that list the accepted waste (Bordeaux, Lyon):
//
//   waste       text/text     accepted waste, in the configured language
//   green_waste, rubble, wood, electrical, bulky   input/binary, 1 = accepted
//
// The features depend on the source only, never on the current data: a site
// whose list disappears keeps them, without state.
//
// Read-only, no polling: the integration computes open or closed every minute
// on its own timer (src/service.js), Gladys never polls (`should_poll: false`).
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as C,
  DEVICE_FEATURE_TYPES as T,
} from '@gladysassistant/integration-sdk';
import { NAMES, TEXT, WASTE, say } from './messages.js';
import { WASTE_CODES, WASTE_FEATURES, sourceOf } from './sources.js';

export const SITE_TYPE = 'site';
export const FEATURE_KEYS = ['open', 'hours', 'closes', 'next'];
export const WASTE_KEYS = ['waste', ...Object.keys(WASTE_FEATURES)];
export const MAX_DEVICE_NAME = 100;
export const MAX_TEXT = 500;

/** Shortens a text to `max` characters, with an ellipsis. */
export function clip(text, max) {
  const value = String(text ?? '');
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

/** The external ids of a site, from its key (`bordeaux-12`). */
export const idsOf = (gladys, key) => gladys.externalIds(SITE_TYPE, key);

/** The feature keys of a site of a source. */
export const featureKeysOf = (sourceId) =>
  sourceOf(sourceId)?.hasWaste ? [...FEATURE_KEYS, ...WASTE_KEYS] : FEATURE_KEYS;

/**
 * The device of a site.
 * @param {object} gladys
 * @param {object} site from src/sources.js
 * @param {string} language
 */
export function buildSiteDevice(gladys, site, language) {
  const ids = idsOf(gladys, site.key);
  const names = NAMES[language] ?? NAMES.en;
  const text = { category: C.TEXT, type: T.TEXT.TEXT, min: 0, max: 0 };
  const binary = { category: C.INPUT, type: T.SENSOR.BINARY, min: 0, max: 1 };
  return {
    name: clip(site.name || site.key, MAX_DEVICE_NAME),
    external_id: ids.device,
    should_poll: false,
    params: [
      { name: 'site', value: site.key },
      { name: 'city', value: site.city },
      { name: 'address', value: clip(site.address, 200) },
    ],
    features: featureKeysOf(site.source).map((key) => ({
      name: names[key],
      external_id: ids.feature(key),
      ...(key === 'open' || WASTE_FEATURES[key] ? binary : text),
      read_only: true,
      has_feedback: false,
    })),
  };
}

/** "green waste, rubble, wood…", the accepted waste in a language, without duplicates. */
export function wasteText(codes, language) {
  const labels = WASTE[language] ?? WASTE.en;
  const known = WASTE_CODES.filter((code) => codes.includes(code)).map((code) => labels[code]);
  return [...new Set(known)].join(', ');
}

/**
 * The states of a site from its view (src/service.js): the open state only
 * when the hours are readable, texts never empty.
 */
export function siteStates(gladys, site, view, language) {
  const ids = idsOf(gladys, site.key);
  const states = [];
  if (view.known) {
    states.push({ device_feature_external_id: ids.feature('open'), state: view.open ? 1 : 0 });
  }
  for (const key of ['hours', 'closes', 'next']) {
    states.push({ device_feature_external_id: ids.feature(key), text: clip(view[key], MAX_TEXT) });
  }
  if (sourceOf(site.source)?.hasWaste) {
    const codes = site.waste;
    const text = codes ? wasteText(codes, language) : '';
    states.push({
      device_feature_external_id: ids.feature('waste'),
      text: clip(text || say(TEXT, language, 'wasteUnknown'), MAX_TEXT),
    });
    if (codes) {
      for (const [key, list] of Object.entries(WASTE_FEATURES)) {
        states.push({
          device_feature_external_id: ids.feature(key),
          state: list.some((code) => codes.includes(code)) ? 1 : 0,
        });
      }
    }
  }
  return states;
}
