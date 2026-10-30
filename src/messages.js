// -----------------------------------------------------------------------------
// Texts sent from the container (feature names, action messages, widget
// contents, scene outputs), in the four languages of the Gladys interface.
// Entries are strings or functions of one parameter object. German says "du",
// Spanish "usted". Names of sites never translate.
//
// French texts say "ouvert"/"fermé" after a colon ("c'est ouvert"), never as an
// adjective of the site: "Déchèterie de Blagnac : ouvert jusqu'à 18:00",
// whatever the gender of its name.
// -----------------------------------------------------------------------------

export const INIT_FAILED = {
  en: 'Initialization failed, check the integration logs.',
  fr: "L'initialisation a échoué, consultez les logs de l'intégration.",
  de: 'Initialisierung fehlgeschlagen, sieh dir die Protokolle der Integration an.',
  es: 'La inicialización ha fallado, consulte los registros de la integración.',
};

// Feature names, frozen when the device is created (configured language).
export const NAMES = {
  en: {
    open: 'Open now',
    hours: "Today's hours",
    closes: 'Closing time',
    next: 'Next opening',
    waste: 'Accepted waste',
    green_waste: 'Accepts green waste',
    rubble: 'Accepts rubble',
    wood: 'Accepts wood',
    electrical: 'Accepts electrical appliances',
    bulky: 'Accepts bulky waste',
  },
  fr: {
    open: 'Ouvert maintenant',
    hours: 'Horaires du jour',
    closes: 'Heure de fermeture',
    next: 'Prochaine ouverture',
    waste: 'Déchets acceptés',
    green_waste: 'Accepte les déchets verts',
    rubble: 'Accepte les gravats',
    wood: 'Accepte le bois',
    electrical: 'Accepte les appareils électriques',
    bulky: 'Accepte les encombrants',
  },
  de: {
    open: 'Jetzt geöffnet',
    hours: 'Heutige Öffnungszeiten',
    closes: 'Schließzeit',
    next: 'Nächste Öffnung',
    waste: 'Angenommene Abfälle',
    green_waste: 'Nimmt Grünschnitt an',
    rubble: 'Nimmt Bauschutt an',
    wood: 'Nimmt Holz an',
    electrical: 'Nimmt Elektrogeräte an',
    bulky: 'Nimmt Sperrmüll an',
  },
  es: {
    open: 'Abierto ahora',
    hours: 'Horario de hoy',
    closes: 'Hora de cierre',
    next: 'Próxima apertura',
    waste: 'Residuos aceptados',
    green_waste: 'Acepta restos de poda',
    rubble: 'Acepta escombros',
    wood: 'Acepta madera',
    electrical: 'Acepta aparatos eléctricos',
    bulky: 'Acepta voluminosos',
  },
};

