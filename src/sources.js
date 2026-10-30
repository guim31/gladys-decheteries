// -----------------------------------------------------------------------------
// The open data sources: the metropolitan areas that publish the opening hours
// of their recycling centres (Opendatasoft v2.1, no key). Each one is a single
// request: the datasets hold a few dozen records.
//
// Only sources with real hours are here. Left aside on 30/10/2026: Rennes
// (hours for 1 site in 24), Nantes (waste streams only), Angers (a day by day
// calendar no longer kept up for most sites), Aix-Marseille (free text).
//
// A site becomes `{ key, source, id, name, city, address, lat, lon, schedule,
// waste, department, zone }`; `key` (`<source>-<id>`) builds the external ids
// and never changes. Sites without readable hours are kept, flagged: a site
// added to Gladys keeps its device, and the Discover tab only offers sites
// with hours.
// -----------------------------------------------------------------------------

import { PARIS } from './clock.js';
import { parseOpeningHours, parsePeriods } from './hours.js';
import { HttpError, getJson, hostOf } from './http.js';

const records = (base, fields) =>
  `${base}/records?select=${encodeURIComponent(fields.join(','))}&limit=100`;

const words = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const SMALL_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'en', 'sur', 'sous']);

/** "DÉCHÈTERIE DE L'UNION" → "Déchèterie de l'Union". */
export function titleCase(value) {
  return words(value)
    .toLocaleLowerCase('fr-FR')
    .split(' ')
    .map((word, index) => {
      if (index > 0 && SMALL_WORDS.has(word)) {
        return word;
      }
      const elided = /^([dl]')(.+)$/.exec(word);
      if (elided) {
        const article = index === 0 ? elided[1].toLocaleUpperCase('fr-FR') : elided[1];
        return `${article}${elided[2][0].toLocaleUpperCase('fr-FR')}${elided[2].slice(1)}`;
      }
      return word.replace(
        /(^|-)(\p{L})/gu,
        (_, dash, letter) => dash + letter.toLocaleUpperCase('fr-FR'),
      );
    })
    .join(' ');
}

const number = (value) => (Number.isFinite(Number(value)) && value !== null ? Number(value) : null);

function site(source, { id, name, city, address, point, schedule, raw }, extra = {}) {
  return {
    key: `${source.id}-${id}`,
    source: source.id,
    id: String(id),
    name: words(name).slice(0, 100),
    city: words(city),
    address: words(address),
    lat: number(point?.lat),
    lon: number(point?.lon),
    schedule,
    // The hours as published: two evaluations compare it before firing a trigger.
    signature: JSON.stringify(raw ?? null),
    waste: null,
    department: source.department,
    zone: PARIS,
    ...extra,
  };
}

/** "Rue de l'Église rouge 67000 Strasbourg France" → "Strasbourg". */
const cityOfAddress = (address) =>
  /\b\d{5}\s+(.+?)(?:\s+France)?$/i.exec(words(address))?.[1] ?? '';

// Waste streams of Bordeaux (`acceptes`), codes of the dataset. Other values
// are sentences ("Pour connaître la liste…"): the list is then unknown.
export const WASTE_CODES = [
  'DECHETS_VERTS',
  'GRAVAT',
  'GRAVATS',
  'BOIS',
  'METAUX',
  'CARTON',
  'VERRE',
  'DECHETS_DEQUIPEMENTS_ELECTRIQUES_ET_ELECTRONIQUES',
  'ECRANS_TELEVISEURS',
  'DECHETS_DELEMENTS_DAMEUBLEMENT',
  'TOUT_VENANT_INCINERABLE',
  'TOUT_VENANT_NON_INCINERABLE',
  'DECHETS_DIFFUS_SPECIFIQUES',
  'HUILES_DE_VIDANGE',
  'HUILES_ALIMENTAIRES',
  'BATTERIES',
  'PILES',
  'PNEUMATIQUES',
  'BOUTEILLES_DE_GAZ',
  'EXTINCTEURS',
  'FIBROCIMENT',
  'AMIANTE',
  'LIVRES',
  'MEDICAMENTS',
];

/** The common streams shown as binary features: code lists by feature key. */
export const WASTE_FEATURES = {
  green_waste: ['DECHETS_VERTS'],
  rubble: ['GRAVAT', 'GRAVATS'],
  wood: ['BOIS'],
  electrical: ['DECHETS_DEQUIPEMENTS_ELECTRIQUES_ET_ELECTRONIQUES', 'ECRANS_TELEVISEURS'],
  bulky: [
    'TOUT_VENANT_INCINERABLE',
    'TOUT_VENANT_NON_INCINERABLE',
    'DECHETS_DELEMENTS_DAMEUBLEMENT',
  ],
};

export const SOURCES = [
  {
    id: 'strasbourg',
    name: 'Strasbourg',
    department: '67',
    hasWaste: false,
    url: records('https://data.strasbourg.eu/api/explore/v2.1/catalog/datasets/lieux_decheteries', [
      'name',
      'friendlyurl',
      'address',
      'periods',
      'point_geo',
    ]),
    // The id of the place in the city's directory, in its page address.
    toSite(source, record) {
      const id = /\/id\/(\d+)\//.exec(record.friendlyurl ?? '')?.[1];
      if (!id) {
        return null;
      }
      return site(source, {
        id,
        name: record.name,
        city: cityOfAddress(record.address),
        address: record.address,
        point: record.point_geo,
        schedule: parsePeriods(record.periods),
        raw: record.periods,
      });
    },
  },
  {
    id: 'toulouse',
    name: 'Toulouse',
    department: '31',
    hasWaste: false,
    url: records(
      'https://data.toulouse-metropole.fr/api/explore/v2.1/catalog/datasets/dechetteries_tm',
      [
        'equip_uid',
        'equip_nom',
        'adr_numero',
        'adr_nomvoie',
        'adr_codepostal',
        'adr_commune',
        'equip_ouverture',
        'equip_geopoint',
      ],
    ),
    toSite(source, record) {
      if (!record.equip_uid) {
        return null;
      }
      // 99999 stands for "no street number".
      const street = [
        Number(record.adr_numero) === 99999 ? '' : record.adr_numero,
        record.adr_nomvoie,
      ];
      return site(source, {
        id: record.equip_uid,
        name: titleCase(record.equip_nom),
        city: titleCase(record.adr_commune),
        address: `${words(street.join(' '))}, ${record.adr_codepostal ?? ''} ${titleCase(record.adr_commune)}`,
        point: record.equip_geopoint,
        schedule: parseOpeningHours(record.equip_ouverture),
        raw: record.equip_ouverture,
      });
    },
  },
  {
    id: 'bordeaux',
    name: 'Bordeaux',
    department: '33',
    hasWaste: true,
    url: records(
      'https://datahub.bordeaux-metropole.fr/api/explore/v2.1/catalog/datasets/dechetteries-en-temps-reel',
      ['gid', 'nom', 'adresse', 'acceptes', 'horaires_osm', 'geo_point_2d'],
    ),
    toSite(source, record) {
      if (record.gid === null || record.gid === undefined) {
        return null;
      }
      const accepted = Array.isArray(record.acceptes) ? record.acceptes : [];
      const codes = accepted.filter((code) => /^[A-Z_]+$/.test(code));
      return site(
        source,
        {
          id: record.gid,
          // "CR" is the metropolitan "centre de recyclage".
          name: words(record.nom).replace(/^CR /, 'Centre de recyclage '),
          city: cityOfAddress(record.adresse),
          address: record.adresse,
          point: record.geo_point_2d,
          schedule: parseOpeningHours(record.horaires_osm),
          raw: record.horaires_osm,
        },
        { waste: codes.length > 0 ? codes : null },
      );
    },
  },
  {
    id: 'tours',
    name: 'Tours',
    department: '37',
    hasWaste: false,
    url: records(
      'https://data.tours-metropole.fr/api/explore/v2.1/catalog/datasets/equipements-decheteries-tours-metropole-val-de-loire',
      ['publidata_uuid', 'name', 'postal_address', 'opening_hours', 'geo_coordinates'],
    ),
    toSite(source, record) {
      if (!record.publidata_uuid) {
        return null;
      }
      const name = words(record.name);
      return site(source, {
        id: record.publidata_uuid,
        name: /^d[ée]ch[eè]t+erie/i.test(name) ? name : `Déchèterie ${name}`,
        city: cityOfAddress(record.postal_address),
        address: record.postal_address,
        point: record.geo_coordinates,
        schedule: parseOpeningHours(record.opening_hours),
        raw: record.opening_hours,
      });
    },
  },
];

export const SOURCE_IDS = SOURCES.map((source) => source.id);
export const sourceOf = (id) => SOURCES.find((source) => source.id === id) ?? null;

/** The sites of a source: one request. */
export async function readSource(fetchImpl, source) {
  const body = await getJson(fetchImpl, source.url, { maxBytes: 2e6 });
  // An empty or unexpected answer is a failure: the last good read is kept.
  if (!Array.isArray(body?.results) || body.results.length === 0) {
    throw new HttpError(`${hostOf(source.url)}: no record`);
  }
  // One page of 100: the sources hold a few dozen sites. More would be cut.
  if (Number(body.total_count) > body.results.length) {
    throw new HttpError(`${hostOf(source.url)}: more than ${body.results.length} records`);
  }
  return body.results.map((record) => source.toSite(source, record ?? {})).filter(Boolean);
}

/** Distance in km between two points (haversine). */
export function distanceKm(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
