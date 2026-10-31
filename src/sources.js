// -----------------------------------------------------------------------------
// The open data sources: the metropolitan areas that publish the opening hours
// of their recycling centres (Opendatasoft v2.1, and the WFS of Grand Lyon, no
// key). Each one is a single request: the datasets hold a few dozen records.
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
import { jsonList, parseOpeningHours, parsePeriods } from './hours.js';
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
  // Lyon only.
  'ENCOMBRANTS',
  'PLATRE',
  'LAMPES',
  'TEXTILES',
  'PAPIER',
  'FENETRES',
];

/** The common streams shown as binary features: code lists by feature key. */
export const WASTE_FEATURES = {
  green_waste: ['DECHETS_VERTS'],
  rubble: ['GRAVAT', 'GRAVATS'],
  wood: ['BOIS'],
  electrical: ['DECHETS_DEQUIPEMENTS_ELECTRIQUES_ET_ELECTRONIQUES', 'ECRANS_TELEVISEURS'],
  bulky: [
    'ENCOMBRANTS',
    'TOUT_VENANT_INCINERABLE',
    'TOUT_VENANT_NON_INCINERABLE',
    'DECHETS_DELEMENTS_DAMEUBLEMENT',
  ],
};

// Waste categories of Grand Lyon (`allowed_waste`), by the start of their
// label without accents or case: "DEEE (Télévisions, écrans…)" → "deee".
const LYON_WASTE = [
  ['vegetaux', 'DECHETS_VERTS'],
  ['gravats', 'GRAVATS'],
  ['bois', 'BOIS'],
  ['metaux', 'METAUX'],
  ['cartons', 'CARTON'],
  ['deee', 'DECHETS_DEQUIPEMENTS_ELECTRIQUES_ET_ELECTRONIQUES'],
  ['petits appareils electriques', 'DECHETS_DEQUIPEMENTS_ELECTRIQUES_ET_ELECTRONIQUES'],
  ['meubles', 'DECHETS_DELEMENTS_DAMEUBLEMENT'],
  ['encombrants', 'ENCOMBRANTS'],
  ['ddn', 'DECHETS_DIFFUS_SPECIFIQUES'],
  ['huiles vidange', 'HUILES_DE_VIDANGE'],
  ['huiles friture', 'HUILES_ALIMENTAIRES'],
  ['batteries', 'BATTERIES'],
  ['piles', 'PILES'],
  ['pneus', 'PNEUMATIQUES'],
  ['platre', 'PLATRE'],
  ['lampes', 'LAMPES'],
  ['textiles', 'TEXTILES'],
  ['papier', 'PAPIER'],
  ['fenetres', 'FENETRES'],
];

const plain = (value) => words(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** The codes of Grand Lyon's `allowed_waste`, null when the list is missing. */
export function lyonWaste(list) {
  const entries = jsonList(list);
  if (entries.length === 0) {
    return null;
  }
  const codes = entries.map((entry) => {
    const label = plain(entry?.['schema:category']);
    return LYON_WASTE.find(([start]) => label.startsWith(start))?.[1];
  });
  return [...new Set(codes.filter(Boolean))];
}

/** "CHAMPAGNE-AU-MONT-D'OR" → "Champagne-au-Mont-d'Or", "LYON 5 ÈME" → "Lyon 5e". */
export const lyonCity = (value) =>
  titleCase(value)
    .replace(/-(?:De|Du|Des|La|Le|Les|Et|En|Sur|Sous|Au|Aux)(?=-)/g, (part) => part.toLowerCase())
    .replace(
      /-([DL])'(\p{L})/gu,
      (_, article, letter) => `-${article.toLowerCase()}'${letter.toUpperCase()}`,
    )
    .replace(
      / (\d+) (?:Er|Ère|Ème|Eme)$/,
      (_, number) => ` ${number}${number === '1' ? 'er' : 'e'}`,
    );

/** A JSON object or its text (`address`, declared as a string by the WFS). */
const objectOf = (value) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' ? value : {};
};

// The Grand Lyon layer, as GeoJSON in WGS84, only the fields read.
const LYON_URL =
  'https://data.grandlyon.com/geoserver/metropole-de-lyon/ows?SERVICE=WFS&VERSION=2.0.0' +
  '&request=GetFeature&typeNames=metropole-de-lyon:gip_proprete.gipdecheterie_3_0_0' +
  '&outputFormat=application/json&SRSNAME=EPSG:4326&count=100' +
  '&propertyName=identifiant,nom,type_decheterie,address,horaires,allowed_waste,the_geom';

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
  {
    id: 'lyon',
    name: 'Lyon',
    department: '69',
    hasWaste: true,
    url: LYON_URL,
    // A WFS answer: GeoJSON features, `numberMatched` for the total.
    recordsOf: (body) => ({
      records: Array.isArray(body?.features) ? body.features : null,
      total: Number(body?.numberMatched),
    }),
    toSite(source, feature) {
      const record = feature.properties ?? {};
      if (record.identifiant === null || record.identifiant === undefined) {
        return null;
      }
      const address = objectOf(record.address);
      const city = lyonCity(address.addressLocality);
      const [lon, lat] = Array.isArray(feature.geometry?.coordinates)
        ? feature.geometry.coordinates
        : [];
      // "Lyon 5" is a mobile centre: said in the name.
      const mobile = /mobile/i.test(record.type_decheterie ?? '');
      return site(
        source,
        {
          id: record.identifiant,
          name: `${mobile ? 'Déchèterie mobile' : 'Déchèterie'} ${words(record.nom)}`,
          city,
          address: `${words(address.streetAddress)}, ${words(address.postalCode)} ${city}`,
          point: { lat, lon },
          schedule: parseOpeningHours(record.horaires, { shareDate: true }),
          raw: record.horaires,
        },
        { waste: lyonWaste(record.allowed_waste) },
      );
    },
  },
];

export const SOURCE_IDS = SOURCES.map((source) => source.id);
export const sourceOf = (id) => SOURCES.find((source) => source.id === id) ?? null;

/** The records of an Opendatasoft v2.1 answer and their total. */
const opendatasoft = (body) => ({
  records: Array.isArray(body?.results) ? body.results : null,
  total: Number(body?.total_count),
});

/** The sites of a source: one request. */
export async function readSource(fetchImpl, source) {
  const body = await getJson(fetchImpl, source.url, { maxBytes: 2e6 });
  const { records, total } = (source.recordsOf ?? opendatasoft)(body);
  // An empty or unexpected answer is a failure: the last good read is kept.
  if (!Array.isArray(records) || records.length === 0) {
    throw new HttpError(`${hostOf(source.url)}: no record`);
  }
  // One page of 100: the sources hold a few dozen sites. More would be cut.
  if (total > records.length) {
    throw new HttpError(`${hostOf(source.url)}: more than ${records.length} records`);
  }
  return records.map((record) => source.toSite(source, record ?? {})).filter(Boolean);
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