// Waste streams of the sources (src/sources.js WASTE_CODES).
export const WASTE = {
  en: {
    DECHETS_VERTS: 'green waste',
    GRAVAT: 'rubble',
    GRAVATS: 'rubble',
    BOIS: 'wood',
    METAUX: 'metals',
    CARTON: 'cardboard',
    VERRE: 'glass',
    DECHETS_DEQUIPEMENTS_ELECTRIQUES_ET_ELECTRONIQUES: 'electrical appliances',
    ECRANS_TELEVISEURS: 'screens',
    DECHETS_DELEMENTS_DAMEUBLEMENT: 'furniture',
    TOUT_VENANT_INCINERABLE: 'burnable bulky waste',
    TOUT_VENANT_NON_INCINERABLE: 'non-burnable bulky waste',
    DECHETS_DIFFUS_SPECIFIQUES: 'household chemicals',
    HUILES_DE_VIDANGE: 'engine oil',
    HUILES_ALIMENTAIRES: 'cooking oil',
    BATTERIES: 'car batteries',
    PILES: 'batteries',
    PNEUMATIQUES: 'tyres',
    BOUTEILLES_DE_GAZ: 'gas bottles',
    EXTINCTEURS: 'extinguishers',
    FIBROCIMENT: 'fibre cement',
    AMIANTE: 'asbestos',
    LIVRES: 'books',
    MEDICAMENTS: 'medicines',
  },
  fr: {
    DECHETS_VERTS: 'déchets verts',
    GRAVAT: 'gravats',
    GRAVATS: 'gravats',
    BOIS: 'bois',
    METAUX: 'métaux',
    CARTON: 'cartons',
    VERRE: 'verre',
    DECHETS_DEQUIPEMENTS_ELECTRIQUES_ET_ELECTRONIQUES: 'appareils électriques',
    ECRANS_TELEVISEURS: 'écrans',
    DECHETS_DELEMENTS_DAMEUBLEMENT: 'meubles',
    TOUT_VENANT_INCINERABLE: 'tout-venant incinérable',
    TOUT_VENANT_NON_INCINERABLE: 'tout-venant non incinérable',
    DECHETS_DIFFUS_SPECIFIQUES: 'produits chimiques',
    HUILES_DE_VIDANGE: 'huiles de vidange',
    HUILES_ALIMENTAIRES: 'huiles alimentaires',
    BATTERIES: 'batteries',
    PILES: 'piles',
    PNEUMATIQUES: 'pneus',
    BOUTEILLES_DE_GAZ: 'bouteilles de gaz',
    EXTINCTEURS: 'extincteurs',
    FIBROCIMENT: 'fibrociment',
    AMIANTE: 'amiante',
    LIVRES: 'livres',
    MEDICAMENTS: 'médicaments',
  },
  de: {
    DECHETS_VERTS: 'Grünschnitt',
    GRAVAT: 'Bauschutt',
    GRAVATS: 'Bauschutt',
    BOIS: 'Holz',
    METAUX: 'Metalle',
    CARTON: 'Karton',
    VERRE: 'Glas',
    DECHETS_DEQUIPEMENTS_ELECTRIQUES_ET_ELECTRONIQUES: 'Elektrogeräte',
    ECRANS_TELEVISEURS: 'Bildschirme',
    DECHETS_DELEMENTS_DAMEUBLEMENT: 'Möbel',
    TOUT_VENANT_INCINERABLE: 'brennbarer Sperrmüll',
    TOUT_VENANT_NON_INCINERABLE: 'nicht brennbarer Sperrmüll',
    DECHETS_DIFFUS_SPECIFIQUES: 'Haushaltschemikalien',
    HUILES_DE_VIDANGE: 'Altöl',
    HUILES_ALIMENTAIRES: 'Speiseöl',
    BATTERIES: 'Autobatterien',
    PILES: 'Batterien',
    PNEUMATIQUES: 'Reifen',
    BOUTEILLES_DE_GAZ: 'Gasflaschen',
    EXTINCTEURS: 'Feuerlöscher',
    FIBROCIMENT: 'Faserzement',
    AMIANTE: 'Asbest',
    LIVRES: 'Bücher',
    MEDICAMENTS: 'Medikamente',
  },
  es: {
    DECHETS_VERTS: 'restos de poda',
    GRAVAT: 'escombros',
    GRAVATS: 'escombros',
    BOIS: 'madera',
    METAUX: 'metales',
    CARTON: 'cartón',
    VERRE: 'vidrio',
    DECHETS_DEQUIPEMENTS_ELECTRIQUES_ET_ELECTRONIQUES: 'aparatos eléctricos',
    ECRANS_TELEVISEURS: 'pantallas',
    DECHETS_DELEMENTS_DAMEUBLEMENT: 'muebles',
    TOUT_VENANT_INCINERABLE: 'voluminosos incinerables',
    TOUT_VENANT_NON_INCINERABLE: 'voluminosos no incinerables',
    DECHETS_DIFFUS_SPECIFIQUES: 'productos químicos',
    HUILES_DE_VIDANGE: 'aceite de motor',
    HUILES_ALIMENTAIRES: 'aceite de cocina',
    BATTERIES: 'baterías',
    PILES: 'pilas',
    PNEUMATIQUES: 'neumáticos',
    BOUTEILLES_DE_GAZ: 'bombonas de gas',
    EXTINCTEURS: 'extintores',
    FIBROCIMENT: 'fibrocemento',
    AMIANTE: 'amianto',
    LIVRES: 'libros',
    MEDICAMENTS: 'medicamentos',
  },
};

// Day names, Monday first.
export const WEEKDAYS = {
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
  de: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'],
  es: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
};
export const SHORT_WEEKDAYS = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  fr: ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'],
  de: ['Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.', 'So.'],
  es: ['lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.', 'dom.'],
};

