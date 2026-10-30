# Gladys Déchèteries

External integration for [Gladys Assistant](https://gladysassistant.com): the
**recycling centres (déchèteries) of French metropolitan areas**, from their
open data: open now, closing time, next opening, today's hours, and the
accepted waste where the area publishes it. **No account, no key.**

Hours are the ones the areas publish: check with the operator before a long
trip. Unofficial: not affiliated with the metropolitan areas nor with the
operators of the sites. Developed without visiting the sites and tested against
the real answers of the sources (2026-10-30), not yet on many Gladys
installations: feedback welcome.

User documentation: [English](docs/en.md) · [français](docs/fr.md) ·
[Deutsch](docs/de.md) · [español](docs/es.md).

## What you get in Gladys

- One read-only device per site you add: open now, today's hours, closing time,
  next opening; in Bordeaux, the accepted waste (text, and green waste, rubble,
  wood, electrical appliances, bulky waste as yes/no features).
- The sites of the areas you tick, or the nearest ones to the house.
- A dashboard widget: one row per site, open until when or next opening.
- Scene triggers: a site opens, closes soon (30 minutes by default), closes.
- A scene action, "Is the recycling centre open?": your sites in a sentence.

## Requirements

- Gladys Assistant 5.3.0 or later, with Internet access.
- For the nearest sites: the location of the house set in Gladys.

## Installation

In Gladys, **Integrations → Install from GitHub**, then paste
`https://github.com/guim31/gladys-decheteries`. Tick your metropolitan area (or
keep the nearest sites to the house), save, and add your sites from the
Discover tab.

## How it works

| Area       | Source (Opendatasoft v2.1, no key)                                   | Hours format             |
| ---------- | -------------------------------------------------------------------- | ------------------------ |
| Strasbourg | data.strasbourg.eu, `lieux_decheteries`                              | weekly periods (JSON)    |
| Toulouse   | data.toulouse-metropole.fr, `dechetteries_tm` (Decoset)              | OpenStreetMap            |
| Bordeaux   | datahub.bordeaux-metropole.fr, `dechetteries-en-temps-reel`          | OpenStreetMap, waste     |
| Tours      | data.tours-metropole.fr, `equipements-decheteries-tours-metropole-…` | OpenStreetMap with dates |

Each area needed is read once a day (one request). Open or closed is then
computed every minute from the hours kept, in the time zone of Paris, without
any request. Public holidays are computed offline (Alsace-Moselle included).
The OpenStreetMap hours are read in the subset the sources use; anything else
makes a site's hours "unreadable", never guessed.

## Limitations

- Four areas only: Rennes (hours for 1 site in 24), Nantes (waste only) and
  Angers (calendar no longer kept up) were left aside on 2026-10-30.
- The Toulouse data (Decoset) was last updated in 2022.
- Strasbourg and Toulouse say nothing about public holidays: closed on 1 Jan,
  1 May and 25 Dec, otherwise closed unless the site opens on Sundays, and the
  texts say it is an assumption.
- The mobile recycling centres of Bordeaux publish no hours: not offered.
- Access conditions (badge, residents only) are not shown.

## Development

```bash
npm install
npm test               # node --test, no network access
npm run lint           # ESLint
npm run format:check   # Prettier, as the CI runs it
npx github:GladysAssistant/integration-store .   # store admission checks
```

See [CLAUDE.md](CLAUDE.md) for the architecture and the conventions. The test
fixtures (`test/fixtures/api`) are the real answers of the four sources,
captured on 2026-10-30.

## Credits

- Data: Eurométropole de Strasbourg, Toulouse Métropole and the Decoset
  syndicate, Bordeaux Métropole, Tours Métropole Val de Loire, under the
  Licence Ouverte 2.0 (Etalab).
- Public holidays: same rules as
  [gladys-holidays](https://github.com/guim31/gladys-holidays) (date-holidays).
- Cover pictogram: the "recycle" icon of [Lucide](https://lucide.dev) (ISC).
- Structure shared with
  [gladys-services-publics](https://github.com/guim31/gladys-services-publics).
- Built from the official
  [integration template](https://github.com/GladysAssistant/integration-template-js).

## License

[Apache 2.0](LICENSE).
