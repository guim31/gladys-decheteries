// -----------------------------------------------------------------------------
// Integration configuration: defaults (they mirror the `default` values of the
// manifest `config_schema`, see test/manifest.test.js) and normalization, so
// the rest of the code never deals with strings, blanks or `undefined`.
// -----------------------------------------------------------------------------

import { SOURCE_IDS } from './sources.js';

export const LANGUAGES = ['en', 'fr', 'de', 'es'];
// Sites offered around the house, and how far.
export const NEAREST_COUNT = { min: 0, max: 10 };
export const MAX_DISTANCE_KM = { min: 1, max: 200 };
// Minutes before closing of the closing_soon trigger.
export const CLOSING_NOTICE = { min: 5, max: 180 };

export const DEFAULT_CONFIG = {
  areas: [],
  nearest_count: 3,
  max_distance: 30,
  closing_notice: 30,
  language: 'fr',
};

/** An integer within its bounds, the default for a blank or a non-number. */
function integerOf(value, { min, max }, fallback) {
  const text = String(value ?? '').trim();
  const number = Number(text.replace(',', '.'));
  if (text === '' || !Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(number)));
}

/** The ticked areas: an array from the form, tolerating a JSON or comma-separated string. */
function areasOf(value) {
  let list = value ?? [];
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      list = list.split(',');
    }
  }
  if (!Array.isArray(list)) {
    return [];
  }
  const wanted = list.map((item) => String(item).trim());
  return SOURCE_IDS.filter((id) => wanted.includes(id));
}

/**
 * @param {Record<string, unknown>} raw the configuration returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    areas: areasOf(source.areas),
    nearestCount: integerOf(source.nearest_count, NEAREST_COUNT, DEFAULT_CONFIG.nearest_count),
    maxDistanceKm: integerOf(source.max_distance, MAX_DISTANCE_KM, DEFAULT_CONFIG.max_distance),
    closingNotice: integerOf(source.closing_notice, CLOSING_NOTICE, DEFAULT_CONFIG.closing_notice),
    language: LANGUAGES.includes(source.language) ? source.language : DEFAULT_CONFIG.language,
  };
}