// Feature states, widget rows and scene sentences. `when` is a text built by
// src/service.js ("demain à 08:30"), `short` its widget form ("lun. 08:30").
export const TEXT = {
  en: {
    closedToday: 'Closed today',
    holidayClosed: 'Public holiday: closed',
    holidayAssumed: 'Public holiday: assumed closed',
    holiday: 'public holiday',
    holidayOpen: 'public holiday, assumed open',
    noHours: 'Hours not readable',
    noNext: 'none in the next 14 days',
    unknown: 'unknown',
    closedNow: 'Closed',
    wasteUnknown: 'See the operator',
    today: ({ time }) => `today at ${time}`,
    tomorrow: ({ time }) => `tomorrow at ${time}`,
    weekday: ({ day, time }) => `${day} at ${time}`,
    date: ({ date, time }) => `on ${date} at ${time}`,
    open: 'open',
    closed: 'closed',
    openUntil: ({ time }) => `open until ${time}`,
    closesIn: ({ minutes }) => `closes in ${minutes} min`,
    opensAt: ({ short }) => `closed · opens ${short}`,
    holidayRow: ({ short }) => `holiday · opens ${short}`,
    sentenceOpen: ({ name, time }) => `${name}: open until ${time}.`,
    sentenceClosed: ({ name, when }) => `${name}: closed, opens ${when}.`,
    sentenceHoliday: ({ name, when }) => `${name}: public holiday, closed, opens ${when}.`,
    sentenceHolidayAssumed: ({ name, when }) =>
      `${name}: public holiday, assumed closed (the source does not say), opens ${when}.`,
    sentenceNoNext: ({ name }) => `${name}: closed, no opening in the next 14 days.`,
    sentenceUnknown: ({ name }) => `${name}: hours unknown.`,
    pickSite: 'Add a recycling centre in the Discover tab of the integration, then pick it here.',
    gone: 'This recycling centre is no longer watched.',
    noSite: 'No recycling centre is watched: add one in the Discover tab of the integration.',
  },
  fr: {
    closedToday: "Fermé aujourd'hui",
    holidayClosed: 'Jour férié : fermé',
    holidayAssumed: 'Jour férié : fermé a priori',
    holiday: 'jour férié',
    holidayOpen: 'jour férié, ouvert a priori',
    noHours: 'Horaires illisibles',
    noNext: 'aucune dans les 14 jours',
    unknown: 'inconnue',
    closedNow: 'Fermé',
    wasteUnknown: 'Voir le gestionnaire',
    today: ({ time }) => `aujourd'hui à ${time}`,
    tomorrow: ({ time }) => `demain à ${time}`,
    weekday: ({ day, time }) => `${day} à ${time}`,
    date: ({ date, time }) => `le ${date} à ${time}`,
    open: 'ouvert',
    closed: 'fermé',
    openUntil: ({ time }) => `ouvert jusqu'à ${time}`,
    closesIn: ({ minutes }) => `ferme dans ${minutes} min`,
    opensAt: ({ short }) => `fermé · ouvre ${short}`,
    holidayRow: ({ short }) => `férié · ouvre ${short}`,
    sentenceOpen: ({ name, time }) => `${name} : ouvert jusqu'à ${time}.`,
    sentenceClosed: ({ name, when }) => `${name} : fermé, ouvre ${when}.`,
    sentenceHoliday: ({ name, when }) => `${name} : jour férié, fermé, ouvre ${when}.`,
    sentenceHolidayAssumed: ({ name, when }) =>
      `${name} : jour férié, fermé a priori (la source ne précise rien), ouvre ${when}.`,
    sentenceNoNext: ({ name }) => `${name} : fermé, aucune ouverture dans les 14 jours.`,
    sentenceUnknown: ({ name }) => `${name} : horaires inconnus.`,
    pickSite:
      "Ajoutez une déchèterie dans l'onglet Découverte de l'intégration, puis choisissez-la ici.",
    gone: "Cette déchèterie n'est plus suivie.",
    noSite:
      "Aucune déchèterie n'est suivie : ajoutez-en une dans l'onglet Découverte de l'intégration.",
  },
  de: {
    closedToday: 'Heute geschlossen',
    holidayClosed: 'Feiertag: geschlossen',
    holidayAssumed: 'Feiertag: vermutlich geschlossen',
    holiday: 'Feiertag',
    holidayOpen: 'Feiertag, vermutlich geöffnet',
    noHours: 'Öffnungszeiten nicht lesbar',
    noNext: 'keine in den nächsten 14 Tagen',
    unknown: 'unbekannt',
    closedNow: 'Geschlossen',
    wasteUnknown: 'Siehe Betreiber',
    today: ({ time }) => `heute um ${time}`,
    tomorrow: ({ time }) => `morgen um ${time}`,
    weekday: ({ day, time }) => `${day} um ${time}`,
    date: ({ date, time }) => `am ${date} um ${time}`,
    open: 'geöffnet',
    closed: 'geschlossen',
    openUntil: ({ time }) => `geöffnet bis ${time}`,
    closesIn: ({ minutes }) => `schließt in ${minutes} Min.`,
    opensAt: ({ short }) => `geschlossen · öffnet ${short}`,
    holidayRow: ({ short }) => `Feiertag · öffnet ${short}`,
    sentenceOpen: ({ name, time }) => `${name}: geöffnet bis ${time}.`,
    sentenceClosed: ({ name, when }) => `${name}: geschlossen, öffnet ${when}.`,
    sentenceHoliday: ({ name, when }) => `${name}: Feiertag, geschlossen, öffnet ${when}.`,
    sentenceHolidayAssumed: ({ name, when }) =>
      `${name}: Feiertag, vermutlich geschlossen (die Quelle sagt nichts), öffnet ${when}.`,
    sentenceNoNext: ({ name }) => `${name}: geschlossen, keine Öffnung in den nächsten 14 Tagen.`,
    sentenceUnknown: ({ name }) => `${name}: Öffnungszeiten unbekannt.`,
    pickSite:
      'Füge einen Wertstoffhof im Tab „Entdecken“ der Integration hinzu und wähle ihn hier.',
    gone: 'Dieser Wertstoffhof wird nicht mehr verfolgt.',
    noSite: 'Kein Wertstoffhof wird verfolgt: füge einen im Tab „Entdecken“ der Integration hinzu.',
  },
  es: {
    closedToday: 'Cerrado hoy',
    holidayClosed: 'Festivo: cerrado',
    holidayAssumed: 'Festivo: cerrado en principio',
    holiday: 'festivo',
    holidayOpen: 'festivo, abierto en principio',
    noHours: 'Horario ilegible',
    noNext: 'ninguna en los próximos 14 días',
    unknown: 'desconocida',
    closedNow: 'Cerrado',
    wasteUnknown: 'Consulte al gestor',
    today: ({ time }) => `hoy a las ${time}`,
    tomorrow: ({ time }) => `mañana a las ${time}`,
    weekday: ({ day, time }) => `el ${day} a las ${time}`,
    date: ({ date, time }) => `el ${date} a las ${time}`,
    open: 'abierto',
    closed: 'cerrado',
    openUntil: ({ time }) => `abierto hasta las ${time}`,
    closesIn: ({ minutes }) => `cierra en ${minutes} min`,
    opensAt: ({ short }) => `cerrado · abre ${short}`,
    holidayRow: ({ short }) => `festivo · abre ${short}`,
    sentenceOpen: ({ name, time }) => `${name}: abierto hasta las ${time}.`,
    sentenceClosed: ({ name, when }) => `${name}: cerrado, abre ${when}.`,
    sentenceHoliday: ({ name, when }) => `${name}: festivo, cerrado, abre ${when}.`,
    sentenceHolidayAssumed: ({ name, when }) =>
      `${name}: festivo, cerrado en principio (la fuente no lo indica), abre ${when}.`,
    sentenceNoNext: ({ name }) => `${name}: cerrado, ninguna apertura en los próximos 14 días.`,
    sentenceUnknown: ({ name }) => `${name}: horario desconocido.`,
    pickSite:
      'Añada un punto limpio en la pestaña Descubrir de la integración y luego elíjalo aquí.',
    gone: 'Este punto limpio ya no se sigue.',
    noSite: 'No se sigue ningún punto limpio: añada uno en la pestaña Descubrir de la integración.',
  },
};

// Answer of the "Status" configuration action.
export const REPORTS = {
  en: {
    noArea: 'No area ticked and no located house: tick an area above, then save.',
    house: ({ count, km }) =>
      `Around the house: the ${count} nearest recycling centre${count === 1 ? '' : 's'} within ${km} km.`,
    noHouse: 'The house has no location in Gladys: the nearest sites cannot be offered.',
    area: ({ name, count }) =>
      `■ ${name}: ${count} recycling centre${count === 1 ? '' : 's'} with hours`,
    areaError: ({ name, error }) => `■ ${name}: unavailable (${error})`,
    offered: ({ count }) =>
      `${count} recycling centre${count === 1 ? '' : 's'} in the Discover tab.`,
    read: ({ age }) => `Data read ${age} min ago.`,
    waiting: 'Data not read yet.',
    watched: ({ count }) => `${count} recycling centre${count === 1 ? '' : 's'} added to Gladys.`,
  },
  fr: {
    noArea:
      'Aucune métropole cochée et maison non localisée : cochez une métropole ci-dessus, puis enregistrez.',
    house: ({ count, km }) =>
      `Autour de la maison : ${count === 1 ? 'la déchèterie la plus proche' : `les ${count} déchèteries les plus proches`} à moins de ${km} km.`,
    noHouse:
      "La maison n'est pas localisée dans Gladys : les déchèteries les plus proches ne peuvent pas être proposées.",
    area: ({ name, count }) =>
      `■ ${name} : ${count} déchèterie${count > 1 ? 's' : ''} avec horaires`,
    areaError: ({ name, error }) => `■ ${name} : indisponible (${error})`,
    offered: ({ count }) => `${count} déchèterie${count > 1 ? 's' : ''} dans l'onglet Découverte.`,
    read: ({ age }) => `Données lues il y a ${age} min.`,
    waiting: 'Données pas encore lues.',
    watched: ({ count }) =>
      `${count} déchèterie${count > 1 ? 's' : ''} ajoutée${count > 1 ? 's' : ''} à Gladys.`,
  },
  de: {
    noArea:
      'Kein Gebiet angekreuzt und Haus ohne Standort: kreuze oben ein Gebiet an und speichere.',
    house: ({ count, km }) =>
      `Rund ums Haus: ${count === 1 ? 'der nächste Wertstoffhof' : `die ${count} nächsten Wertstoffhöfe`} im Umkreis von ${km} km.`,
    noHouse:
      'Das Haus hat in Gladys keinen Standort: die nächsten Wertstoffhöfe können nicht angeboten werden.',
    area: ({ name, count }) =>
      `■ ${name}: ${count} ${count === 1 ? 'Wertstoffhof' : 'Wertstoffhöfe'} mit Öffnungszeiten`,
    areaError: ({ name, error }) => `■ ${name}: nicht verfügbar (${error})`,
    offered: ({ count }) =>
      `${count} ${count === 1 ? 'Wertstoffhof' : 'Wertstoffhöfe'} im Tab „Entdecken“.`,
    read: ({ age }) => `Daten vor ${age} Min. gelesen.`,
    waiting: 'Daten noch nicht gelesen.',
    watched: ({ count }) =>
      `${count} ${count === 1 ? 'Wertstoffhof' : 'Wertstoffhöfe'} zu Gladys hinzugefügt.`,
  },
  es: {
    noArea: 'Ninguna área marcada y casa sin ubicación: marque un área arriba y luego guarde.',
    house: ({ count, km }) =>
      `Alrededor de la casa: ${count === 1 ? 'el punto limpio más cercano' : `los ${count} puntos limpios más cercanos`} a menos de ${km} km.`,
    noHouse:
      'La casa no tiene ubicación en Gladys: no se pueden proponer los puntos limpios más cercanos.',
    area: ({ name, count }) =>
      `■ ${name}: ${count} punto${count === 1 ? '' : 's'} limpio${count === 1 ? '' : 's'} con horario`,
    areaError: ({ name, error }) => `■ ${name}: no disponible (${error})`,
    offered: ({ count }) =>
      `${count} punto${count === 1 ? '' : 's'} limpio${count === 1 ? '' : 's'} en la pestaña Descubrir.`,
    read: ({ age }) => `Datos leídos hace ${age} min.`,
    waiting: 'Datos aún no leídos.',
    watched: ({ count }) =>
      `${count} punto${count === 1 ? '' : 's'} limpio${count === 1 ? '' : 's'} añadido${count === 1 ? '' : 's'} a Gladys.`,
  },
};

/** One text of a table, in a language (English when missing). */
export function say(table, language, key, params = {}) {
  const entry = table[language]?.[key] ?? table.en[key];
  return typeof entry === 'function' ? entry(params) : entry;
}

/** The same text in every language of the table: `{ en, fr, de, es }`. */
export function render(table, key, params = {}) {
  return Object.fromEntries(
    Object.keys(table).map((language) => [language, say(table, language, key, params)]),
  );
}

/** Joins rendered messages (or plain strings), language by language, one per line. */
export function lines(...messages) {
  const languages = Object.keys(messages.find((m) => typeof m === 'object' && m) ?? { en: '' });
  return Object.fromEntries(
    languages.map((language) => [
      language,
      messages
        .filter((message) => message !== null && message !== undefined)
        .map((message) => (typeof message === 'string' ? message : message[language]))
        .join('\n'),
    ]),
  );
}
